import type { WorkflowSuggestionBaseline, WorkflowSuggestionContent } from '@n8n/api-types';
import { createWorkflow, createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import {
	type Project,
	ProjectRepository,
	TransactionRunner,
	type User,
	UserRepository,
	type WorkflowEntity,
	WorkflowRepository,
	WorkflowHistoryRepository,
	wrapMigration,
	postgresMigrations,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { randomUUID } from 'node:crypto';

import { createUser } from '@test-integration/db/users';

import { WorkflowSuggestionActivityEntity } from '../database/workflow-suggestion-activity.entity';
import { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';

let suggestions: WorkflowSuggestionRepository;
let tx: TransactionRunner;
let workflow: WorkflowEntity;
let project: Project;
let backgroundUser: User;
const baseline = (): WorkflowSuggestionBaseline => ({
	workflowId: workflow.id,
	projectId: project.id,
	backgroundUserId: backgroundUser.id,
	expectedBaseline: {
		savedVersionId: randomUUID(),
		publishedVersionId: randomUUID(),
		checksum: 'a'.repeat(64),
	},
	original: { name: 'Example', nodes: [], connections: {} },
});
const payload = (): WorkflowSuggestionContent => ({
	original: baseline().original,
	candidate: { nodes: [], connections: {} },
	explanation: 'Fix the workflow.',
	validation: {
		requiredChecks: 'passed',
		configuration: { status: 'not_run' },
		execution: { status: 'not_run' },
	},
	errorContext: null,
});
const saveProposal = async () =>
	await tx.run({}, async (ctx) => {
		const suggestion = await suggestions.createPending(baseline(), payload(), ctx);
		await suggestions.appendSubmittedActivity(suggestion.id, ctx);
		return suggestion;
	});

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	suggestions = Container.get(WorkflowSuggestionRepository);
	tx = Container.get(TransactionRunner);
});
beforeEach(async () => {
	backgroundUser = await createUser();
	project = await createTeamProject();
	workflow = await createWorkflow({}, project);
});
afterAll(async () => await testDb.terminate());
afterEach(async () => {
	await Container.get(DataSource).getRepository(WorkflowSuggestionActivityEntity).clear();
	await suggestions.createQueryBuilder().delete().execute();
});

it('accepts only one concurrent pending proposal for a workflow', async () => {
	const results = await Promise.allSettled([saveProposal(), saveProposal()]);
	expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
	expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
	expect(await suggestions.count()).toBe(1);
	const [suggestion] = await suggestions.find();
	expect(suggestion.state).toBe('pending');
	expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);
	await expect(saveProposal()).rejects.toThrow('pending proposal');
});

it('allows a new proposal after the previous proposal closes', async () => {
	const first = await saveProposal();
	await suggestions.update(first.id, {
		state: 'closed',
		closedReason: 'discarded',
		closedAt: new Date(),
	});
	const second = await saveProposal();
	expect(second.id).not.toBe(first.id);
	expect(await suggestions.count()).toBe(2);
});

it('rolls back the suggestion and its activity when activity insertion fails', async () => {
	await expect(
		tx.run({}, async (ctx) => {
			const suggestion = await suggestions.createPending(baseline(), payload(), ctx);
			await suggestions.appendSubmittedActivity(suggestion.id, ctx);
			await suggestions.appendSubmittedActivity(suggestion.id, ctx);
		}),
	).rejects.toThrow();
	expect(await suggestions.count()).toBe(0);
	expect(
		await Container.get(DataSource).getRepository(WorkflowSuggestionActivityEntity).count(),
	).toBe(0);
});

it('joins the caller transaction and rolls back both rows if finalization fails', async () => {
	await expect(
		tx.run({}, async (ctx) => {
			await tx.run(ctx, async (ctx) => {
				const suggestion = await suggestions.createPending(baseline(), payload(), ctx);
				await suggestions.appendSubmittedActivity(suggestion.id, ctx);
			});
			throw new Error('Investigation completion failed.');
		}),
	).rejects.toThrow('Investigation completion failed.');
	expect(await suggestions.count()).toBe(0);
	expect(
		await Container.get(DataSource).getRepository(WorkflowSuggestionActivityEntity).count(),
	).toBe(0);
});

