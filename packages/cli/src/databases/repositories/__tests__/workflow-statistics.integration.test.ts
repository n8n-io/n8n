import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import {
	StatisticsNames,
	TransactionRunner,
	WorkflowStatistics,
	WorkflowStatisticsRepository,
	type WorkflowStatisticsIncrement,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { type InsertResult, QueryFailedError } from '@n8n/typeorm';
import { mock, mockClear } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

// `upsertWorkflowStatistics` is SQLite-only; on Postgres, recording goes through appendIncrement + rollup.
const runOnSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';
// eslint-disable-next-line n8n-local-rules/no-skipped-tests -- SQLite-only method
const describeSqlite = runOnSqlite ? describe : describe.skip;

describe('insertWorkflowStatistics', () => {
	const entityManager = mockEntityManager(WorkflowStatistics);
	const workflowStatisticsRepository = Container.get(WorkflowStatisticsRepository);

	beforeEach(() => {
		mockClear(entityManager.insert);
	});

	it('Successfully inserts data when it is not yet present', async () => {
		entityManager.findOne.mockResolvedValueOnce(null);
		entityManager.insert.mockResolvedValueOnce(mock<InsertResult>());

		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			'workflowId',
		);

		expect(insertionResult).toBe('insert');
	});

	it('Does not insert when data is present', async () => {
		entityManager.findOne.mockResolvedValueOnce(mock<WorkflowStatistics>());
		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			'workflowId',
		);

		expect(insertionResult).toBe('alreadyExists');
		expect(entityManager.insert).not.toHaveBeenCalled();
	});

	it('throws an error when insertion fails', async () => {
		entityManager.findOne.mockResolvedValueOnce(null);
		entityManager.insert.mockImplementation(async () => {
			throw new QueryFailedError('Query', [], new Error('driver error'));
		});

		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			'workflowId',
		);

		expect(insertionResult).toBe('failed');
	});
});

