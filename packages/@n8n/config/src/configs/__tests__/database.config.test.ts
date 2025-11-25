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

		test('should accept pool size of 3 (default)', () => {
			const config = Container.get(SqliteConfig);
			expect(config.poolSize).toBe(3);
		});

		test('should accept pool size of 1', () => {
			const config = Container.get(SqliteConfig);
			expect(config.poolSize).toBe(1);
		});

		test('should reject pool size of 0', () => {
			const config = Container.get(SqliteConfig);
			expect(() => {
				config.poolSize = 0;
			}).toThrow();
		});

		test('should reject negative pool size', () => {
			const config = Container.get(SqliteConfig);
			expect(() => {
				config.poolSize = -1;
			}).toThrow();
		});

		test('should reject non-integer pool size', () => {
			const config = Container.get(SqliteConfig);
			expect(() => {
				config.poolSize = 2.5;
			}).toThrow();
		});
	});
});
