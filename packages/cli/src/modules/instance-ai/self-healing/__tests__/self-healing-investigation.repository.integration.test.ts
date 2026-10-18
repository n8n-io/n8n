import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { createWorkflow, createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { createUser } from '@test-integration/db/users';

import { SelfHealingInvestigationRepository } from '../database/self-healing-investigation.repository';
import { createConfiguration } from './support/configuration';

let investigations: SelfHealingInvestigationRepository;
let tx: TransactionRunner;
let baseline: WorkflowSuggestionBaseline;
let configurationId: number;

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
	configurationId = (await createConfiguration(project.id, user.id)).id;
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
			{ baseline, configurationId, executionId, threadId: randomUUID(), runId: randomUUID() },
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
	expect(await investigations.findOneByOrFail({ id: first.id })).toMatchObject({
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
	expect(await investigations.findInvestigation(investigation.id)).toBeNull();
});
