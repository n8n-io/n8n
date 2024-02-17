import { WorkflowStatisticsRepository } from '@db/repositories/workflowStatistics.repository';
import { DataSource, EntityManager, InsertResult, QueryFailedError } from '@n8n/typeorm';
import { mockInstance } from '../../shared/mocking';
import { mock, mockClear } from 'jest-mock-extended';
import { StatisticsNames, WorkflowStatistics } from '@/databases/entities/WorkflowStatistics';

const entityManager = mockInstance(EntityManager);
const dataSource = mockInstance(DataSource, { manager: entityManager });
dataSource.getMetadata.mockReturnValue(mock());
Object.assign(entityManager, { connection: dataSource });
const workflowStatisticsRepository = new WorkflowStatisticsRepository(dataSource);

describe('insertWorkflowStatistics', () => {
	beforeEach(() => {
		mockClear(entityManager.insert);
	});
	it('Successfully inserts data when it is not yet present', async () => {
		entityManager.findOne.mockResolvedValueOnce(null);
		entityManager.insert.mockResolvedValueOnce(mockInstance(InsertResult));

		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			'workflowId',
		);

		expect(insertionResult).toBe('insert');
	});

	it('Does not insert when data is present', async () => {
		entityManager.findOne.mockResolvedValueOnce(mockInstance(WorkflowStatistics));
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
			throw new QueryFailedError('Query', [], 'driver error');
		});

		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			'workflowId',
		);

		expect(insertionResult).toBe('failed');
	});
});
