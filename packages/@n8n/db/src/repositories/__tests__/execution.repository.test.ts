import { Container } from '@n8n/di';
import { In, LessThan } from '@n8n/typeorm';

import { ExecutionEntity } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ExecutionRepository } from '../execution.repository';

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
		test('should get executions matching all filter parameters', async () => {
			const limit = 10;
			const params = {
				limit: 10,
				lastId: '3',
				workflowIds: ['3', '4'],
			};
			const mockEntities = [{ id: '1' }, { id: '2' }];

			entityManager.find.mockResolvedValueOnce(mockEntities);
			const result = await executionRepository.getExecutionsForPublicApi(params);

			expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
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
				where: {
					id: LessThan(params.lastId),
					workflowId: In(params.workflowIds),
				},
				order: { id: 'DESC' },
				take: limit,
				relations: ['executionData'],
			});
			expect(result.length).toBe(mockEntities.length);
			expect(result[0].id).toEqual(mockEntities[0].id);
		});

		test('should get executions matching the workflowIds filter', async () => {
			const limit = 10;
			const params = {
				limit: 10,
				workflowIds: ['3', '4'],
			};
			const mockEntities = [{ id: '1' }, { id: '2' }];

			entityManager.find.mockResolvedValueOnce(mockEntities);
			const result = await executionRepository.getExecutionsForPublicApi(params);

			expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
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
				where: {
					workflowId: In(params.workflowIds),
				},
				order: { id: 'DESC' },
				take: limit,
				relations: ['executionData'],
			});
			expect(result.length).toBe(mockEntities.length);
			expect(result[0].id).toEqual(mockEntities[0].id);
		});

		test('should get executions with id less than the passed `lastId`', async () => {
			const limit = 10;
			const params = {
				limit: 10,
				lastId: '3',
			};
			const mockEntities = [{ id: '1' }, { id: '2' }];

			entityManager.find.mockResolvedValueOnce(mockEntities);
			const result = await executionRepository.getExecutionsForPublicApi(params);

			expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
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
				where: {
					id: LessThan(params.lastId),
				},
				order: { id: 'DESC' },
				take: limit,
				relations: ['executionData'],
			});
			expect(result.length).toBe(mockEntities.length);
			expect(result[0].id).toEqual(mockEntities[0].id);
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
				const limit = 10;
				const mockEntities = [{ id: '1' }, { id: '2' }];

				entityManager.find.mockResolvedValueOnce(mockEntities);
				const result = await executionRepository.getExecutionsForPublicApi({
					limit,
					status: filterStatus,
				});

				expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
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
					where: { status: entityStatus },
					order: { id: 'DESC' },
					take: limit,
					relations: ['executionData'],
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
					const limit = 10;
					const mockEntities = [{ id: '1' }, { id: '2' }];

					entityManager.find.mockResolvedValueOnce(mockEntities);
					const result = await executionRepository.getExecutionsForPublicApi({
						limit,
						status: filterStatus,
					});

					expect(entityManager.find).toHaveBeenCalledWith(ExecutionEntity, {
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
						take: limit,
						relations: ['executionData'],
					});
					expect(result.length).toBe(mockEntities.length);
					expect(result[0].id).toEqual(mockEntities[0].id);
				},
			);
		});
	});

	describe('getExecutionsCountForPublicApi', () => {
		test('should get executions matching the all filter parameters', async () => {
			const limit = 10;
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
				take: limit,
			});
			expect(result).toBe(mockCount);
		});

		test('should get executions matching the lastId filter', async () => {
			const limit = 10;
			const mockCount = 15;
			const params = {
				limit: 10,
				lastId: '5',
			};

			entityManager.count.mockResolvedValueOnce(mockCount);
			const result = await executionRepository.getExecutionsCountForPublicApi(params);

			expect(entityManager.count).toHaveBeenCalledWith(ExecutionEntity, {
				where: {
					id: LessThan(params.lastId),
				},
				take: limit,
			});
			expect(result).toBe(mockCount);
		});

		test('should get executions matching the workflowIds filter', async () => {
			const limit = 10;
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
				take: limit,
			});
			expect(result).toBe(mockCount);
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
});