describeSqlite('upsertWorkflowStatistics', () => {
	let repository: WorkflowStatisticsRepository;
	beforeAll(async () => {
		Container.reset();
		await testDb.init();
		repository = Container.get(WorkflowStatisticsRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowStatistics']);
	});

	test('Successfully inserts data when it is not yet present', async () => {
		// ARRANGE
		const workflow = await createWorkflow({});

		// ACT
		const upsertResult = await repository.upsertWorkflowStatistics(
			StatisticsNames.productionSuccess,
			workflow.id,
			true,
		);

		// ASSERT
		expect(upsertResult).toBe('insert');
		const insertedData = await repository.find();
		expect(insertedData).toHaveLength(1);
		expect(insertedData[0].workflowId).toBe(workflow.id);
		expect(insertedData[0].name).toBe(StatisticsNames.productionSuccess);
		expect(insertedData[0].count).toBe(1);
		expect(insertedData[0].rootCount).toBe(1);
	});

	test('Successfully updates data when it is already present', async () => {
		// ARRANGE
		const workflow = await createWorkflow({});
		await repository.insert({
			workflowId: workflow.id,
			name: StatisticsNames.productionSuccess,
			count: 1,
			rootCount: 1,
			latestEvent: new Date(),
		});

		// ACT
		const result = await repository.upsertWorkflowStatistics(
			StatisticsNames.productionSuccess,
			workflow.id,
			false,
		);

		// ASSERT
		expect(result).toBe('update');
		const updatedData = await repository.find();
		expect(updatedData).toHaveLength(1);
		expect(updatedData[0].workflowId).toBe(workflow.id);
		expect(updatedData[0].name).toBe(StatisticsNames.productionSuccess);
		expect(updatedData[0].count).toBe(2);
		expect(updatedData[0].rootCount).toBe(1);
	});
});

describe('addIncrements', () => {
	let repository: WorkflowStatisticsRepository;
	let txRunner: TransactionRunner;

	const increment = (
		overrides: Partial<WorkflowStatisticsIncrement> = {},
	): WorkflowStatisticsIncrement => ({
		workflowId: 'workflow-1',
		name: StatisticsNames.productionSuccess,
		count: 1,
		rootCount: 1,
		latestEvent: new Date('2026-01-10T10:00:00.500Z'),
		firstEvent: new Date('2026-01-10T10:00:00.500Z'),
		workflowName: 'First name',
		...overrides,
	});

	const add = async (...increments: WorkflowStatisticsIncrement[]) =>
		await txRunner.run({}, async (ctx) => await repository.addIncrements(increments, ctx));

	const counter = async (workflowId: string, name: StatisticsNames) =>
		await repository.findOneByOrFail({ workflowId, name });

	beforeAll(async () => {
		Container.reset();
		await testDb.init();
		repository = Container.get(WorkflowStatisticsRepository);
		txRunner = Container.get(TransactionRunner);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowStatistics']);
	});

	test('creates a counter and reports it as a first occurrence', async () => {
		const firstOccurrences = await add(increment({ count: 3, rootCount: 2 }));

		expect(firstOccurrences).toEqual([
			{
				name: StatisticsNames.productionSuccess,
				workflowId: 'workflow-1',
				workflowName: 'First name',
				firstEventMs: new Date('2026-01-10T10:00:00.500Z').getTime(),
			},
		]);
		expect(await counter('workflow-1', StatisticsNames.productionSuccess)).toMatchObject({
			count: 3,
			rootCount: 2,
			workflowName: 'First name',
			latestEvent: new Date('2026-01-10T10:00:00.500Z'),
		});
	});

	test('adds to an existing counter and reports no first occurrence', async () => {
		await add(increment({ count: 3, rootCount: 2 }));

		const firstOccurrences = await add(
			increment({
				count: 2,
				rootCount: 1,
				workflowName: 'Second name',
				latestEvent: new Date('2026-01-11T08:00:00.000Z'),
			}),
		);

		expect(firstOccurrences).toEqual([]);
		expect(await counter('workflow-1', StatisticsNames.productionSuccess)).toMatchObject({
			count: 5,
			rootCount: 3,
			workflowName: 'Second name',
			latestEvent: new Date('2026-01-11T08:00:00.000Z'),
		});
	});

	test('keeps the newer latest event when an older increment arrives', async () => {
		await add(increment({ latestEvent: new Date('2026-01-11T08:00:00.000Z') }));

		await add(increment({ latestEvent: new Date('2026-01-10T08:00:00.000Z') }));

		expect((await counter('workflow-1', StatisticsNames.productionSuccess)).latestEvent).toEqual(
			new Date('2026-01-11T08:00:00.000Z'),
		);
	});

	test('reports only production counters as first occurrences', async () => {
		const firstOccurrences = await add(
			increment({ name: StatisticsNames.manualSuccess, rootCount: 0 }),
			increment({ name: StatisticsNames.productionError }),
		);

		expect(firstOccurrences.map(({ name }) => name)).toEqual([StatisticsNames.productionError]);
		expect(await repository.count()).toBe(2);
	});

	test('reports only the new counters of a mixed batch', async () => {
		await add(increment({ workflowId: 'workflow-1' }));

		const firstOccurrences = await add(
			increment({ workflowId: 'workflow-1' }),
			increment({ workflowId: 'workflow-2' }),
		);

		expect(firstOccurrences.map(({ workflowId }) => workflowId)).toEqual(['workflow-2']);
	});

	test('stores a null workflow name', async () => {
		await add(increment({ workflowName: null }));

		expect(
			(await counter('workflow-1', StatisticsNames.productionSuccess)).workflowName,
		).toBeNull();
	});

	test('writes more counters than fit in one statement', async () => {
		const increments = Array.from({ length: 2_500 }, (_, index) =>
			increment({ workflowId: `workflow-${index}` }),
		);

		const firstOccurrences = await add(...increments);

		expect(firstOccurrences).toHaveLength(2_500);
		expect(await repository.count()).toBe(2_500);
	});

	test('rolls back with the transaction', async () => {
		await expect(
			txRunner.run({}, async (ctx) => {
				await repository.addIncrements([increment()], ctx);
				throw new Error('rollback');
			}),
		).rejects.toThrow('rollback');

		expect(await repository.count()).toBe(0);
	});

	test('throws without a transaction', async () => {
		await expect(repository.addIncrements([increment()], {})).rejects.toThrow(
			'addIncrements needs an active transaction',
		);
	});

	// The old SQLite writer stores `CURRENT_TIMESTAMP`, which has no milliseconds.
	describeSqlite('next to a counter written by upsertWorkflowStatistics', () => {
		test('moves the latest event forward', async () => {
			await repository.upsertWorkflowStatistics(
				StatisticsNames.productionSuccess,
				'workflow-1',
				true,
			);
			const later = new Date(Date.now() + 60_000);

			const firstOccurrences = await add(increment({ latestEvent: later }));

			expect(firstOccurrences).toEqual([]);
			const stored = await counter('workflow-1', StatisticsNames.productionSuccess);
			expect(stored.count).toBe(2);
			expect(stored.latestEvent).toEqual(later);
		});

		test('does not move the latest event back', async () => {
			await repository.upsertWorkflowStatistics(
				StatisticsNames.productionSuccess,
				'workflow-1',
				true,
			);
			const before = (await counter('workflow-1', StatisticsNames.productionSuccess)).latestEvent;

			await add(increment({ latestEvent: new Date('2020-01-01T00:00:00.000Z') }));

			expect((await counter('workflow-1', StatisticsNames.productionSuccess)).latestEvent).toEqual(
				before,
			);
		});
	});
});
