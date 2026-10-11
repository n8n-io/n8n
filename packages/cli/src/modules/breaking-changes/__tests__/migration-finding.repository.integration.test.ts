import {
	createWorkflow,
	createWorkflowWithHistory,
	setActiveVersion,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { TransactionRunner, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { MigrationFindingSyncRepository } from '../database/repositories/migration-finding-sync.repository';
import {
	MigrationFindingRepository,
	type NewMigrationFinding,
} from '../database/repositories/migration-finding.repository';

// Runs against the real database: the unique index, the check constraints and
// the cascade delete live in the schema, so a mocked manager would not exercise them.

const ctx = {};

let findingRepository: MigrationFindingRepository;
let syncRepository: MigrationFindingSyncRepository;

const finding = (
	workflowId: string,
	ruleId = 'removed-nodes-v3',
	targetVersion: NewMigrationFinding['targetVersion'] = 'v3',
): NewMigrationFinding => ({ targetVersion, ruleId, workflowId });

/** A fixed past timestamp, so a moved `statusChangedAt` is distinguishable from a kept one. */
const PAST = new Date('2026-01-01T00:00:00.000Z');

/** Inserts one open finding and pins its `statusChangedAt`; returns the id. */
async function insertWithStatusChangedAt(workflowId: string, statusChangedAt: Date) {
	await findingRepository.insertMany([finding(workflowId)], ctx);
	const [row] = await findingRepository.listForWorkflows('v3', [workflowId], ctx);
	await findingRepository.update({ id: row.id }, { statusChangedAt });
	return row.id;
}

beforeAll(async () => {
	await testModules.loadModules(['breaking-changes']);
	await testDb.init();
	findingRepository = Container.get(MigrationFindingRepository);
	syncRepository = Container.get(MigrationFindingSyncRepository);
});

beforeEach(async () => {
	await findingRepository.delete({});
	await syncRepository.delete({});
	await testDb.truncate(['WorkflowEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('MigrationFindingRepository', () => {
	describe('insertMany and listForWorkflows', () => {
		test('inserts findings as open and lists them for the given workflows only', async () => {
			const [first, second, other] = await Promise.all([
				createWorkflow(),
				createWorkflow(),
				createWorkflow(),
			]);
			await findingRepository.insertMany(
				[finding(first.id), finding(second.id), finding(other.id)],
				ctx,
			);

			const listed = await findingRepository.listForWorkflows('v3', [first.id, second.id], ctx);

			expect(listed.map((f) => f.workflowId).sort()).toEqual([first.id, second.id].sort());
			for (const row of listed) {
				expect(row.status).toBe('open');
				expect(row.note).toBeNull();
				expect(row.notifiedAt).toBeNull();
				expect(row.statusChangedAt).toBeInstanceOf(Date);
				expect(row.id).toEqual(expect.any(Number));
			}
		});

		test('lists only findings for the requested target version', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany(
				[finding(workflow.id, 'rule-a', 'v2'), finding(workflow.id, 'rule-a', 'v3')],
				ctx,
			);

			const listed = await findingRepository.listForWorkflows('v2', [workflow.id], ctx);

			expect(listed).toHaveLength(1);
			expect(listed[0].targetVersion).toBe('v2');
		});

		test('returns an empty list for an empty id array', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id)], ctx);

			expect(await findingRepository.listForWorkflows('v3', [], ctx)).toEqual([]);
		});

		test('does nothing for an empty finding array', async () => {
			await findingRepository.insertMany([], ctx);

			expect(await findingRepository.count()).toBe(0);
		});

		test('keeps the existing row when the same finding is inserted again', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id)], ctx);
			const [before] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			await findingRepository.markFixedForIds([before.id], ctx);

			await findingRepository.insertMany([finding(workflow.id)], ctx);

			const rows = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ id: before.id, status: 'fixed' });
		});

		test('inserts the new findings of a batch and ignores the ones that exist', async () => {
			const [first, second] = await Promise.all([createWorkflow(), createWorkflow()]);
			await findingRepository.insertMany([finding(first.id)], ctx);

			await findingRepository.insertMany([finding(first.id), finding(second.id)], ctx);

			const rows = await findingRepository.listForWorkflows('v3', [first.id, second.id], ctx);
			expect(rows.map((row) => row.workflowId).sort()).toEqual([first.id, second.id].sort());
		});

		test('accepts the same rule and workflow for another target version', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id, 'rule-a', 'v2')], ctx);

			await findingRepository.insertMany([finding(workflow.id, 'rule-a', 'v3')], ctx);

			expect(await findingRepository.count()).toBe(2);
		});

		test('rolls back the insert when the surrounding transaction fails', async () => {
			const workflow = await createWorkflow();

			await expect(
				Container.get(TransactionRunner).run(ctx, async (trxCtx) => {
					await findingRepository.insertMany([finding(workflow.id)], trxCtx);
					throw new Error('abort');
				}),
			).rejects.toThrow('abort');

			expect(await findingRepository.count()).toBe(0);
		});
	});

	describe('updateStatusForIds', () => {
		test('updates status, note and statusChangedAt for the given ids only', async () => {
			const [target, untouched] = await Promise.all([createWorkflow(), createWorkflow()]);
			await findingRepository.insertMany([finding(target.id), finding(untouched.id)], ctx);
			const [before] = await findingRepository.listForWorkflows('v3', [target.id], ctx);

			await findingRepository.updateStatusForIds([before.id], 'wont_fix', 'Legacy flow', ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [target.id], ctx);
			expect(after.status).toBe('wont_fix');
			expect(after.note).toBe('Legacy flow');
			expect(after.statusChangedAt.getTime()).toBeGreaterThanOrEqual(
				before.statusChangedAt.getTime(),
			);

			const [other] = await findingRepository.listForWorkflows('v3', [untouched.id], ctx);
			expect(other.status).toBe('open');
			expect(other.note).toBeNull();
		});

		test('keeps the existing note when note is undefined', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id)], ctx);
			const [row] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			await findingRepository.updateStatusForIds([row.id], 'wont_fix', 'Keep me', ctx);

			await findingRepository.updateStatusForIds([row.id], 'notified', undefined, ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(after.status).toBe('notified');
			expect(after.note).toBe('Keep me');
		});

		test('moves statusChangedAt on a real status transition', async () => {
			const workflow = await createWorkflow();
			const id = await insertWithStatusChangedAt(workflow.id, PAST);

			await findingRepository.updateStatusForIds([id], 'wont_fix', undefined, ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(after.statusChangedAt.getTime()).toBeGreaterThan(PAST.getTime());
		});

		test('keeps statusChangedAt when the status does not change', async () => {
			const workflow = await createWorkflow();
			const id = await insertWithStatusChangedAt(workflow.id, PAST);

			await findingRepository.updateStatusForIds([id], 'open', undefined, ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(after.status).toBe('open');
			expect(after.statusChangedAt.getTime()).toBe(PAST.getTime());
		});

		test('keeps statusChangedAt on a note-only edit', async () => {
			const workflow = await createWorkflow();
			const id = await insertWithStatusChangedAt(workflow.id, PAST);

			await findingRepository.updateStatusForIds([id], 'open', 'Edited note', ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(after.note).toBe('Edited note');
			expect(after.statusChangedAt.getTime()).toBe(PAST.getTime());
		});

		test('does nothing for an empty id array', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id)], ctx);

			await findingRepository.updateStatusForIds([], 'wont_fix', 'ignored', ctx);

			const [row] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(row.status).toBe('open');
		});
	});

	describe('markFixedForIds', () => {
		test('sets the status to fixed and keeps the note', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id)], ctx);
			const [row] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			await findingRepository.updateStatusForIds([row.id], 'notified', 'Owner pinged', ctx);

			await findingRepository.markFixedForIds([row.id], ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(after.status).toBe('fixed');
			expect(after.note).toBe('Owner pinged');
		});
	});

	describe('markNotifiedForIds', () => {
		test('sets the status to notified and records notifiedAt', async () => {
			const workflow = await createWorkflow();
			const id = await insertWithStatusChangedAt(workflow.id, PAST);

			await findingRepository.markNotifiedForIds([id], ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(after.status).toBe('notified');
			expect(after.notifiedAt?.getTime()).toBeGreaterThan(PAST.getTime());
			expect(after.statusChangedAt.getTime()).toBeGreaterThan(PAST.getTime());
		});

		test('bumps notifiedAt on a reminder without moving statusChangedAt', async () => {
			const workflow = await createWorkflow();
			const id = await insertWithStatusChangedAt(workflow.id, PAST);
			await findingRepository.markNotifiedForIds([id], ctx);
			await findingRepository.update({ id }, { statusChangedAt: PAST, notifiedAt: PAST });

			await findingRepository.markNotifiedForIds([id], ctx);

			const [after] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(after.status).toBe('notified');
			expect(after.notifiedAt?.getTime()).toBeGreaterThan(PAST.getTime());
			expect(after.statusChangedAt.getTime()).toBe(PAST.getTime());
		});

		test('does nothing for an empty id array', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id)], ctx);

			await findingRepository.markNotifiedForIds([], ctx);

			const [row] = await findingRepository.listForWorkflows('v3', [workflow.id], ctx);
			expect(row.status).toBe('open');
			expect(row.notifiedAt).toBeNull();
		});
	});

	describe('countOpenByRule', () => {
		test('counts only open findings, per rule, for the requested version', async () => {
			const [first, second, third] = await Promise.all([
				createWorkflow(),
				createWorkflow(),
				createWorkflow(),
			]);
			await findingRepository.insertMany(
				[
					finding(first.id, 'rule-a'),
					finding(second.id, 'rule-a'),
					finding(third.id, 'rule-a'),
					finding(first.id, 'rule-b'),
					finding(first.id, 'rule-a', 'v2'),
				],
				ctx,
			);
			const [fixed] = await findingRepository.listForWorkflows('v3', [third.id], ctx);
			await findingRepository.markFixedForIds([fixed.id], ctx);

			const counts = await findingRepository.countOpenByRule('v3', ctx);

			expect(counts.sort((a, b) => a.ruleId.localeCompare(b.ruleId))).toEqual([
				{ ruleId: 'rule-a', count: 2 },
				{ ruleId: 'rule-b', count: 1 },
			]);
		});

		test('returns an empty list when the version has no open findings', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id, 'rule-a', 'v2')], ctx);

			expect(await findingRepository.countOpenByRule('v3', ctx)).toEqual([]);
		});
	});

	describe('countDistinctOpenWorkflows', () => {
		test('counts a workflow once even when several rules hit it, and ignores fixed and other versions', async () => {
			const [first, second, third] = await Promise.all([
				createWorkflow(),
				createWorkflow(),
				createWorkflow(),
			]);
			await findingRepository.insertMany(
				[
					finding(first.id, 'rule-a'),
					finding(first.id, 'rule-b'),
					finding(second.id, 'rule-a'),
					finding(third.id, 'rule-a'),
					finding(third.id, 'rule-b', 'v2'),
				],
				ctx,
			);
			const [fixed] = await findingRepository.listForWorkflows('v3', [third.id], ctx);
			await findingRepository.markFixedForIds([fixed.id], ctx);

			expect(await findingRepository.countDistinctOpenWorkflows('v3', ctx)).toBe(2);
		});

		test('returns zero when the version has no open findings', async () => {
			expect(await findingRepository.countDistinctOpenWorkflows('v3', ctx)).toBe(0);
		});
	});

	describe('listOpenForRule', () => {
		test('returns each open finding of the rule with its workflow name, published state and last update', async () => {
			const published = await createWorkflowWithHistory({ name: 'Published flow' });
			await setActiveVersion(published.id, published.versionId);
			const [draft, fixed, otherRule] = await Promise.all([
				createWorkflow({ name: 'Draft flow' }),
				createWorkflow({ name: 'Fixed flow' }),
				createWorkflow({ name: 'Other rule flow' }),
			]);
			await findingRepository.insertMany(
				[
					finding(published.id, 'rule-a'),
					finding(draft.id, 'rule-a'),
					finding(fixed.id, 'rule-a'),
					finding(otherRule.id, 'rule-b'),
					finding(draft.id, 'rule-a', 'v2'),
				],
				ctx,
			);
			const [fixedRow] = await findingRepository.listForWorkflows('v3', [fixed.id], ctx);
			await findingRepository.markFixedForIds([fixedRow.id], ctx);

			const listed = await findingRepository.listOpenForRule('v3', 'rule-a', ctx);

			expect(listed.map((f) => f.workflowId).sort()).toEqual([published.id, draft.id].sort());
			for (const row of listed) {
				expect(row.ruleId).toBe('rule-a');
				expect(row.id).toEqual(expect.any(Number));
				expect(row.workflow.updatedAt).toBeInstanceOf(Date);
			}

			const publishedFinding = listed.find((f) => f.workflowId === published.id);
			expect(publishedFinding?.workflow).toMatchObject({
				id: published.id,
				name: 'Published flow',
				activeVersionId: published.versionId,
			});

			const draftFinding = listed.find((f) => f.workflowId === draft.id);
			expect(draftFinding?.workflow).toMatchObject({
				id: draft.id,
				name: 'Draft flow',
				activeVersionId: null,
			});
		});

		test('returns an empty list when the rule has no open findings', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id, 'rule-b')], ctx);

			expect(await findingRepository.listOpenForRule('v3', 'rule-a', ctx)).toEqual([]);
		});
	});

	describe('cascade delete', () => {
		test('deletes the findings of a deleted workflow and keeps the others', async () => {
			const [deleted, kept] = await Promise.all([createWorkflow(), createWorkflow()]);
			await findingRepository.insertMany([finding(deleted.id), finding(kept.id)], ctx);

			await Container.get(WorkflowRepository).delete({ id: deleted.id });

			expect(await findingRepository.findBy({ workflowId: deleted.id })).toEqual([]);
			expect(await findingRepository.findBy({ workflowId: kept.id })).toHaveLength(1);
		});
	});
});

