import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { StatisticsNames, WorkflowStatistics, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { type InsertResult, QueryFailedError } from '@n8n/typeorm';
import { mock, mockClear } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';

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

describe('upsertWorkflowStatistics', () => {
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
