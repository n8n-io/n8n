import type { WorkflowSuggestionContent, WorkflowSuggestionSource } from '@n8n/api-types';
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
const source = (): WorkflowSuggestionSource => ({
	sourceKey: randomUUID(),
	workflowId: workflow.id,
	backgroundUserId: backgroundUser.id,
	expectedBaseline: {
		savedVersionId: randomUUID(),
		publishedVersionId: randomUUID(),
		checksum: 'a'.repeat(64),
	},
});
const payload = (): WorkflowSuggestionContent => ({
	original: { name: 'Example', nodes: [], connections: {} },
	candidate: { nodes: [], connections: {} },
	explanation: '',
	validation: null,
	errorContext: null,
});

beforeAll(async () => {
	await testModules.loadModules(['workflow-suggestions']);
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

it('resolves simultaneous creation to one source identity', async () => {
	const identity = source();
	const results = await Promise.all([
		suggestions.createOnce(identity, project.id, payload()),
		suggestions.createOnce(identity, project.id, payload()),
	]);
	expect(results[0].id).toBe(results[1].id);
	expect(await suggestions.count()).toBe(1);
	const otherUser = await createUser();
	await expect(
		suggestions.createOnce({ ...identity, backgroundUserId: otherUser.id }, project.id, payload()),
	).rejects.toThrow('source');
});

it('accepts only one concurrent revision', async () => {
	const suggestion = await suggestions.createOnce(source(), project.id, payload());
	const results = await Promise.allSettled([
		suggestions.reviseIfCurrent(suggestion.id, 1, { ...payload(), explanation: 'first' }),
		suggestions.reviseIfCurrent(suggestion.id, 1, { ...payload(), explanation: 'second' }),
	]);
	expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
	expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
	expect((await suggestions.getSuggestion(suggestion.id)).revision).toBe(2);
});

it('keeps submission and activity atomic and enforces one pending proposal', async () => {
	const first = await suggestions.createOnce(source(), project.id, payload());
	const second = await suggestions.createOnce(source(), project.id, payload());
	await tx.run({}, async (ctx) => {
		await suggestions.markPendingIfCurrent(first.id, 1, ctx);
		await suggestions.appendSubmittedActivity(first.id, 1, ctx);
	});
	await expect(
		tx.run({}, async (ctx) => await suggestions.markPendingIfCurrent(second.id, 1, ctx)),
	).rejects.toThrow('pending proposal');
	expect((await suggestions.getSuggestion(second.id)).state).toBe('preparing');
	expect(await suggestions.getActivity(first.id)).toHaveLength(1);
	await expect(
		tx.run({}, async (ctx) => {
			await suggestions.appendSubmittedActivity(first.id, 1, ctx);
		}),
	).rejects.toThrow();
	expect(await suggestions.getActivity(first.id)).toHaveLength(1);
});

it('rolls back a state transition if its activity fails', async () => {
	const suggestion = await suggestions.createOnce(source(), project.id, payload());
	await expect(
		tx.run({}, async (ctx) => {
			await suggestions.markPendingIfCurrent(suggestion.id, 1, ctx);
			throw new Error('activity unavailable');
		}),
	).rejects.toThrow('activity unavailable');
	expect((await suggestions.getSuggestion(suggestion.id)).state).toBe('preparing');
});

it('retains pending content and receipts while expiring old payloads in bounded batches', async () => {
	const old = new Date('2026-01-01T00:00:00Z');
	const now = new Date('2026-03-01T00:00:00Z');
	const preparing = await suggestions.createOnce(source(), project.id, payload());
	const pending = await suggestions.createOnce(source(), project.id, payload());
	const closed = await suggestions.createOnce(source(), project.id, payload());
	await suggestions.update(preparing.id, { updatedAt: old });
	await suggestions.update(pending.id, { state: 'pending', submittedRevision: 1, updatedAt: old });
	await suggestions.update(closed.id, {
		state: 'closed',
		closedReason: 'discarded',
		submittedRevision: 1,
		closedAt: old,
		updatedAt: old,
	});
	await suggestions.cleanup(now, 1);
	expect((await suggestions.find()).filter((d) => d.payload === null)).toHaveLength(1);
	await suggestions.cleanup(now);
	expect(await suggestions.getSuggestion(preparing.id)).toMatchObject({
		state: 'closed',
		closedReason: 'abandoned',
		payload: null,
	});
	expect(await suggestions.getSuggestion(closed.id)).toMatchObject({
		submittedRevision: 1,
		closedReason: 'discarded',
		payload: null,
	});
	expect((await suggestions.getSuggestion(pending.id)).payload).not.toBeNull();
	const retry = await suggestions.createOnce(
		{
			sourceKey: closed.sourceKey,
			workflowId: closed.workflowId,
			backgroundUserId: closed.backgroundUserId,
			expectedBaseline: closed.expectedBaseline,
		},
		project.id,
		payload(),
	);
	expect(retry.id).toBe(closed.id);
	expect(retry.payload).toBeNull();
});

it('keeps recent activity and recently closed content', async () => {
	const now = new Date();
	const preparing = await suggestions.createOnce(source(), project.id, payload());
	const closed = await suggestions.createOnce(source(), project.id, payload());
	await suggestions.update(closed.id, { state: 'closed', closedReason: 'outdated', closedAt: now });
	await suggestions.cleanup(now);
	expect((await suggestions.getSuggestion(preparing.id)).payload).not.toBeNull();
	expect((await suggestions.getSuggestion(closed.id)).payload).not.toBeNull();
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
		const identity = source();
		const suggestion = await suggestions.createOnce(identity, project.id, payload());
		await tx.run({}, async (ctx) => {
			await suggestions.markPendingIfCurrent(suggestion.id, 1, ctx);
			await suggestions.appendSubmittedActivity(suggestion.id, 1, ctx);
		});
		expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);

		await remove();

		expect(await suggestions.findBySourceKey(identity.sourceKey)).toBeNull();
		expect(await suggestions.getActivity(suggestion.id)).toHaveLength(0);
		await expect(suggestions.createOnce(identity, project.id, payload())).rejects.toThrow(
			/foreign key/i,
		);
		expect(await suggestions.count()).toBe(0);
	},
);

it('leaves workflow and history unchanged and reads current saves at the guarded boundary', async () => {
	const workflows = Container.get(WorkflowRepository);
	const histories = Container.get(WorkflowHistoryRepository);
	const before = await workflows.findOneByOrFail({ id: workflow.id });
	const historyCount = await histories.count();
	const identity = { ...source(), workflowId: workflow.id };
	const suggestion = await suggestions.createOnce(identity, project.id, payload());
	await suggestions.reviseIfCurrent(suggestion.id, 1, { ...payload(), explanation: 'Fix' });
	await tx.run({}, async (ctx) => {
		const target = await suggestions.loadForSubmission(suggestion.id, workflow.id, ctx);
		expect(target.workflow?.versionId).toBe(before.versionId);
		await suggestions.markPendingIfCurrent(suggestion.id, 2, ctx);
		await suggestions.appendSubmittedActivity(suggestion.id, 2, ctx);
	});
	expect(await workflows.findOneByOrFail({ id: workflow.id })).toEqual(before);
	expect(await histories.count()).toBe(historyCount);
	await workflows.update(workflow.id, { settings: { executionTimeout: 45 } });
	await tx.run({}, async (ctx) => {
		const target = await suggestions.loadForSubmission(suggestion.id, workflow.id, ctx);
		expect(target.workflow?.settings).toEqual({ executionTimeout: 45 });
	});
});

it('holds a concurrent workflow save until the submission boundary commits', async () => {
	const suggestion = await suggestions.createOnce(
		{ ...source(), workflowId: workflow.id },
		project.id,
		payload(),
	);
	const locked = createDeferredPromise<boolean>();
	const release = createDeferredPromise<boolean>();
	const submission = tx.run({}, async (ctx) => {
		await suggestions.loadForSubmission(suggestion.id, workflow.id, ctx);
		locked.resolve(true);
		await release.promise;
		await suggestions.markPendingIfCurrent(suggestion.id, 1, ctx);
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
	expect((await suggestions.getSuggestion(suggestion.id)).state).toBe('pending');
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
