import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { createWorkflow, createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import {
	TransactionRunner,
	WorkflowRepository,
	postgresMigrations,
	sqliteMigrations,
	wrapMigration,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { createUser } from '@test-integration/db/users';

import { SelfHealingInvestigationRepository } from '../database/self-healing-investigation.repository';

let investigations: SelfHealingInvestigationRepository;
let tx: TransactionRunner;
let baseline: WorkflowSuggestionBaseline;

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	investigations = Container.get(SelfHealingInvestigationRepository);
	tx = Container.get(TransactionRunner);
});

beforeEach(async () => {
	const user = await createUser();
	const project = await createTeamProject();
	const workflow = await createWorkflow({}, project);
	baseline = {
		workflowId: workflow.id,
		projectId: project.id,
		backgroundUserId: user.id,
		expectedBaseline: {
			savedVersionId: workflow.versionId,
			publishedVersionId: workflow.versionId,
			checksum: 'a'.repeat(64),
			versionCounter: workflow.versionCounter,
			latestPublishHistoryEventId: null,
		},
		original: { name: workflow.name, nodes: workflow.nodes, connections: workflow.connections },
	};
});

afterEach(async () => {
	await investigations.createQueryBuilder().delete().execute();
});

afterAll(async () => await testDb.terminate());

async function createInvestigation(executionId = 'execution-1') {
	return await tx.run({}, async (ctx) => {
		return await investigations.createInvestigation(
			{ baseline, executionId, threadId: randomUUID(), runId: randomUUID() },
			ctx,
		);
	});
}

it('allows one concurrent investigation claim per workflow', async () => {
	const outcomes = await Promise.allSettled([
		createInvestigation('execution-1'),
		createInvestigation('execution-2'),
	]);
	expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
	expect(await investigations.count()).toBe(1);
	expect(await investigations.getUnfinishedForWorkflow(baseline.workflowId)).not.toBeNull();
});

it('releases technical failures while retaining the original execution identity', async () => {
	const first = await createInvestigation();
	await investigations.finishWithoutResult(first.id);
	expect(await investigations.getUnfinishedForWorkflow(baseline.workflowId)).toBeNull();
	expect(await investigations.getForExecution(baseline.workflowId, first.executionId)).toEqual({
		id: first.id,
	});
	expect(await investigations.get(first.id)).toMatchObject({
		resultId: null,
		finishedAt: expect.any(Date),
	});
	await expect(createInvestigation()).rejects.toThrow();
	const next = await createInvestigation('execution-2');
	expect(next.id).not.toBe(first.id);
});

it('removes investigations when their workflow is deleted', async () => {
	const investigation = await createInvestigation();
	await Container.get(WorkflowRepository).delete(baseline.workflowId);
	await expect(investigations.get(investigation.id)).rejects.toThrow('not found');
});

it('reverts and reapplies the investigation schema', async () => {
	const db = Container.get(DataSource);
	[...postgresMigrations, ...sqliteMigrations].forEach(wrapMigration);
	const migration = db.migrations.find(
		({ constructor }) => constructor.name === 'CreateSelfHealingInvestigationTable1792578704944',
	);
	if (!migration) throw new Error('The investigation migration is not registered.');
	const runner = db.createQueryRunner();
	try {
		await migration.down(runner);
		try {
			expect(await runner.hasTable(investigations.metadata.tablePath)).toBe(false);
		} finally {
			await migration.up(runner);
		}
		expect(await runner.hasTable(investigations.metadata.tablePath)).toBe(true);
	} finally {
		await runner.release();
	}
	const investigation = await createInvestigation();
	expect(await investigations.get(investigation.id)).toMatchObject({
		baseline,
		resultId: null,
		finishedAt: null,
	});
});
