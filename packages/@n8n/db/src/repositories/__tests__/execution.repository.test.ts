/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GlobalConfig } from '@n8n/config';
import type { SqliteConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { In, LessThan, LessThanOrEqual, And, Not } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { BinaryDataService } from 'n8n-core';
import type { IRunExecutionData, IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { ExecutionEntity } from '../../entities';
import type { IExecutionResponse } from '../../entities/types-db';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { ExecutionRepository } from '../execution.repository';

const GREATER_THAN_MAX_UPDATE_THRESHOLD = 901;

/**
 * TODO: add tests for all the other methods
 */
describe('ExecutionRepository', () => {
	const entityManager = mockEntityManager(ExecutionEntity);
	const globalConfig = mockInstance(GlobalConfig, {
		logging: { outputs: ['console'], scopes: [] },
	});
	mockInstance(BinaryDataService);
	const executionRepository = Container.get(ExecutionRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('getExecutionsForPublicApi', () => {
		const defaultLimit = 10;
		const defaultQuery = {
			select: [
				'id',
				'mode',
				'retryOf',
				'retrySuccessId',
				'startedAt',
				'stoppedAt',
				'workflowId',
				'waitTill',
				'finished',
				'status',
			],
			where: {},
			order: { id: 'DESC' },
			take: defaultLimit,
		};

		test('should get executions matching all filter parameters', async () => {
			const params = {
				limit: defaultLimit,
				lastId: '3',
				workflowIds: ['3', '4'],
			};
			const mockEntities = [{ id: '1' }, { id: '2' }];

			entityManager.find.mockResolvedValueOnce(mockEntities);
			const result = await executionRepository.getExecutionsForPublicApi(params);

			expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
				...defaultQuery,
				where: {
					id: LessThan(params.lastId),
					workflowId: In(params.workflowIds),
				},
			});
			expect(result.length).toBe(mockEntities.length);
			expect(result[0].id).toEqual(mockEntities[0].id);
		});

		test('should get executions matching the workflowIds filter', async () => {
			const params = {
				limit: 10,
				workflowIds: ['3', '4'],
			};
			const mockEntities = [{ id: '1' }, { id: '2' }];

			entityManager.find.mockResolvedValueOnce(mockEntities);
			const result = await executionRepository.getExecutionsForPublicApi(params);

			expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
				...defaultQuery,
				where: {
					workflowId: In(params.workflowIds),
				},
			});
			expect(result.length).toBe(mockEntities.length);
			expect(result[0].id).toEqual(mockEntities[0].id);
		});

		describe('with id filters', () => {
			test.each`
				lastId       | excludedExecutionsIds | expectedIdCondition
				${'5'}       | ${['2', '3']}         | ${And(LessThan('5'), Not(In(['2', '3'])))}
				${'5'}       | ${[]}                 | ${LessThan('5')}
				${'5'}       | ${undefined}          | ${LessThan('5')}
				${undefined} | ${['2', '3']}         | ${Not(In(['2', '3']))}
				${undefined} | ${[]}                 | ${undefined}
				${undefined} | ${undefined}          | ${undefined}
			`(
				'should find with id less than "$lastId" and not in "$excludedExecutionsIds"',
				async ({ lastId, excludedExecutionsIds, expectedIdCondition }) => {
					const params = {
						limit: defaultLimit,
						...(lastId ? { lastId } : {}),
						...(excludedExecutionsIds ? { excludedExecutionsIds } : {}),
					};
					const mockEntities = [{ id: '1' }, { id: '2' }];
					entityManager.find.mockResolvedValueOnce(mockEntities);
					const result = await executionRepository.getExecutionsForPublicApi(params);

					expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
						...defaultQuery,
						where: {
							...(expectedIdCondition ? { id: expectedIdCondition } : {}),
						},
					});
					expect(result.length).toBe(mockEntities.length);
					expect(result[0].id).toEqual(mockEntities[0].id);
				},
			);
		});

		describe('with status filter', () => {
			test.each`
				filterStatus  | entityStatus
				${'canceled'} | ${'canceled'}
				${'error'}    | ${In(['error', 'crashed'])}
				${'running'}  | ${'running'}
				${'success'}  | ${'success'}
				${'waiting'}  | ${'waiting'}
			`('should find all "$filterStatus" executions', async ({ filterStatus, entityStatus }) => {
				const mockEntities = [{ id: '1' }, { id: '2' }];

				entityManager.find.mockResolvedValueOnce(mockEntities);
				const result = await executionRepository.getExecutionsForPublicApi({
					limit: defaultLimit,
					status: filterStatus,
				});

				expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
					...defaultQuery,
					where: { status: entityStatus },
				});
				expect(result.length).toBe(mockEntities.length);
				expect(result[0].id).toEqual(mockEntities[0].id);
			});

			test.each`
				filterStatus
				${'crashed'}
				${'new'}
				${'unknown'}
			`(
				'should find all executions and ignore status filter "$filterStatus"',
				async ({ filterStatus }) => {
					const mockEntities = [{ id: '1' }, { id: '2' }];

					entityManager.find.mockResolvedValueOnce(mockEntities);
					const result = await executionRepository.getExecutionsForPublicApi({
						limit: defaultLimit,
						status: filterStatus,
					});

					expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
						...defaultQuery,
						where: {},
					});
					expect(result.length).toBe(mockEntities.length);
					expect(result[0].id).toEqual(mockEntities[0].id);
				},
			);
		});

		describe('with includeData parameter', () => {
			test('should not fetch executionData and metadata relations when includeData is false', async () => {
				const params = {
					limit: defaultLimit,
					includeData: false,
				};
				const mockEntities = [{ id: '1' }, { id: '2' }];

				entityManager.find.mockResolvedValueOnce(mockEntities);
				const result = await executionRepository.getExecutionsForPublicApi(params);

				expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
					...defaultQuery,
					where: {},
				});
				expect(result.length).toBe(mockEntities.length);
			});

			test('should fetch executionData and metadata relations when includeData is true', async () => {
				const params = {
					limit: defaultLimit,
					includeData: true,
				};
				const mockEntities = [
					{
						id: '1',
						executionData: { data: '[]' },
						metadata: [],
					},
					{
						id: '2',
						executionData: { data: '[]' },
						metadata: [],
					},
				];

				entityManager.find.mockResolvedValueOnce(mockEntities);
				const result = await executionRepository.getExecutionsForPublicApi(params);

				expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
					...defaultQuery,
					where: {},
					relations: ['executionData', 'metadata'],
				});
				expect(result.length).toBe(mockEntities.length);
			});
		});
	});

	describe('getExecutionsCountForPublicApi', () => {
		test('should get executions matching all filter parameters', async () => {
			const mockCount = 20;
			const params = {
				limit: 10,
				lastId: '3',
				workflowIds: ['3', '4'],
			};

			entityManager.count.mockResolvedValueOnce(mockCount);
			const result = await executionRepository.getExecutionsCountForPublicApi(params);

			expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
				where: {
					id: LessThan(params.lastId),
					workflowId: In(params.workflowIds),
				},
				take: params.limit,
			});
			expect(result).toBe(mockCount);
		});

		test('should get executions matching the workflowIds filter', async () => {
			const mockCount = 12;
			const params = {
				limit: 10,
				workflowIds: ['7', '8'],
			};

			entityManager.count.mockResolvedValueOnce(mockCount);
			const result = await executionRepository.getExecutionsCountForPublicApi(params);

			expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
				where: {
					workflowId: In(params.workflowIds),
				},
				take: params.limit,
			});
			expect(result).toBe(mockCount);
		});

		describe('with id filters', () => {
			test.each`
				lastId       | excludedExecutionsIds | expectedIdCondition
				${'5'}       | ${['2', '3']}         | ${And(LessThan('5'), Not(In(['2', '3'])))}
				${'5'}       | ${[]}                 | ${LessThan('5')}
				${'5'}       | ${undefined}          | ${LessThan('5')}
				${undefined} | ${['2', '3']}         | ${Not(In(['2', '3']))}
				${undefined} | ${[]}                 | ${undefined}
				${undefined} | ${undefined}          | ${undefined}
			`(
				'should find with id less than "$lastId" and not in "$excludedExecutionsIds"',
				async ({ lastId, excludedExecutionsIds, expectedIdCondition }) => {
					const mockCount = 15;
					const params = {
						limit: 10,
						...(lastId ? { lastId } : {}),
						...(excludedExecutionsIds ? { excludedExecutionsIds } : {}),
					};
					entityManager.count.mockResolvedValueOnce(mockCount);
					const result = await executionRepository.getExecutionsCountForPublicApi(params);

					expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
						where: {
							...(expectedIdCondition ? { id: expectedIdCondition } : {}),
						},
						take: params.limit,
					});
					expect(result).toBe(mockCount);
				},
			);
		});

		describe('with status filter', () => {
			test.each`
				filterStatus  | entityStatus
				${'canceled'} | ${'canceled'}
				${'error'}    | ${In(['error', 'crashed'])}
				${'running'}  | ${'running'}
				${'success'}  | ${'success'}
				${'waiting'}  | ${'waiting'}
			`('should retrieve all $filterStatus executions', async ({ filterStatus, entityStatus }) => {
				const limit = 10;
				const mockCount = 20;

				entityManager.count.mockResolvedValueOnce(mockCount);
				const result = await executionRepository.getExecutionsCountForPublicApi({
					limit,
					status: filterStatus,
				});

				expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
					where: { status: entityStatus },
					take: limit,
				});

				expect(result).toBe(mockCount);
			});

			test.each`
				filterStatus
				${'crashed'}
				${'new'}
				${'unknown'}
			`(
				'should find all executions and ignore status filter "$filterStatus"',
				async ({ filterStatus }) => {
					const limit = 10;
					const mockCount = 20;

					entityManager.count.mockResolvedValueOnce(mockCount);
					const result = await executionRepository.getExecutionsCountForPublicApi({
						limit,
						status: filterStatus,
					});

					expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
						where: {},
						take: limit,
					});

					expect(result).toBe(mockCount);
				},
			);
		});
	});

	describe('getConcurrentExecutionsCount', () => {
		test('should count running executions with mode webhook or trigger', async () => {
			const mockCount = 5;
			entityManager.count.mockResolvedValueOnce(mockCount);

			const result = await executionRepository.getConcurrentExecutionsCount();

			expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
				where: { status: 'running', mode: In(['webhook', 'trigger']) },
			});
			expect(result).toBe(mockCount);
		});
	});

	describe('markAsCrashed', () => {
		test('should batch updates above a threshold', async () => {
			// Generates a list of many execution ids.
			// NOTE: GREATER_THAN_MAX_UPDATE_THRESHOLD is selected to be just above the default threshold.
			const manyExecutionsToMarkAsCrashed: string[] = Array(GREATER_THAN_MAX_UPDATE_THRESHOLD)
				.fill(undefined)
				.map((_, i) => i.toString());
			await executionRepository.markAsCrashed(manyExecutionsToMarkAsCrashed);
			expect(entityManager.update).toBeCalledTimes(2);
		});

		test('should clear waitTill when marking executions as crashed', async () => {
			const executionIds = ['1', '2'];

			await executionRepository.markAsCrashed(executionIds);

			expect(entityManager.update).toHaveBeenCalledWith(
				ExecutionEntity,
				{ id: In(executionIds) },
				expect.objectContaining({ status: 'crashed', waitTill: null }),
			);
		});
	});

	describe('stopDuringRun', () => {
		test('should update execution with ManualExecutionCancelledError', async () => {
			const mockExecution = {
				id: '123',
				data: {
					resultData: {
						runData: {},
					},
				},
			} as unknown;

			const updateSpy = jest.spyOn(executionRepository, 'updateExistingExecution');

			const result = await executionRepository.stopDuringRun(mockExecution as IExecutionResponse);

			// Verify updateExistingExecution was called with the execution
			expect(updateSpy).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					status: 'canceled',
					stoppedAt: expect.any(Date),
					waitTill: null,
					data: expect.objectContaining({
						resultData: expect.objectContaining({
							error: expect.objectContaining({
								message: 'The execution was cancelled manually',
							}),
						}),
					}),
				}),
			);

			// Verify the execution was marked as canceled
			expect(result.status).toBe('canceled');
			expect(result.data.resultData.error?.message).toBe('The execution was cancelled manually');
		});
	});

	describe('setRunning', () => {
		beforeEach(() => {
			entityManager.transaction.mockImplementation(async (fn: unknown) => {
				return await (fn as (em: typeof entityManager) => Promise<unknown>)(entityManager);
			});
		});

		test('should set startedAt when not already set', async () => {
			const executionId = '123';

			entityManager.findOneBy.mockResolvedValueOnce({ startedAt: null });

			const result = await executionRepository.setRunning(executionId);

			expect(entityManager.transaction).toHaveBeenCalled();
			expect(entityManager.findOneBy).toHaveBeenCalledWith(ExecutionEntity, {
				id: executionId,
			});
			expect(entityManager.update).toHaveBeenCalledWith(
				ExecutionEntity,
				{ id: executionId },
				{ status: 'running', startedAt: expect.any(Date), waitTill: null },
			);
			expect(result).toBeInstanceOf(Date);
		});

		test('should preserve existing startedAt for resumed executions', async () => {
			const executionId = '456';
			const existingStartedAt = new Date('2025-12-02T09:04:47.150Z');

			entityManager.findOneBy.mockResolvedValueOnce({ startedAt: existingStartedAt });

			const result = await executionRepository.setRunning(executionId);

			expect(entityManager.transaction).toHaveBeenCalled();
			expect(entityManager.update).toHaveBeenCalledWith(
				ExecutionEntity,
				{ id: executionId },
				{ status: 'running', startedAt: existingStartedAt, waitTill: null },
			);
			expect(result).toBe(existingStartedAt);
		});
	});

	describe('cancelMany', () => {
		test('should clear waitTill when canceling executions', async () => {
			const executionIds = ['1', '2', '3'];

			await executionRepository.cancelMany(executionIds);

			expect(entityManager.update).toHaveBeenCalledWith(
				ExecutionEntity,
				{ id: In(executionIds) },
				expect.objectContaining({ status: 'canceled', waitTill: null }),
			);
		});
	});

	describe('stopBeforeRun', () => {
		test('should clear waitTill when stopping execution before run', async () => {
			const execution = mock<IExecutionResponse>({
				id: '1',
				status: 'waiting',
				waitTill: new Date('2025-01-01T00:00:00.000Z'),
			});

			await executionRepository.stopBeforeRun(execution);

			expect(execution.waitTill).toBeNull();
			expect(execution.status).toBe('canceled');
			expect(entityManager.update).toHaveBeenCalledWith(
				ExecutionEntity,
				{ id: '1' },
				expect.objectContaining({ status: 'canceled', waitTill: null }),
			);
		});
	});

	describe('getWaitingExecutions', () => {
		const mockDate = new Date('2023-12-28 12:34:56.789Z');

		beforeAll(() => jest.useFakeTimers().setSystemTime(mockDate));
		afterAll(() => jest.useRealTimers());

		test.each(['sqlite', 'postgresdb'] as const)(
			'on %s, should only return executions with status=waiting',
			async (dbType) => {
				globalConfig.database.type = dbType;
				entityManager.find.mockResolvedValueOnce([]);

				await executionRepository.getWaitingExecutions();

				expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
					order: { waitTill: 'ASC' },
					select: ['id', 'waitTill'],
					where: {
						status: 'waiting',
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
			const binaryDataService = Container.get(BinaryDataService);

			jest.spyOn(executionRepository, 'createQueryBuilder').mockReturnValue(
				mock<SelectQueryBuilder<ExecutionEntity>>({
					select: jest.fn().mockReturnThis(),
					andWhere: jest.fn().mockReturnThis(),
					getMany: jest.fn().mockResolvedValue([{ id: '1', workflowId }]),
				}),
			);

			await executionRepository.deleteExecutionsByFilter({
				filters: { id: '1' },
				accessibleWorkflowIds: ['1'],
				deleteConditions: { ids: ['1'] },
			});

			expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
				{ type: 'execution', executionId: '1', workflowId },
			]);
		});
	});

	describe('updateExistingExecution', () => {
		test.each(['sqlite', 'postgresdb'] as const)(
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
				entityManager.transaction.mockImplementation(async (fn: unknown) => {
					await (fn as (em: typeof entityManager) => Promise<unknown>)(entityManager);
					txCallback();
				});
				entityManager.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

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
