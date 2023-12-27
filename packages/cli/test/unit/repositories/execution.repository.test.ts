import { mock } from 'jest-mock-extended';
import Container from 'typedi';
import { EntityManager, DataSource } from 'typeorm';
import { mockInstance } from '../../shared/mocking';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import config from '@/config';

describe('ExecutionRepository', () => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, { manager: entityManager });
	dataSource.getMetadata.mockReturnValue(mock());
	Object.assign(entityManager, { connection: dataSource });

	const executionRepository = Container.get(ExecutionRepository);

	describe('getWaitingExecutions()', () => {
		test.each(['sqlite', 'postgres'])('should be called with expected args', async (dbType) => {
			jest.spyOn(config, 'getEnv').mockReturnValueOnce(dbType);
			jest.spyOn(executionRepository, 'findMultipleExecutions').mockResolvedValueOnce([]);

			await executionRepository.getWaitingExecutions();

			const expectedQuery = expect.objectContaining({
				order: { waitTill: 'ASC' },
				select: ['id', 'waitTill'],
				where: expect.objectContaining({
					waitTill: expect.objectContaining({
						_type: 'lessThanOrEqual',
						_value: expect.any(String),
					}),
				}),
			});

			expect(executionRepository.findMultipleExecutions).toHaveBeenCalledWith(expectedQuery);
		});
	});
});
