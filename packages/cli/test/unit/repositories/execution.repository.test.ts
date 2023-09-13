import { Container } from 'typedi';
import { DataSource, EntityManager } from 'typeorm';
import { mock } from 'jest-mock-extended';
import { mockInstance } from '../../integration/shared/utils/';
import { ExecutionRepository } from '@/databases/repositories';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { TIME } from '@/constants';
import { DateUtils } from 'typeorm/util/DateUtils';

jest.mock('typeorm/util/DateUtils');

const { objectContaining } = expect;

describe('ExecutionRepository', () => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, { manager: entityManager });
	dataSource.getMetadata.mockReturnValue(mock());
	Object.assign(entityManager, { connection: dataSource });

	const executionRepository = Container.get(ExecutionRepository);

	beforeAll(() => {
		Container.set(ExecutionRepository, executionRepository);
		LoggerProxy.init(getLogger());
	});

	beforeEach(() => {
		config.load(config.default);

		jest.clearAllMocks();
	});

	describe('pruneBySoftDeleting()', () => {
		test('should soft-delete executions based on batch size', async () => {
			config.set('executions.pruneDataMaxCount', 0); // disable prune-by-count path

			executionRepository.deletionBatchSize = 5;

			const find = jest.spyOn(ExecutionRepository.prototype, 'find');
			entityManager.find.mockResolvedValueOnce([]);

			await executionRepository.pruneBySoftDeleting();

			expect(find.mock.calls[0][0]).toEqual(
				objectContaining({ take: executionRepository.deletionBatchSize }),
			);
		});

		test('should limit pruning based on EXECUTIONS_DATA_PRUNE_MAX_COUNT', async () => {
			const maxCount = 1;

			config.set('executions.pruneDataMaxCount', maxCount);

			const find = jest.spyOn(ExecutionRepository.prototype, 'find');
			entityManager.find.mockResolvedValue([]);

			await executionRepository.pruneBySoftDeleting();

			expect(find.mock.calls[0][0]).toEqual(objectContaining({ skip: maxCount }));
		});

		test('should limit pruning based on EXECUTIONS_DATA_MAX_AGE', async () => {
			const maxAge = 5; // hours

			config.set('executions.pruneDataMaxCount', 0); // disable prune-by-count path
			config.set('executions.pruneDataMaxAge', 5);

			entityManager.find.mockResolvedValue([]);

			const dateFormat = jest.spyOn(DateUtils, 'mixedDateToUtcDatetimeString');

			const now = Date.now();

			await executionRepository.pruneBySoftDeleting();

			const argDate = dateFormat.mock.calls[0][0];
			const difference = now - argDate.valueOf();

			expect(Math.round(difference / TIME.HOUR)).toBe(maxAge);
		});
	});
});
