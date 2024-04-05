import Container from 'typedi';

import type { SelectQueryBuilder } from '@n8n/typeorm';
import { Not, LessThanOrEqual } from '@n8n/typeorm';

import config from '@/config';
import { ExecutionEntity } from '@db/entities/ExecutionEntity';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { mockEntityManager } from '../../shared/mocking';
import { mockInstance } from '../../shared/mocking';
import { BinaryDataService } from 'n8n-core';
import { nanoid } from 'nanoid';
import { mock } from 'jest-mock-extended';

describe('ExecutionRepository', () => {
	const entityManager = mockEntityManager(ExecutionEntity);
	const binaryDataService = mockInstance(BinaryDataService);
	const executionRepository = Container.get(ExecutionRepository);
	const mockDate = new Date('2023-12-28 12:34:56.789Z');

	beforeAll(() => {
		jest.clearAllMocks();
		jest.useFakeTimers().setSystemTime(mockDate);
	});

	afterAll(() => jest.useRealTimers());

	describe('getWaitingExecutions()', () => {
		test.each(['sqlite', 'postgres'])(
			'on %s, should be called with expected args',
			async (dbType) => {
				jest.spyOn(config, 'getEnv').mockReturnValueOnce(dbType);
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
