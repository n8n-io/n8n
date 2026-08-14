import type { DataSource } from '@n8n/typeorm';

import { readPoolStats } from '../db-pool-stats';

describe('readPoolStats', () => {
	it('reads Postgres pool counters with active = total - idle', () => {
		const dataSource = {
			options: { type: 'postgres' },
			driver: { master: { totalCount: 5, idleCount: 2, waitingCount: 3 } },
		} as unknown as DataSource;

		expect(readPoolStats(dataSource)).toEqual({ active: 3, idle: 2, waiting: 3 });
	});

	it('returns undefined when the Postgres pool is absent (mid-recovery)', () => {
		const dataSource = {
			options: { type: 'postgres' },
			driver: { master: undefined },
		} as unknown as DataSource;

		expect(readPoolStats(dataSource)).toBeUndefined();
	});

	it('reads sqlite-pooled stats via getPoolStats', () => {
		const stats = { active: 1, idle: 4, waiting: 0 };
		const dataSource = {
			options: { type: 'sqlite-pooled' },
			driver: { getPoolStats: () => stats },
		} as unknown as DataSource;

		expect(readPoolStats(dataSource)).toEqual(stats);
	});

	it('returns undefined for an unsupported driver type', () => {
		const dataSource = {
			options: { type: 'sqlite' },
			driver: {},
		} as unknown as DataSource;

		expect(readPoolStats(dataSource)).toBeUndefined();
	});
});
