import { Container } from 'typedi';
import { DataSource, EntityManager } from 'typeorm';
import { mock } from 'jest-mock-extended';
import { mockInstance } from '../../integration/shared/utils/';
import { ExecutionRepository } from '@/databases/repositories';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { TIME } from '@/constants';

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
			config.set('executions.pruneDataMaxCount', 0); // disable path

			executionRepository.setDeletionBatchSize(5);

			const find = jest.spyOn(ExecutionRepository.prototype, 'find');
			entityManager.find.mockResolvedValueOnce([]);

			await executionRepository.pruneBySoftDeleting();

			expect(find.mock.calls[0][0]).toEqual(
				objectContaining({ take: executionRepository.getDeletionBatchSize() }),
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
	});

	describe('pruningLimit()', () => {
		test('should limit pruning based on EXECUTIONS_DATA_MAX_AGE', async () => {
			config.set('executions.pruneDataMaxCount', 0); // disable path

			const maxAge = 5; // hours

			config.set('executions.pruneDataMaxAge', maxAge);

			const now = Date.now();
			const limit = executionRepository.pruningLimit();

			const difference = now - limit.valueOf();

			expect(difference / TIME.HOUR).toBe(maxAge);
		});
	});
});
