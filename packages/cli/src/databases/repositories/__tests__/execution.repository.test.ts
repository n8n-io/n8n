import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { SqliteConfig } from '@n8n/config/src/configs/database.config';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionEntity, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { Not, LessThanOrEqual } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { BinaryDataService } from 'n8n-core';
import type { IRunExecutionData, IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { mockEntityManager } from '@test/mocking';

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

	describe('updateExistingExecution', () => {
		test.each(['sqlite', 'postgresdb', 'mysqldb'] as const)(
			'should update execution and data in transaction on %s',
			async (dbType) => {
				globalConfig.database.type = dbType;
				globalConfig.database.sqlite = mock<SqliteConfig>({ poolSize: 1 });

				const executionId = '1';
				const execution = mock<IExecutionResponse>({
					id: executionId,
					data: mock<IRunExecutionData>(),
					workflowData: mock<IWorkflowBase>(),
					status: 'success',
				});

				const txCallback = jest.fn();
				entityManager.transaction.mockImplementation(async (cb) => {
					// @ts-expect-error Mock
					await cb(entityManager);
					txCallback();
				});

				await executionRepository.updateExistingExecution(executionId, execution);

				expect(entityManager.transaction).toHaveBeenCalled();
				expect(entityManager.update).toHaveBeenCalledWith(
					ExecutionEntity,
					{ id: executionId },
					expect.objectContaining({ status: 'success' }),
				);
				expect(txCallback).toHaveBeenCalledTimes(1);
			},
		);
	});
});
