import type { WorkflowDraftContent, WorkflowDraftSource } from '@n8n/api-types';
import { createWorkflow, createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import {
	TransactionRunner,
	WorkflowRepository,
	WorkflowHistoryRepository,
	wrapMigration,
	postgresMigrations,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { randomUUID } from 'node:crypto';

import { WorkflowDraftActivityEntity } from '../database/workflow-draft-activity.entity';
import { WorkflowDraftRepository } from '../database/workflow-draft.repository';

let drafts: WorkflowDraftRepository;
let tx: TransactionRunner;
const source = (): WorkflowDraftSource => ({
	sourceKey: randomUUID(),
	workflowId: 'workflow',
	backgroundUserId: randomUUID(),
	expectedBaseline: {
		savedVersionId: randomUUID(),
		publishedVersionId: randomUUID(),
		checksum: 'a'.repeat(64),
	},
});
const payload = (): WorkflowDraftContent => ({
	original: { name: 'Example', nodes: [], connections: {} },
	candidate: { nodes: [], connections: {} },
	explanation: '',
	validation: null,
	errorContext: null,
});

beforeAll(async () => {
	await testModules.loadModules(['workflow-drafts']);
	await testDb.init();
	drafts = Container.get(WorkflowDraftRepository);
	tx = Container.get(TransactionRunner);
});
afterAll(async () => await testDb.terminate());
afterEach(async () => {
	await Container.get(DataSource).getRepository(WorkflowDraftActivityEntity).clear();
	await drafts.createQueryBuilder().delete().execute();
});

it('resolves simultaneous creation to one source identity', async () => {
	const identity = source();
	const results = await Promise.all([
		drafts.createOnce(identity, 'project', payload()),
		drafts.createOnce(identity, 'project', payload()),
	]);
	expect(results[0].id).toBe(results[1].id);
	expect(await drafts.count()).toBe(1);
	await expect(
		drafts.createOnce({ ...identity, backgroundUserId: randomUUID() }, 'project', payload()),
	).rejects.toThrow('source');
});

it('accepts only one concurrent revision', async () => {
	const draft = await drafts.createOnce(source(), 'project', payload());
	const results = await Promise.allSettled([
		drafts.reviseIfCurrent(draft.id, 1, { ...payload(), explanation: 'first' }),
		drafts.reviseIfCurrent(draft.id, 1, { ...payload(), explanation: 'second' }),
	]);
	expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
	expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
	expect((await drafts.getDraft(draft.id)).revision).toBe(2);
});

it('keeps submission and activity atomic and enforces one pending proposal', async () => {
	const first = await drafts.createOnce(source(), 'project', payload());
	const second = await drafts.createOnce(source(), 'project', payload());
	await tx.run({}, async (ctx) => {
		await drafts.markPendingIfCurrent(first.id, 1, ctx);
		await drafts.appendSubmittedActivity(first.id, 1, ctx);
	});
	await expect(
		tx.run({}, async (ctx) => await drafts.markPendingIfCurrent(second.id, 1, ctx)),
	).rejects.toThrow('pending proposal');
	expect((await drafts.getDraft(second.id)).state).toBe('preparing');
	expect(await drafts.getActivity(first.id)).toHaveLength(1);
	await expect(
		tx.run({}, async (ctx) => {
			await drafts.appendSubmittedActivity(first.id, 1, ctx);
		}),
	).rejects.toThrow();
	expect(await drafts.getActivity(first.id)).toHaveLength(1);
});

it('rolls back a state transition if its activity fails', async () => {
	const draft = await drafts.createOnce(source(), 'project', payload());
	await expect(
		tx.run({}, async (ctx) => {
			await drafts.markPendingIfCurrent(draft.id, 1, ctx);
			throw new Error('activity unavailable');
		}),
	).rejects.toThrow('activity unavailable');
	expect((await drafts.getDraft(draft.id)).state).toBe('preparing');
});

it('retains pending content and receipts while expiring old payloads in bounded batches', async () => {
	const old = new Date('2026-01-01T00:00:00Z');
	const now = new Date('2026-03-01T00:00:00Z');
	const preparing = await drafts.createOnce(source(), 'project', payload());
	const pending = await drafts.createOnce(source(), 'project', payload());
	const closed = await drafts.createOnce(source(), 'project', payload());
	await drafts.update(preparing.id, { updatedAt: old });
	await drafts.update(pending.id, { state: 'pending', submittedRevision: 1, updatedAt: old });
	await drafts.update(closed.id, {
		state: 'closed',
		closedReason: 'discarded',
		submittedRevision: 1,
		closedAt: old,
		updatedAt: old,
	});
	await drafts.cleanup(now, 1);
	expect((await drafts.find()).filter((d) => d.payload === null)).toHaveLength(1);
	await drafts.cleanup(now);
	expect(await drafts.getDraft(preparing.id)).toMatchObject({
		state: 'closed',
		closedReason: 'abandoned',
		payload: null,
	});
	expect(await drafts.getDraft(closed.id)).toMatchObject({
		submittedRevision: 1,
		closedReason: 'discarded',
		payload: null,
	});
	expect((await drafts.getDraft(pending.id)).payload).not.toBeNull();
	const retry = await drafts.createOnce(
		{
			sourceKey: closed.sourceKey,
			workflowId: closed.workflowId,
			backgroundUserId: closed.backgroundUserId,
			expectedBaseline: closed.expectedBaseline,
		},
		'project',
		payload(),
	);
	expect(retry.id).toBe(closed.id);
	expect(retry.payload).toBeNull();
});

it('keeps recent activity and recently closed content', async () => {
	const now = new Date();
	const preparing = await drafts.createOnce(source(), 'project', payload());
	const closed = await drafts.createOnce(source(), 'project', payload());
	await drafts.update(closed.id, { state: 'closed', closedReason: 'outdated', closedAt: now });
	await drafts.cleanup(now);
	expect((await drafts.getDraft(preparing.id)).payload).not.toBeNull();
	expect((await drafts.getDraft(closed.id)).payload).not.toBeNull();
});

it('leaves workflow and history unchanged and reads current saves at the guarded boundary', async () => {
	const project = await createTeamProject();
	const workflow = await createWorkflow({}, project);
	const workflows = Container.get(WorkflowRepository);
	const histories = Container.get(WorkflowHistoryRepository);
	const before = await workflows.findOneByOrFail({ id: workflow.id });
	const historyCount = await histories.count();
	const identity = { ...source(), workflowId: workflow.id };
	const draft = await drafts.createOnce(identity, project.id, payload());
	await drafts.reviseIfCurrent(draft.id, 1, { ...payload(), explanation: 'Fix' });
	await tx.run({}, async (ctx) => {
		const target = await drafts.loadForSubmission(draft.id, workflow.id, ctx);
		expect(target.workflow?.versionId).toBe(before.versionId);
		await drafts.markPendingIfCurrent(draft.id, 2, ctx);
		await drafts.appendSubmittedActivity(draft.id, 2, ctx);
	});
	expect(await workflows.findOneByOrFail({ id: workflow.id })).toEqual(before);
	expect(await histories.count()).toBe(historyCount);
	await workflows.update(workflow.id, { settings: { executionTimeout: 45 } });
	await tx.run({}, async (ctx) => {
		const target = await drafts.loadForSubmission(draft.id, workflow.id, ctx);
		expect(target.workflow?.settings).toEqual({ executionTimeout: 45 });
	});
});

it('holds a concurrent workflow save until the submission boundary commits', async () => {
	const project = await createTeamProject();
	const workflow = await createWorkflow({}, project);
	const draft = await drafts.createOnce(
		{ ...source(), workflowId: workflow.id },
		project.id,
		payload(),
	);
	const locked = createDeferredPromise<boolean>();
	const release = createDeferredPromise<boolean>();
	const submission = tx.run({}, async (ctx) => {
		await drafts.loadForSubmission(draft.id, workflow.id, ctx);
		locked.resolve(true);
		await release.promise;
		await drafts.markPendingIfCurrent(draft.id, 1, ctx);
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
	expect((await drafts.getDraft(draft.id)).state).toBe('pending');
});

it('reverts and reapplies the draft schema', async () => {
	const db = Container.get(DataSource);
	// Template databases skip migrate(), which normally installs the DSL wrappers.
	postgresMigrations.forEach(wrapMigration);
	await db.undoLastMigration();
	const runner = db.createQueryRunner();
	try {
		const table = db.getMetadata(WorkflowDraftActivityEntity).tablePath;
		expect(await runner.hasTable(table)).toBe(false);
	} finally {
		await runner.release();
		await db.runMigrations();
	}
	expect(await drafts.count()).toBe(0);
});
