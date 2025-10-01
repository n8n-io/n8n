/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Container } from '@n8n/di';
import { In, LessThan, And, Not } from '@n8n/typeorm';

import type { IExecutionResponse } from 'entities/types-db';

import { ExecutionEntity } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ExecutionRepository } from '../execution.repository';

const GREATER_THAN_MAX_UPDATE_THRESHOLD = 901;

/**
 * TODO: add tests for all the other methods
 * TODO: getExecutionsForPublicApi -> add test cases for the `includeData` toggle
 */
describe('ExecutionRepository', () => {
	const entityManager = mockEntityManager(ExecutionEntity);
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
			relations: ['executionData'],
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
});
