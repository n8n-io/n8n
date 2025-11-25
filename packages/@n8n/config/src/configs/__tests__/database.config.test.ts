import { Container } from '@n8n/di';

import { SqliteConfig } from '../database.config';

describe('SqliteConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	describe('poolSize validation', () => {
		test('should accept pool size greater than 1', () => {
			const config = Container.get(SqliteConfig);
			expect(() => {
				config.poolSize = 2;
			}).not.toThrow();
			expect(config.poolSize).toBe(2);
		});

		test('should have default pool size of 3', () => {
			const config = Container.get(SqliteConfig);
			expect(config.poolSize).toBe(3);
		});
	});
});
