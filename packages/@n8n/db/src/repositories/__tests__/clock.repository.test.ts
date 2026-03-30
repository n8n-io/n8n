import type { DatabaseConfig } from '@n8n/config';
import type { DataSource } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { ClockRepository } from '../clock.repository';

describe('ClockRepository', () => {
	const databaseConfig = mock<DatabaseConfig>({ type: 'sqlite' });
	const dataSource = mock<DataSource>();

	let clockRepository: ClockRepository;

	beforeEach(() => {
		clockRepository = new ClockRepository(dataSource, databaseConfig);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('getDbTime()', () => {
		it('parses SQLite ISO timestamp string into a UTC Date', async () => {
			databaseConfig.type = 'sqlite';
			dataSource.query.mockResolvedValueOnce([{ now: '2024-01-15T12:30:45.123Z' }]);

			const result = await clockRepository.getDbTime();

			expect(result).toBeInstanceOf(Date);
			expect(result.getUTCFullYear()).toBe(2024);
			expect(result.getUTCMonth()).toBe(0); // January
			expect(result.getUTCDate()).toBe(15);
			expect(result.getUTCHours()).toBe(12);
			expect(result.getUTCMinutes()).toBe(30);
		});

		it('returns the PostgreSQL Date directly', async () => {
			databaseConfig.type = 'postgresdb';
			const pgNow = new Date('2024-06-01T10:20:30.456Z');
			dataSource.query.mockResolvedValueOnce([{ now: pgNow }]);

			const result = await clockRepository.getDbTime();

			expect(result).toBeInstanceOf(Date);
			expect(result).toBe(pgNow);
		});

		it('throws UnexpectedError when SQLite returns an unparseable string', async () => {
			databaseConfig.type = 'sqlite';
			dataSource.query.mockResolvedValueOnce([{ now: 'not-a-date' }]);

			await expect(clockRepository.getDbTime()).rejects.toThrow('Invalid DB server time');
		});
	});
});