it('deletes closed proposals and their activity in bounded batches and keeps pending proposals', async () => {
	const old = new Date('2026-01-01T00:00:00Z');
	const now = new Date('2026-03-01T00:00:00Z');
	const first = await saveProposal();
	await suggestions.update(first.id, {
		state: 'closed',
		closedReason: 'discarded',
		closedAt: old,
	});
	const second = await saveProposal();
	await suggestions.update(second.id, {
		state: 'closed',
		closedReason: 'applied',
		closedAt: new Date('2026-01-02T00:00:00Z'),
	});
	const pending = await saveProposal();
	await suggestions.update(pending.id, { updatedAt: old });

	await suggestions.cleanup(now, 1);
	expect(await suggestions.findOneBy({ id: first.id })).toBeNull();
	expect(await suggestions.getActivity(first.id)).toHaveLength(0);
	expect(await suggestions.count()).toBe(2);
	await suggestions.cleanup(now);
	expect(await suggestions.findOneBy({ id: second.id })).toBeNull();
	expect(await suggestions.getActivity(second.id)).toHaveLength(0);
	expect((await suggestions.getSuggestion(pending.id)).payload).toEqual(payload());
	expect(await suggestions.getActivity(pending.id)).toHaveLength(1);
	expect(await suggestions.count()).toBe(1);
});

it('keeps proposals and activity through the full closed retention period', async () => {
	const now = new Date('2026-03-01T00:00:00Z');
	const closed = await saveProposal();
	await suggestions.update(closed.id, {
		state: 'closed',
		closedReason: 'outdated',
		closedAt: new Date(now.getTime() - 30 * 86400_000),
	});
	await suggestions.cleanup(now);
	expect((await suggestions.getSuggestion(closed.id)).payload).toEqual(payload());
	expect(await suggestions.getActivity(closed.id)).toHaveLength(1);
});

it.each([
	{
		parent: 'workflow',
		remove: async () => await Container.get(WorkflowRepository).delete(workflow.id),
	},
	{
		parent: 'project',
		remove: async () => await Container.get(ProjectRepository).delete(project.id),
	},
	{
		parent: 'background user',
		remove: async () => await Container.get(UserRepository).delete(backgroundUser.id),
	},
])(
	'deletes the suggestion and activity with its $parent and rejects a late save',
	async ({ remove }) => {
		const originalBaseline = baseline();
		const suggestion = await saveProposal();
		expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);

		await remove();

		expect(await suggestions.findOneBy({ id: suggestion.id })).toBeNull();
		expect(await suggestions.getActivity(suggestion.id)).toHaveLength(0);
		await expect(
			tx.run({}, async (ctx) => await suggestions.createPending(originalBaseline, payload(), ctx)),
		).rejects.toThrow(/foreign key/i);
		expect(await suggestions.count()).toBe(0);
	},
);

it('leaves workflow and history unchanged and reads current saves at the guarded boundary', async () => {
	const workflows = Container.get(WorkflowRepository);
	const histories = Container.get(WorkflowHistoryRepository);
	const before = await workflows.findOneByOrFail({ id: workflow.id });
	const historyCount = await histories.count();
	await tx.run({}, async (ctx) => {
		const target = await suggestions.readWorkflowTarget(workflow.id, ctx);
		expect(target.workflow?.versionId).toBe(before.versionId);
		const suggestion = await suggestions.createPending(baseline(), payload(), ctx);
		await suggestions.appendSubmittedActivity(suggestion.id, ctx);
	});
	expect(await workflows.findOneByOrFail({ id: workflow.id })).toEqual(before);
	expect(await histories.count()).toBe(historyCount);
	await workflows.update(workflow.id, { settings: { executionTimeout: 45 } });
	await tx.run({}, async (ctx) => {
		const target = await suggestions.readWorkflowTarget(workflow.id, ctx);
		expect(target.workflow?.settings).toEqual({ executionTimeout: 45 });
	});
});

it('holds a concurrent workflow save until the suggestion transaction commits', async () => {
	const locked = createDeferredPromise<boolean>();
	const release = createDeferredPromise<boolean>();
	const submission = tx.run({}, async (ctx) => {
		await suggestions.readWorkflowTarget(workflow.id, ctx);
		locked.resolve(true);
		await release.promise;
		return await suggestions.createPending(baseline(), payload(), ctx);
	});
	await locked.promise;
	let saved = false;
	const save = Container.get(WorkflowRepository)
		.update(workflow.id, { settings: { executionTimeout: 60 } })
		.then(() => {
			saved = true;
		});
	try {
		// Give the second connection time to attempt its write while the first holds the row.
		await new Promise((resolve) => setTimeout(resolve, 40));
		expect(saved).toBe(false);
	} finally {
		release.resolve(true);
		await submission;
		await save;
	}
	expect(saved).toBe(true);
	expect((await submission).state).toBe('pending');
});

it('reverts and reapplies the suggestion schema', async () => {
	const db = Container.get(DataSource);
	// Template databases skip migrate(), which normally installs the DSL wrappers.
	postgresMigrations.forEach(wrapMigration);
	await db.undoLastMigration();
	const runner = db.createQueryRunner();
	try {
		const table = db.getMetadata(WorkflowSuggestionActivityEntity).tablePath;
		expect(await runner.hasTable(table)).toBe(false);
	} finally {
		await runner.release();
		await db.runMigrations();
	}
	expect(await suggestions.count()).toBe(0);
});