describe('MigrationFindingSyncRepository', () => {
	test('getForVersion returns null when no scan ran for the version', async () => {
		expect(await syncRepository.getForVersion('v3', ctx)).toBeNull();
	});

	test('upsertForVersion inserts a record and then overwrites it', async () => {
		const firstSync = new Date('2026-01-01T00:00:00.000Z');
		await syncRepository.upsertForVersion(
			{ targetVersion: 'v3', syncedAt: firstSync, ruleSetFingerprint: 'fp-1' },
			ctx,
		);

		const inserted = await syncRepository.getForVersion('v3', ctx);
		expect(inserted?.syncedAt.getTime()).toBe(firstSync.getTime());
		expect(inserted?.ruleSetFingerprint).toBe('fp-1');

		const secondSync = new Date('2026-02-01T00:00:00.000Z');
		await syncRepository.upsertForVersion(
			{ targetVersion: 'v3', syncedAt: secondSync, ruleSetFingerprint: 'fp-2' },
			ctx,
		);

		const updated = await syncRepository.getForVersion('v3', ctx);
		expect(updated?.syncedAt.getTime()).toBe(secondSync.getTime());
		expect(updated?.ruleSetFingerprint).toBe('fp-2');
		expect(await syncRepository.count()).toBe(1);
	});

	test('keeps the records of different target versions apart', async () => {
		const syncedAt = new Date('2026-01-01T00:00:00.000Z');
		await syncRepository.upsertForVersion(
			{ targetVersion: 'v2', syncedAt, ruleSetFingerprint: 'fp-v2' },
			ctx,
		);
		await syncRepository.upsertForVersion(
			{ targetVersion: 'v3', syncedAt, ruleSetFingerprint: 'fp-v3' },
			ctx,
		);

		expect((await syncRepository.getForVersion('v2', ctx))?.ruleSetFingerprint).toBe('fp-v2');
		expect((await syncRepository.getForVersion('v3', ctx))?.ruleSetFingerprint).toBe('fp-v3');
	});

	test('deleteForVersion removes the record of that version only', async () => {
		const syncedAt = new Date('2026-01-01T00:00:00.000Z');
		await syncRepository.upsertForVersion(
			{ targetVersion: 'v2', syncedAt, ruleSetFingerprint: 'fp-v2' },
			ctx,
		);
		await syncRepository.upsertForVersion(
			{ targetVersion: 'v3', syncedAt, ruleSetFingerprint: 'fp-v3' },
			ctx,
		);

		await syncRepository.deleteForVersion('v3', ctx);

		expect(await syncRepository.getForVersion('v3', ctx)).toBeNull();
		expect((await syncRepository.getForVersion('v2', ctx))?.ruleSetFingerprint).toBe('fp-v2');
	});

	test('deleteForVersion is a no-op when the version has no record', async () => {
		await expect(syncRepository.deleteForVersion('v3', ctx)).resolves.toBeUndefined();
		expect(await syncRepository.count()).toBe(0);
	});
});
