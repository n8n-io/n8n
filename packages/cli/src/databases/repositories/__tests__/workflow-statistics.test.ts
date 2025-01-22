import { Container } from '@n8n/di';
import { type InsertResult, QueryFailedError } from '@n8n/typeorm';
import { mock, mockClear } from 'jest-mock-extended';

import { StatisticsNames, WorkflowStatistics } from '@/databases/entities/workflow-statistics';
import { WorkflowStatisticsRepository } from '@/databases/repositories/workflow-statistics.repository';
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
