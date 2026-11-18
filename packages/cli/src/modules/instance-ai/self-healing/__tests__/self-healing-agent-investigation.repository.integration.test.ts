import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { createUser } from '@test-integration/db/users';

import { SelfHealingAgentInvestigation } from '../agents/database/self-healing-agent-investigation.entity';
import {
	SelfHealingAgentInvestigationRepository,
	type CreateSelfHealingAgentInvestigation,
} from '../agents/database/self-healing-agent-investigation.repository';
import { SelfHealingAgentResult } from '../agents/database/self-healing-agent-result.entity';
import { SelfHealingAgentResultRepository } from '../agents/database/self-healing-agent-result.repository';
import { createAgentRow, deleteAgentRow } from './support/agent';
import { createConfiguration } from './support/configuration';

const usage = { credits: 1, turns: 2, durationSeconds: 30 };

let investigations: SelfHealingAgentInvestigationRepository;
let results: SelfHealingAgentResultRepository;
let tx: TransactionRunner;
let db: DataSource;
let scope: Pick<
	CreateSelfHealingAgentInvestigation,
	'configurationId' | 'projectId' | 'agentId' | 'backgroundUserId'
>;

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	investigations = Container.get(SelfHealingAgentInvestigationRepository);
	results = Container.get(SelfHealingAgentResultRepository);
	tx = Container.get(TransactionRunner);
	db = Container.get(DataSource);
});

beforeEach(async () => {
	const user = await createUser();
	const project = await createTeamProject();
	scope = {
		configurationId: (await createConfiguration(project.id, user.id)).id,
		projectId: project.id,
		agentId: await createAgentRow(project.id),
		backgroundUserId: user.id,
	};
});

afterEach(async () => {
	await db.createQueryBuilder().delete().from(SelfHealingAgentInvestigation).execute();
	await db.createQueryBuilder().delete().from(SelfHealingAgentResult).execute();
});

afterAll(async () => await testDb.terminate());

async function createInvestigation(traceWindowEnd = new Date()) {
	return await tx.run({}, async (ctx) => {
		return await investigations.createInvestigation(
			{
				...scope,
				trigger: 'schedule',
				agentVersionId: 'version-1',
				traceWindowStart: null,
				traceWindowEnd,
				traceCount: 3,
				threadId: randomUUID(),
				runId: randomUUID(),
			},
			ctx,
		);
	});
}

async function createResult() {
	return await results.createResult(
		{
			...scope,
			agentName: 'Support agent',
			baseVersionId: 'version-1',
			goals: ['quality'],
			trigger: 'schedule',
			traceWindowStart: null,
			traceWindowEnd: new Date(),
			traceCount: 3,
			summary: 'Use the order lookup tool.',
			report: 'The agent called the wrong lookup tool.',
			edits: [],
			evalCases: [],
			evidence: null,
			usage,
		},
		{},
	);
}

it('allows one concurrent investigation claim for each agent', async () => {
	const outcomes = await Promise.allSettled([createInvestigation(), createInvestigation()]);
	const claimed = outcomes.flatMap((outcome) =>
		outcome.status === 'fulfilled' ? [outcome.value] : [],
	);
	expect(claimed).toHaveLength(1);
	expect(await investigations.getUnfinishedForAgent(scope.agentId)).toEqual({ id: claimed[0].id });
	expect(await investigations.listUnfinished()).toHaveLength(1);
	expect(await investigations.findUnfinishedThreadIds(scope.configurationId, {})).toEqual([
		claimed[0].threadId,
	]);

	// A second agent of the same project has its own claim.
	scope = { ...scope, agentId: await createAgentRow(scope.projectId, 'Billing agent') };
	await createInvestigation();
	expect(await investigations.listUnfinished()).toHaveLength(2);
});

