import { GlobalConfig } from '@n8n/config';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { Not, LessThanOrEqual } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { BinaryDataService } from 'n8n-core';
import { nanoid } from 'nanoid';
import Container from 'typedi';

import { ExecutionEntity } from '@/databases/entities/execution-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { mockInstance, mockEntityManager } from '@test/mocking';

describe('ExecutionRepository', () => {
	const entityManager = mockEntityManager(ExecutionEntity);
	const globalConfig = mockInstance(GlobalConfig, {
		logging: { outputs: ['console'], scopes: [] },
	});
	const binaryDataService = mockInstance(BinaryDataService);
	const executionRepository = Container.get(ExecutionRepository);
	const mockDate = new Date('2023-12-28 12:34:56.789Z');

	beforeAll(() => {
		jest.clearAllMocks();
		jest.useFakeTimers().setSystemTime(mockDate);
	});

	afterAll(() => jest.useRealTimers());

	describe('getWaitingExecutions()', () => {
		test.each(['sqlite', 'postgresdb'] as const)(
			'on %s, should be called with expected args',
			async (dbType) => {
				globalConfig.database.type = dbType;
				entityManager.find.mockResolvedValueOnce([]);

				await executionRepository.getWaitingExecutions();

				expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
					order: { waitTill: 'ASC' },
					select: ['id', 'waitTill'],
					where: {
						status: Not('crashed'),
						waitTill: LessThanOrEqual(
							dbType === 'sqlite'
								? '2023-12-28 12:36:06.789'
								: new Date('2023-12-28T12:36:06.789Z'),
						),
					},
				});
			},
		);
	});

	describe('deleteExecutionsByFilter', () => {
		test('should delete binary data', async () => {
			const workflowId = nanoid();

			jest.spyOn(executionRepository, 'createQueryBuilder').mockReturnValue(
				mock<SelectQueryBuilder<ExecutionEntity>>({
					select: jest.fn().mockReturnThis(),
					andWhere: jest.fn().mockReturnThis(),
					getMany: jest.fn().mockResolvedValue([{ id: '1', workflowId }]),
				}),
			);

			await executionRepository.deleteExecutionsByFilter({ id: '1' }, ['1'], { ids: ['1'] });

			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([{ executionId: '1', workflowId }]);
		});
	});
});
