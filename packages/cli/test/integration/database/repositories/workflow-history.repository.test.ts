import {
	createWorkflow,
	createWorkflowHistory,
	createWorkflowWithHistory,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowHistoryRepository, WorkflowPublishedVersionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { RULES, type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

describe('WorkflowHistoryRepository', () => {
	const testNode1 = {
		id: uuid(),
		name: 'testNode1',
		parameters: {},
		type: 'aNodeType',
		typeVersion: 1,
		position: [0, 0],
	} satisfies INode;

	const alwaysMergeRule = () => true;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowPublishedVersion',
			'WorkflowPublishHistory',
			'WorkflowHistory',
			'WorkflowEntity',
			'User',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('pruneHistory', () => {
		it('should prune superseded version', async () => {
			const id1 = uuid();
			const id2 = uuid();

			const workflow = await createWorkflowWithHistory({
				versionId: id1,
				nodes: [{ ...testNode1, parameters: { a: 'a' } }],
			});
			await createWorkflowHistory({
				...workflow,
				versionId: uuid(),
				nodes: [{ ...testNode1, parameters: { a: 'ab' } }],
			});
			await createWorkflowHistory({
				...workflow,
				versionId: uuid(),
				nodes: [{ ...testNode1, parameters: { a: 'abc' } }],
			});
			await createWorkflowHistory({
				...workflow,
				versionId: id2,
				nodes: [{ ...testNode1, parameters: { a: 'abcd' } }],
			});

			// ACT
			const repository = Container.get(WorkflowHistoryRepository);

			const tenMinsAgo = new Date();
			tenMinsAgo.setMinutes(tenMinsAgo.getMinutes() - 10);

			const aMinAgo = new Date();
			aMinAgo.setMinutes(aMinAgo.getMinutes() - 1);

			const nextMin = new Date();
			nextMin.setMinutes(nextMin.getMinutes() + 1);

			const inTenMins = new Date();
			inTenMins.setMinutes(inTenMins.getMinutes() + 10);

			{
				// Don't touch workflows younger than range
				const { deleted, seen } = await repository.pruneHistory(workflow.id, tenMinsAgo, aMinAgo, [
					RULES.mergeAdditiveChanges,
				]);
				expect(deleted).toBe(0);
				expect(seen).toBe(0);

				const history = await repository.find();
				expect(history.length).toBe(4);
			}

			{
				// Don't touch workflows older
				const { deleted, seen } = await repository.pruneHistory(workflow.id, nextMin, inTenMins, [
					RULES.mergeAdditiveChanges,
				]);
				expect(deleted).toBe(0);
				expect(seen).toBe(0);

				const history = await repository.find();
				expect(history.length).toBe(4);
			}

			{
				const { deleted, seen } = await repository.pruneHistory(workflow.id, aMinAgo, nextMin, [
					RULES.mergeAdditiveChanges,
				]);
				expect(seen).toBe(4);
				expect(deleted).toBe(3);

				const history = await repository.find();
				expect(history.length).toBe(1);
				expect(history).toEqual([expect.objectContaining({ versionId: id2 })]);
			}
		});
		it('should not prune non-additive version', async () => {
			const id1 = uuid();
			const id2 = uuid();

			const workflow = await createWorkflowWithHistory({
				versionId: id1,
				nodes: [{ ...testNode1, parameters: { a: 'abcde' } }],
			});
			await createWorkflowHistory({
				...workflow,
				versionId: uuid(),
				nodes: [{ ...testNode1, parameters: { a: 'ab' } }],
			});
			await createWorkflowHistory({
				...workflow,
				versionId: uuid(),
				nodes: [{ ...testNode1, parameters: { a: 'abc' } }],
			});
			await createWorkflowHistory({
				...workflow,
				versionId: id2,
				nodes: [{ ...testNode1, parameters: { a: 'abcd' } }],
			});

			// ACT
			const repository = Container.get(WorkflowHistoryRepository);

			const tenMinsAgo = new Date();
			tenMinsAgo.setMinutes(tenMinsAgo.getMinutes() - 10);

			const aMinAgo = new Date();
			aMinAgo.setMinutes(aMinAgo.getMinutes() - 1);

			const nextMin = new Date();
			nextMin.setMinutes(nextMin.getMinutes() + 1);

			const inTenMins = new Date();
			inTenMins.setMinutes(inTenMins.getMinutes() + 10);

			{
				const { deleted, seen } = await repository.pruneHistory(workflow.id, aMinAgo, nextMin, [
					RULES.mergeAdditiveChanges,
				]);
				expect(seen).toBe(4);
				expect(deleted).toBe(2);

				const history = await repository.find();
				expect(history.length).toBe(2);
				expect(history).toEqual([
					expect.objectContaining({ versionId: id1 }),
					expect.objectContaining({ versionId: id2 }),
				]);
			}
		});

		it('should never prune previously active or named versions', async () => {
			// ARRANGE
			const id1 = uuid();
			const id2 = uuid();
			const id3 = uuid();
			const id4 = uuid();
			const id5 = uuid();

			const workflow = await createWorkflowWithHistory({
				versionId: id1,
				nodes: [{ ...testNode1, parameters: { a: 'a' } }],
			});
			await createWorkflowHistory(
				{
					...workflow,
					versionId: id2,
					nodes: [{ ...testNode1, parameters: { a: 'ab' } }],
				},
				undefined,
				undefined,
				{ name: 'aVersionName' },
			);
			await createWorkflowHistory({
				...workflow,
				versionId: id3,
				nodes: [{ ...testNode1, parameters: { a: 'abc' } }],
			});
			await createWorkflowHistory(
				{
					...workflow,
					versionId: id4,
					nodes: [{ ...testNode1, parameters: { a: 'abcd' } }],
				},
				undefined,
				{ event: 'activated' },
			);
			await createWorkflowHistory({
				...workflow,
				versionId: id5,
				nodes: [{ ...testNode1, parameters: { a: 'abcde' } }],
			});

			// ACT
			const repository = Container.get(WorkflowHistoryRepository);

			const aDayAgo = new Date();
			aDayAgo.setDate(aDayAgo.getDate() - 1);

			const nextDay = new Date();
			nextDay.setDate(nextDay.getDate() + 1);

			const { deleted, seen } = await repository.pruneHistory(workflow.id, aDayAgo, nextDay, [
				alwaysMergeRule,
			]);

			// ASSERT
			expect(seen).toBe(5);
			expect(deleted).toBe(2);

			const history = await repository.find();
			expect(history).toEqual([
				expect.objectContaining({ versionId: id2 }),
				expect.objectContaining({ versionId: id4 }),
				expect.objectContaining({ versionId: id5 }),
			]);

			const redo = await repository.pruneHistory(workflow.id, aDayAgo, nextDay, [alwaysMergeRule]);

			// ASSERT
			expect(redo.deleted).toBe(0);
			expect(redo.seen).toBe(3);
		});
	});
	describe('deleteEarlierThanExceptCurrentAndActive', () => {
		// Happy path: proves the setup deletes old, unreferenced versions while
		// keeping the current version.
		it('should delete old versions but keep the current version', async () => {
			const vCurrent = uuid();
			const vOld = uuid();

			const tenDaysAgo = new Date();
			tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

			const oneDayAgo = new Date();
			oneDayAgo.setDate(oneDayAgo.getDate() - 1);

			const workflow = await createWorkflow({
				versionId: vCurrent,
				nodes: [{ ...testNode1, parameters: { a: 'current' } }],
			});
			// Old, unreferenced version (should be pruned)
			await createWorkflowHistory(
				{ ...workflow, versionId: vOld, nodes: [{ ...testNode1, parameters: { a: 'old' } }] },
				undefined,
				undefined,
				{ createdAt: tenDaysAgo },
			);
			// Current version history (recent, excluded as workflow_entity.versionId)
			await createWorkflowHistory(workflow);

			const repository = Container.get(WorkflowHistoryRepository);
			await repository.deleteEarlierThanExceptCurrentAndActive(oneDayAgo);

			const remainingIds = (await repository.find()).map((r) => r.versionId);
			expect(remainingIds).toContain(vCurrent);
			expect(remainingIds).not.toContain(vOld);
		});

		// CAT-3293: a workflow_history row referenced by
		// workflow_published_version.publishedVersionId carries an ON DELETE
		// RESTRICT FK. When such a row ages past the prune window and is neither
		// the current nor the active version, the prune DELETE targets it and
		// SQLite aborts the whole statement with
		// "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed", which then recurs
		// every hour. The prune must exclude published versions, mirroring the
		// sibling pruneHistory() which already preserves them.
		//
		// How this state arises in production (published != current != active):
		// the service layer normally keeps publishedVersionId in lockstep with
		// activeVersionId (set together when activating, removed together when
		// deactivating). The one place that breaks that invariant is the active
		// workflow manager's activation-failure recovery
		// (active-workflow-manager.ts: `update(workflowId, { active: false,
		// activeVersionId: null })`), which nulls activeVersionId without removing
		// the workflow_published_version row. A workflow that was published, then
		// edited (advancing versionId), then failed to (re)activate on a
		// restart/leadership change is left with a stale publishedVersionId
		// pointing at an older history row. This also requires the
		// `useWorkflowPublicationService` flag, which is off by default. We set up
		// that end state directly here rather than driving the failure path; the
		// query-level invariant is what this test pins down.
		it('should preserve versions referenced by a published version', async () => {
			const vCurrent = uuid();
			const vPublished = uuid();
			const vOther = uuid();

			const tenDaysAgo = new Date();
			tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

			const oneDayAgo = new Date();
			oneDayAgo.setDate(oneDayAgo.getDate() - 1);

			const workflow = await createWorkflow({
				versionId: vCurrent,
				nodes: [{ ...testNode1, parameters: { a: 'current' } }],
			});

			// Old version that is still the published version (RESTRICT FK)
			await createWorkflowHistory(
				{
					...workflow,
					versionId: vPublished,
					nodes: [{ ...testNode1, parameters: { a: 'published' } }],
				},
				undefined,
				undefined,
				{ createdAt: tenDaysAgo },
			);
			// Old version that is NOT referenced anywhere (should be pruned)
			await createWorkflowHistory(
				{ ...workflow, versionId: vOther, nodes: [{ ...testNode1, parameters: { a: 'other' } }] },
				undefined,
				undefined,
				{ createdAt: tenDaysAgo },
			);
			// Current version history (recent)
			await createWorkflowHistory(workflow);

			// The published version has advanced away from current/active
			await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
				workflow.id,
				vPublished,
			);

			const repository = Container.get(WorkflowHistoryRepository);

			// Must not throw SQLITE_CONSTRAINT: FOREIGN KEY constraint failed
			await repository.deleteEarlierThanExceptCurrentAndActive(oneDayAgo);

			const remainingIds = (await repository.find()).map((r) => r.versionId);
			expect(remainingIds).toContain(vPublished); // preserved: referenced as published
			expect(remainingIds).toContain(vCurrent); // preserved: current version
			expect(remainingIds).not.toContain(vOther); // pruned: old and unreferenced
		});
	});

	describe('getWorkflowIdsInRange', () => {
		it('should return versions in range', async () => {
			const now = Date.now();
			const twoSecondsAhead = new Date(now + 2 * 1000);
			const fourSecondsAhead = new Date(now + 4 * 1000);
			const sixSecondsAhead = new Date(now + 6 * 1000);

			const workflowA = await createWorkflow({
				versionId: uuid(),
				nodes: [{ ...testNode1, parameters: { a: 'a' } }],
			});

			// Create workflow history for the initial version
			await createWorkflowHistory(workflowA, undefined, undefined, { createdAt: new Date(now) });

			await createWorkflowHistory(
				{
					...workflowA,
					versionId: uuid(),
					nodes: [{ ...testNode1, parameters: { a: 'abcd' } }],
				},
				undefined,
				undefined,
				{ createdAt: twoSecondsAhead },
			);

			const workflowB = await createWorkflow({
				versionId: uuid(),
				nodes: [{ ...testNode1, parameters: { a: 'a' } }],
			});
			await createWorkflowHistory(workflowB, undefined, undefined, { createdAt: fourSecondsAhead });

			// ACT
			const repository = Container.get(WorkflowHistoryRepository);
			{
				const ids = await repository.getWorkflowIdsInRange(sixSecondsAhead, sixSecondsAhead);
				expect(ids).toEqual([]);
			}
			{
				const ids = await repository.getWorkflowIdsInRange(fourSecondsAhead, sixSecondsAhead);
				expect(ids).toEqual([workflowB.id]);
			}
			{
				const ids = await repository.getWorkflowIdsInRange(twoSecondsAhead, sixSecondsAhead);
				expect(ids).toEqual(expect.arrayContaining([workflowA.id, workflowB.id]));
			}
		});
	});
});
