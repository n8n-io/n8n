import {
	createWorkflow,
	createWorkflowHistory,
	createWorkflowWithHistory,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { type INode } from 'n8n-workflow';
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

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowPublishHistory', 'WorkflowHistory', 'WorkflowEntity', 'User']);
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

			const tenDaysAgo = new Date();
			tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

			const aDayAgo = new Date();
			aDayAgo.setDate(aDayAgo.getDate() - 1);

			const nextDay = new Date();
			nextDay.setDate(nextDay.getDate() + 1);

			const inTenDays = new Date();
			inTenDays.setDate(inTenDays.getDate() + 10);

			{
				// Don't touch workflows younger than range
				const { deleted, seen } = await repository.pruneHistory(workflow.id, tenDaysAgo, aDayAgo);
				expect(deleted).toBe(0);
				expect(seen).toBe(0);

				const history = await repository.find();
				expect(history.length).toBe(4);
			}

			{
				// Don't touch workflows older
				const { deleted, seen } = await repository.pruneHistory(workflow.id, nextDay, inTenDays);
				expect(deleted).toBe(0);
				expect(seen).toBe(0);

				const history = await repository.find();
				expect(history.length).toBe(4);
			}

			{
				const { deleted, seen } = await repository.pruneHistory(workflow.id, aDayAgo, nextDay);
				expect(deleted).toBe(2);
				expect(seen).toBe(4);

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

			const { deleted, seen } = await repository.pruneHistory(workflow.id, aDayAgo, nextDay);

			// ASSERT
			expect(deleted).toBe(1);
			expect(seen).toBe(5);

			const history = await repository.find();
			expect(history.length).toBe(4);
			expect(history).toEqual([
				expect.objectContaining({ versionId: id1 }),
				expect.objectContaining({ versionId: id2 }),
				expect.objectContaining({ versionId: id4 }),
				expect.objectContaining({ versionId: id5 }),
			]);

			const redo = await repository.pruneHistory(workflow.id, aDayAgo, nextDay);

			// ASSERT
			expect(redo.deleted).toBe(0);
			expect(redo.seen).toBe(4);
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
