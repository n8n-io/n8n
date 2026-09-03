/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GlobalConfig } from '@n8n/config';
import type { SqliteConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { In, LessThan, LessThanOrEqual, MoreThanOrEqual, And, Not } from '@n8n/typeorm';
import { DateUtils } from '@n8n/typeorm/util/DateUtils';
import { BinaryDataService } from 'n8n-core';
import type { IRunExecutionData, IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { mock } from 'vitest-mock-extended';

import { ExecutionEntity, type WorkflowEntity } from '../../entities';
import type { IExecutionResponse } from '../../entities/types-db';
import { TransactionRunner } from '../../services/transaction';
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
	const transactionRunner = mock<TransactionRunner>();
	Container.set(TransactionRunner, transactionRunner);
	const executionRepository = Container.get(ExecutionRepository);

	beforeEach(() => {
		vi.resetAllMocks();
		transactionRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
	});

	describe('countInWorkflows', () => {
		test('should get executions matching all filter parameters', async () => {
			const mockCount = 20;
			const workflowIds = ['3', '4'];
			const options = {
				limit: 10,
				lastId: '3',
			};

			entityManager.count.mockResolvedValueOnce(mockCount);
			const result = await executionRepository.countInWorkflows(workflowIds, options);

			expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
				where: {
					id: LessThan(options.lastId),
					workflowId: In(workflowIds),
				},
				take: options.limit,
			});
			expect(result).toBe(mockCount);
		});

		test('should get executions matching the workflowIds filter', async () => {
			const mockCount = 12;
			const workflowIds = ['7', '8'];
			const options = {
				limit: 10,
			};

			entityManager.count.mockResolvedValueOnce(mockCount);
			const result = await executionRepository.countInWorkflows(workflowIds, options);

			expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
				where: {
					workflowId: In(workflowIds),
				},
				take: options.limit,
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
					const workflowIds = ['wf-1'];
					const options = {
						limit: 10,
						...(lastId ? { lastId } : {}),
						...(excludedExecutionsIds ? { excludedExecutionsIds } : {}),
					};
					entityManager.count.mockResolvedValueOnce(mockCount);
					const result = await executionRepository.countInWorkflows(workflowIds, options);

					expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
						where: {
							workflowId: In(workflowIds),
							...(expectedIdCondition ? { id: expectedIdCondition } : {}),
						},
						take: options.limit,
					});
					expect(result).toBe(mockCount);
				},
			);
		});

		describe('with status filter', () => {
			test.each`
				filterStatus  | entityStatus
				${'canceled'} | ${'canceled'}
				${'crashed'}  | ${'crashed'}
				${'error'}    | ${'error'}
				${'new'}      | ${'new'}
				${'running'}  | ${'running'}
				${'success'}  | ${'success'}
				${'unknown'}  | ${'unknown'}
				${'waiting'}  | ${'waiting'}
			`('should retrieve all $filterStatus executions', async ({ filterStatus, entityStatus }) => {
				const limit = 10;
				const mockCount = 20;
				const workflowIds = ['wf-1'];

				entityManager.count.mockResolvedValueOnce(mockCount);
				const result = await executionRepository.countInWorkflows(workflowIds, {
					limit,
					status: filterStatus,
				});

				expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
					where: { status: entityStatus, workflowId: In(workflowIds) },
					take: limit,
				});

				expect(result).toBe(mockCount);
			});

			test('should find all executions without status filter', async () => {
				const limit = 10;
				const mockCount = 20;
				const workflowIds = ['wf-1'];

				entityManager.count.mockResolvedValueOnce(mockCount);
				const result = await executionRepository.countInWorkflows(workflowIds, { limit });

				expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
					where: { workflowId: In(workflowIds) },
					take: limit,
				});

				expect(result).toBe(mockCount);
			});
		});

		describe('with startedAfter and startedBefore filters', () => {
			const startedAfter = '2024-01-01T00:00:00.000Z';
			const startedBefore = '2024-12-31T23:59:59.999Z';
			const startedAfterCondition = MoreThanOrEqual(
				DateUtils.mixedDateToUtcDatetimeString(new Date(startedAfter)),
			);
			const startedBeforeCondition = LessThanOrEqual(
				DateUtils.mixedDateToUtcDatetimeString(new Date(startedBefore)),
			);

			test('should filter executions started after a given time', async () => {
				const limit = 10;
				const mockCount = 4;
				const workflowIds = ['wf-1'];

				entityManager.count.mockResolvedValueOnce(mockCount);
				const result = await executionRepository.countInWorkflows(workflowIds, {
					limit,
					startedAfter,
				});

				expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
					where: {
						workflowId: In(workflowIds),
						startedAt: And(startedAfterCondition),
					},
					take: limit,
				});
				expect(result).toBe(mockCount);
			});

			test('should filter executions started before a given time', async () => {
				const limit = 10;
				const mockCount = 6;
				const workflowIds = ['wf-1'];

				entityManager.count.mockResolvedValueOnce(mockCount);
				const result = await executionRepository.countInWorkflows(workflowIds, {
					limit,
					startedBefore,
				});

				expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
					where: {
						workflowId: In(workflowIds),
						startedAt: And(startedBeforeCondition),
					},
					take: limit,
				});
				expect(result).toBe(mockCount);
			});

			test('should filter executions started within a time range', async () => {
				const limit = 10;
				const mockCount = 3;
				const workflowIds = ['wf-1'];

				entityManager.count.mockResolvedValueOnce(mockCount);
				const result = await executionRepository.countInWorkflows(workflowIds, {
					limit,
					startedAfter,
					startedBefore,
				});

				expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
					where: {
						workflowId: In(workflowIds),
						startedAt: And(startedAfterCondition, startedBeforeCondition),
					},
					take: limit,
				});
				expect(result).toBe(mockCount);
			});
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
		const crashableRow = (id: string) =>
			mock<ExecutionEntity>({
				id,
				workflowId: `workflow-${id}`,
				mode: 'trigger',
				workflow: mock<WorkflowEntity>({ id: `workflow-${id}`, name: `Workflow ${id}` }),
			});

		const executionIdsOfLength = (length: number) =>
			Array(length)
				.fill(undefined)
				.map((_, i) => i.toString());

		test('should batch updates above a threshold and report each batch as it transitions', async () => {
			// NOTE: GREATER_THAN_MAX_UPDATE_THRESHOLD is selected to be just above the default threshold.
			const manyExecutionsToMarkAsCrashed = executionIdsOfLength(GREATER_THAN_MAX_UPDATE_THRESHOLD);
			entityManager.find.mockResolvedValue([crashableRow('1')]);
			const reported: string[][] = [];

			const crashed = await executionRepository.markAsCrashed(
				manyExecutionsToMarkAsCrashed,
				(batch) => reported.push(batch.map(({ id }) => id)),
			);

			expect(entityManager.update).toBeCalledTimes(2);
			expect(reported).toEqual([['1'], ['1']]);
			expect(crashed).toHaveLength(2);
		});

		test('should clear waitTill when marking executions as crashed', async () => {
			const executionIds = ['1', '2'];
			entityManager.find.mockResolvedValue(executionIds.map(crashableRow));

			await executionRepository.markAsCrashed(executionIds);

			expect(entityManager.update).toHaveBeenCalledWith(
				ExecutionEntity,
				{ id: In(executionIds), status: In(['new', 'running', 'unknown']) },
				expect.objectContaining({ status: 'crashed', waitTill: null }),
			);
		});

		test('should report the workflow, name and mode of each execution it transitioned', async () => {
			entityManager.find.mockResolvedValue([crashableRow('1')]);

			const crashed = await executionRepository.markAsCrashed(['1', '2']);

			expect(crashed).toEqual([
				{
					id: '1',
					workflowId: 'workflow-1',
					workflowName: 'Workflow 1',
					mode: 'trigger',
				},
			]);
		});

		test('should only report rows carrying the `stoppedAt` it wrote', async () => {
			entityManager.find.mockResolvedValue([crashableRow('1')]);

			await executionRepository.markAsCrashed(['1']);

			const updateValues = entityManager.update.mock.calls[0][2] as { stoppedAt: Date };
			const findOptions = entityManager.find.mock.calls[0][1];

			expect(findOptions).toMatchObject({
				where: { id: In(['1']), status: 'crashed', stoppedAt: updateValues.stoppedAt },
			});
		});

		test('should report soft-deleted executions it transitioned', async () => {
			entityManager.find.mockResolvedValue([crashableRow('1')]);

			await executionRepository.markAsCrashed(['1']);

			expect(entityManager.find).toHaveBeenCalledWith(
				ExecutionEntity,
				expect.objectContaining({ withDeleted: true }),
			);
		});

		test('should collapse duplicated ids before batching', async () => {
			const oneBatchWorthOfIds = executionIdsOfLength(GREATER_THAN_MAX_UPDATE_THRESHOLD - 1);
			entityManager.find.mockResolvedValue([crashableRow('1')]);

			await executionRepository.markAsCrashed([...oneBatchWorthOfIds, '0']);

			expect(entityManager.update).toBeCalledTimes(1);
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

		beforeAll(() => vi.useFakeTimers().setSystemTime(mockDate));
		afterAll(() => vi.useRealTimers());

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

			vi.spyOn(executionRepository, 'createQueryBuilder').mockReturnValue(
				mock<SelectQueryBuilder<ExecutionEntity>>({
					select: vi.fn().mockReturnThis(),
					andWhere: vi.fn().mockReturnThis(),
					getMany: vi.fn().mockResolvedValue([{ id: '1', workflowId }]),
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

				const txCallback = vi.fn();
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
