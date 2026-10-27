import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { createWorkflow, createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import {
	TransactionRunner,
	WorkflowRepository,
	postgresMigrations,
	sqliteMigrations,
	wrapMigration,
} from '@n8n/db';
import { DataSource, type MigrationInterface } from '@n8n/typeorm';
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

it('reverts and reapplies the investigation schemas', async () => {
	const db = Container.get(DataSource);
	[...postgresMigrations, ...sqliteMigrations].forEach(wrapMigration);
	const migrations = [
		'CreateSelfHealingInvestigationTable1792578704944',
		'CreateSelfHealingConfigurations1792742505678',
		'ReplaceSelfHealingInvestigationBaseline1792750863544',
		'AddIncludeAllProjectMembersToSelfHealingConfiguration1793106080688',
	].map((name) => {
		const migration = db.migrations.find(({ constructor }) => constructor.name === name);
		if (!migration) throw new Error(`${name} is not registered.`);
		return migration;
	});
	async function runMigration(migration: MigrationInterface, direction: 'up' | 'down') {
		// Table rebuilds can leave stale schema metadata on a reused query runner.
		const runner = db.createQueryRunner();
		try {
			await migration[direction](runner);
		} finally {
			await runner.release();
		}
	}

	const reverted: typeof migrations = [];
	try {
		for (const migration of [...migrations].reverse()) {
			await runMigration(migration, 'down');
			reverted.unshift(migration);
		}
		const runner = db.createQueryRunner();
		try {
			expect(await runner.hasTable(investigations.metadata.tablePath)).toBe(false);
		} finally {
			await runner.release();
		}
	} finally {
		for (const migration of reverted) await runMigration(migration, 'up');
	}
	configurationId = (await createConfiguration(baseline.projectId, baseline.backgroundUserId)).id;
	const investigation = await createInvestigation();
	expect(await investigations.findInvestigation(investigation.id)).toMatchObject({
		publishedVersionId: baseline.expectedBaseline.publishedVersionId,
		resultId: null,
		finishedAt: null,
	});
});
