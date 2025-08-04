'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const nanoid_1 = require('nanoid');
const mocking_1 = require('@test/mocking');
describe('ExecutionRepository', () => {
	const entityManager = (0, mocking_1.mockEntityManager)(db_1.ExecutionEntity);
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
		logging: { outputs: ['console'], scopes: [] },
	});
	const binaryDataService = (0, backend_test_utils_1.mockInstance)(n8n_core_1.BinaryDataService);
	const executionRepository = di_1.Container.get(db_1.ExecutionRepository);
	const mockDate = new Date('2023-12-28 12:34:56.789Z');
	beforeAll(() => {
		jest.clearAllMocks();
		jest.useFakeTimers().setSystemTime(mockDate);
	});
	afterAll(() => jest.useRealTimers());
	describe('getWaitingExecutions()', () => {
		test.each(['sqlite', 'postgresdb'])(
			'on %s, should be called with expected args',
			async (dbType) => {
				globalConfig.database.type = dbType;
				entityManager.find.mockResolvedValueOnce([]);
				await executionRepository.getWaitingExecutions();
				expect(entityManager.find).toHaveBeenCalledWith(db_1.ExecutionEntity, {
					order: { waitTill: 'ASC' },
					select: ['id', 'waitTill'],
					where: {
						status: (0, typeorm_1.Not)('crashed'),
						waitTill: (0, typeorm_1.LessThanOrEqual)(
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
			const workflowId = (0, nanoid_1.nanoid)();
			jest.spyOn(executionRepository, 'createQueryBuilder').mockReturnValue(
				(0, jest_mock_extended_1.mock)({
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
		test.each(['sqlite', 'postgresdb', 'mysqldb'])(
			'should update execution and data in transaction on %s',
			async (dbType) => {
				globalConfig.database.type = dbType;
				globalConfig.database.sqlite = (0, jest_mock_extended_1.mock)({ poolSize: 1 });
				const executionId = '1';
				const execution = (0, jest_mock_extended_1.mock)({
					id: executionId,
					data: (0, jest_mock_extended_1.mock)(),
					workflowData: (0, jest_mock_extended_1.mock)(),
					status: 'success',
				});
				const txCallback = jest.fn();
				entityManager.transaction.mockImplementation(async (cb) => {
					await cb(entityManager);
					txCallback();
				});
				await executionRepository.updateExistingExecution(executionId, execution);
				expect(entityManager.transaction).toHaveBeenCalled();
				expect(entityManager.update).toHaveBeenCalledWith(
					db_1.ExecutionEntity,
					{ id: executionId },
					expect.objectContaining({ status: 'success' }),
				);
				expect(txCallback).toHaveBeenCalledTimes(1);
			},
		);
	});
});
//# sourceMappingURL=execution.repository.test.js.map
