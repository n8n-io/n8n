import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { isUniqueConstraintError, TransactionRunner, WorkflowRepository } from '@n8n/db';
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

		test('rejects a second finding for the same workflow, rule and target version', async () => {
			const workflow = await createWorkflow();
			await findingRepository.insertMany([finding(workflow.id)], ctx);

			await expect(findingRepository.insertMany([finding(workflow.id)], ctx)).rejects.toSatisfy(
				isUniqueConstraintError,
			);
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
});
