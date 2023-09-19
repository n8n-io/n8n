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

LoggerProxy.init(getLogger());

const { objectContaining } = expect;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const qb: any = {
	update: jest.fn().mockReturnThis(),
	set: jest.fn().mockReturnThis(),
	where: jest.fn().mockReturnThis(),
	execute: jest.fn().mockReturnThis(),
};

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
		test('should limit pruning based on EXECUTIONS_DATA_PRUNE_MAX_COUNT', async () => {
			const maxCount = 1;

			config.set('executions.pruneDataMaxCount', maxCount);

			const find = jest.spyOn(ExecutionRepository.prototype, 'find');
			entityManager.find.mockResolvedValue([]);

			jest.spyOn(ExecutionRepository.prototype, 'createQueryBuilder').mockReturnValueOnce(qb);

			await executionRepository.prune();

			expect(find.mock.calls[0][0]).toEqual(objectContaining({ skip: maxCount }));
		});

		test('should limit pruning based on EXECUTIONS_DATA_MAX_AGE', async () => {
			const maxAge = 5; // hours

			config.set('executions.pruneDataMaxCount', 0); // disable prune-by-count path
			config.set('executions.pruneDataMaxAge', 5);

			entityManager.find.mockResolvedValue([]);

			jest.spyOn(ExecutionRepository.prototype, 'createQueryBuilder').mockReturnValueOnce(qb);

			const dateFormat = jest.spyOn(DateUtils, 'mixedDateToUtcDatetimeString');

			const now = Date.now();

			await executionRepository.prune();

			const argDate = dateFormat.mock.calls[0][0];
			const difference = now - argDate.valueOf();

			expect(Math.round(difference / TIME.HOUR)).toBe(maxAge);
		});
	});
});