it('finishes an investigation one time and releases the agent claim', async () => {
	const first = await createInvestigation();
	const finish = { outcome: 'failed', failureReason: 'not_started', usage: null } as const;
	expect(await investigations.finish(first.id, finish)).toBe(true);
	// A repeat changes nothing.
	expect(
		await investigations.finish(first.id, { outcome: 'no_change', failureReason: null, usage }),
	).toBe(false);
	expect(await investigations.findInvestigation(first.id)).toMatchObject({
		outcome: 'failed',
		failureReason: 'not_started',
		usage: null,
		resultId: null,
		finishedAt: expect.any(Date),
	});
	expect(await investigations.getUnfinishedForAgent(scope.agentId)).toBeNull();
	expect(await investigations.findUnfinishedThreadIds(scope.configurationId, {})).toEqual([]);

	const next = await createInvestigation();
	expect(next.id).not.toBe(first.id);
});

it('completes an investigation with its proposal one time', async () => {
	const investigation = await createInvestigation();
	const result = await createResult();
	await investigations.completeWithResult(investigation.id, result.id, usage, {});
	expect(await investigations.findInvestigation(investigation.id)).toMatchObject({
		outcome: 'proposal',
		failureReason: null,
		usage,
		resultId: result.id,
		finishedAt: expect.any(Date),
	});
	await expect(
		investigations.completeWithResult(investigation.id, result.id, usage, {}),
	).rejects.toThrow(ConflictError);
});

it('rolls back the proposal when the investigation has already finished', async () => {
	const investigation = await createInvestigation();
	await investigations.finish(investigation.id, {
		outcome: 'failed',
		failureReason: 'crash_interrupted',
		usage: null,
	});
	await expect(
		tx.run({}, async (ctx) => {
			const result = await results.createResult(
				{
					...scope,
					agentName: 'Support agent',
					baseVersionId: 'version-1',
					goals: ['quality'],
					trigger: 'schedule',
					traceWindowStart: null,
					traceWindowEnd: new Date(),
					traceCount: 0,
					summary: 'Summary',
					report: 'Report',
					edits: [],
					evalCases: [],
					evidence: null,
					usage,
				},
				ctx,
			);
			await investigations.completeWithResult(investigation.id, result.id, usage, ctx);
		}),
	).rejects.toThrow(ConflictError);
	expect(await results.getOpenForAgent(scope.agentId)).toBeNull();
});

it('reads the last used trace window and the last failure of an agent', async () => {
	expect(await investigations.getLastConsumingWindowEnd(scope.agentId)).toBeNull();
	expect(await investigations.getLastFailedAt(scope.agentId)).toBeNull();

	const usedEnd = new Date('2026-01-02T00:00:00.000Z');
	for (const [windowEnd, outcome] of [
		[new Date('2026-01-01T00:00:00.000Z'), 'no_change'],
		[usedEnd, 'no_change'],
		// A failed investigation does not use its trace window.
		[new Date('2026-01-03T00:00:00.000Z'), 'failed'],
	] as const) {
		const investigation = await createInvestigation(windowEnd);
		await investigations.finish(investigation.id, { outcome, failureReason: null, usage });
	}
	// An unfinished investigation has not used its window yet.
	const running = await createInvestigation(new Date('2026-01-04T00:00:00.000Z'));

	expect(await investigations.getLastConsumingWindowEnd(scope.agentId)).toEqual(usedEnd);
	expect(await investigations.getLastConsuming(scope.agentId)).toEqual({
		agentVersionId: 'version-1',
		traceWindowEnd: usedEnd,
	});
	expect(await investigations.getLastFailedAt(scope.agentId)).toEqual(expect.any(Date));

	const result = await createResult();
	await investigations.completeWithResult(running.id, result.id, usage, {});
	expect(await investigations.getLastConsumingWindowEnd(scope.agentId)).toEqual(
		new Date('2026-01-04T00:00:00.000Z'),
	);
});

it('keeps a finished investigation when its proposal is deleted', async () => {
	const investigation = await createInvestigation();
	const result = await createResult();
	await investigations.completeWithResult(investigation.id, result.id, usage, {});
	await db.createQueryBuilder().delete().from(SelfHealingAgentResult).execute();
	expect(await investigations.findInvestigation(investigation.id)).toMatchObject({
		outcome: 'proposal',
		resultId: null,
	});
});

it('removes investigations when their agent is deleted', async () => {
	const investigation = await createInvestigation();
	await deleteAgentRow(scope.agentId);
	expect(await investigations.findInvestigation(investigation.id)).toBeNull();
});
