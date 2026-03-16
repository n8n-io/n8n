import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { DataSource } from '@n8n/typeorm';

import { ClockRepository } from '../clock.repository';

describe('ClockRepository', () => {
	const globalConfig = Container.get(GlobalConfig);
	const originalDbType = globalConfig.database.type;
	const dataSource = mock<DataSource>();

	let clockRepository: ClockRepository;

	beforeEach(() => {
		clockRepository = new ClockRepository(dataSource, globalConfig);
	});

	afterEach(() => {
		globalConfig.database.type = originalDbType;
		jest.restoreAllMocks();
	});

	describe('getServerTime()', () => {
		it('parses SQLite ISO timestamp string into a UTC Date', async () => {
			globalConfig.database.type = 'sqlite';
			dataSource.query.mockResolvedValueOnce([{ now: '2024-01-15T12:30:45.123Z' }]);

			const result = await clockRepository.getServerTime();

			expect(result).toBeInstanceOf(Date);
			expect(result.getUTCFullYear()).toBe(2024);
			expect(result.getUTCMonth()).toBe(0); // January
			expect(result.getUTCDate()).toBe(15);
			expect(result.getUTCHours()).toBe(12);
			expect(result.getUTCMinutes()).toBe(30);
		});

		it('wraps the PostgreSQL Date object in a new Date', async () => {
			globalConfig.database.type = 'postgresdb';
			const pgNow = new Date('2024-06-01T10:20:30.456Z');
			dataSource.query.mockResolvedValueOnce([{ now: pgNow }]);

			const result = await clockRepository.getServerTime();

			expect(result).toBeInstanceOf(Date);
			expect(result.getTime()).toBe(pgNow.getTime());
		});

		it('throws UnexpectedError when SQLite returns an unparseable string', async () => {
			globalConfig.database.type = 'sqlite';
			dataSource.query.mockResolvedValueOnce([{ now: 'not-a-date' }]);

			await expect(clockRepository.getServerTime()).rejects.toThrow('Invalid DB server time');
		});
	});
});
