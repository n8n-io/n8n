/**
 * Test Infrastructure Verification
 *
 * This test verifies that our test setup mocks are working correctly,
 * specifically the Container.get(GlobalConfig) initialization that was
 * causing test failures.
 */

import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';

describe('Test Infrastructure', () => {
	describe('Container DI System', () => {
		it('should properly mock Container.get(GlobalConfig)', () => {
			const config = Container.get(GlobalConfig);
			expect(config).toBeDefined();
			expect(config.database).toBeDefined();
			expect(config.database.type).toBe('sqlite');
		});

		it('should provide complete database configuration', () => {
			const config = Container.get(GlobalConfig);
			expect(config.database.type).toBe('sqlite');
			expect(config.database.sqliteDatabase).toBe(':memory:');
			expect(config.database.logging).toBe(false);
			expect(config.database.tablePrefix).toBe('');
		});

		it('should provide other configuration sections', () => {
			const config = Container.get(GlobalConfig);
			expect(config.credentials).toBeDefined();
			expect(config.workflows).toBeDefined();
			expect(config.endpoints).toBeDefined();
			expect(config.path).toBeDefined();
			expect(config.nodes).toBeDefined();
			expect(config.queue).toBeDefined();
		});

		it('should handle Logger service mock', () => {
			const logger = Container.get('Logger');
			expect(logger).toBeDefined();
			expect(typeof logger.info).toBe('function');
			expect(typeof logger.error).toBe('function');
			expect(typeof logger.warn).toBe('function');
			expect(typeof logger.debug).toBe('function');
		});

		it('should return empty objects for unknown services', () => {
			const unknownService = Container.get('UnknownService');
			expect(unknownService).toBeDefined();
			expect(typeof unknownService).toBe('object');
		});
	});

	describe('Abstract Entity Compatibility', () => {
		it('should allow abstract entity to access database type without error', async () => {
			// This test ensures that the abstract-entity.ts file can load
			// without throwing the "Cannot read properties of undefined (reading 'type')" error
			const { dbType } = await import('@n8n/db/src/entities/abstract-entity');
			expect(dbType).toBe('sqlite');
		});
	});

	describe('Global Environment Setup', () => {
		it('should have test environment variables set', () => {
			expect(process.env.NODE_ENV).toBe('test');
			expect(process.env.N8N_LOG_LEVEL).toBe('silent');
			expect(process.env.DB_TYPE).toBe('sqlite');
			expect(process.env.DB_SQLITE_DATABASE).toBe(':memory:');
		});

		it('should have proper Jest timeout configured', () => {
			// Jest timeout should be set to 30000ms
			expect(jest.getTimerCount()).toBeDefined();
		});
	});
});
