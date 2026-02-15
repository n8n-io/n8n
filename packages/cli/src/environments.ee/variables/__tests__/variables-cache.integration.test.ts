import { testDb } from '@n8n/backend-test-utils';
import { VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProjectService } from '@/services/project.service.ee';
import { createVariable } from '@test-integration/db/variables';

import { VariablesService } from '../variables.service.ee';
import { VariablesCacheHealthService } from '../variables-cache-health.service';

describe('Variables Cache Bug Fix', () => {
	let variablesService: VariablesService;
	let variablesRepository: VariablesRepository;
	let cacheService: CacheService;
	let healthService: VariablesCacheHealthService;
	let projectService: ProjectService;
	let licenseState: { isVariablesLicensed: jest.Mock; getMaxVariables: jest.Mock };

	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		variablesRepository = Container.get(VariablesRepository);
		cacheService = Container.get(CacheService);
		projectService = Container.get(ProjectService);

		licenseState = {
			isVariablesLicensed: jest.fn().mockReturnValue(true),
			getMaxVariables: jest.fn().mockReturnValue(-1),
		};

		variablesService = new VariablesService(
			cacheService,
			variablesRepository,
			mock<EventService>(),
			licenseState as any,
			projectService,
		);

		healthService = new VariablesCacheHealthService(
			cacheService,
			variablesRepository,
			mock(),
		);

		// Clear cache before each test
		await cacheService.reset();
	});

	afterEach(async () => {
		jest.clearAllMocks();
		await testDb.truncate(['Variables']);
		await cacheService.reset();
	});

	describe('Empty Cache Recovery', () => {
		test('should recover when cache contains empty array but database has variables', async () => {
			// ARRANGE - Create variables in database
			const var1 = await createVariable('VAR1', 'value1');
			const var2 = await createVariable('VAR2', 'value2');

			// Simulate stale empty cache (the bug scenario)
			await cacheService.set('variables', []);

			// ACT - Get variables (should detect empty cache and refresh)
			const variables = await variablesService.getAllCached();

			// ASSERT - Should return variables from database, not empty array
			expect(variables).toHaveLength(2);
			expect(variables.map((v) => v.key)).toEqual(expect.arrayContaining(['VAR1', 'VAR2']));
		});

		test('should not refresh cache when database is also empty', async () => {
			// ARRANGE - No variables in database
			await cacheService.set('variables', []);

			const findAllSpy = jest.spyOn(variablesRepository, 'find');

			// ACT
			const variables = await variablesService.getAllCached();

			// ASSERT - Should return empty array without unnecessary DB query
			expect(variables).toHaveLength(0);
			// Should only query DB once to verify it's truly empty
			expect(findAllSpy).toHaveBeenCalledTimes(1);
		});

		test('should handle cache miss (undefined) by refreshing from database', async () => {
			// ARRANGE - Create variables in database
			await createVariable('VAR1', 'value1');
			await createVariable('VAR2', 'value2');

			// Cache is empty (undefined) - simulates Redis restart or eviction
			await cacheService.delete('variables');

			// ACT
			const variables = await variablesService.getAllCached();

			// ASSERT
			expect(variables).toHaveLength(2);
			expect(variables.map((v) => v.key)).toEqual(expect.arrayContaining(['VAR1', 'VAR2']));
		});

		test('should handle cache returning null by refreshing from database', async () => {
			// ARRANGE
			await createVariable('VAR1', 'value1');

			// Simulate cache returning null
			await cacheService.set('variables', null as any);

			// ACT
			const variables = await variablesService.getAllCached();

			// ASSERT
			expect(variables).toHaveLength(1);
			expect(variables[0].key).toBe('VAR1');
		});
	});

	describe('Cache Consistency', () => {
		test('should use cached variables when cache is valid and non-empty', async () => {
			// ARRANGE - Create variables and populate cache
			const var1 = await createVariable('VAR1', 'value1');
			const var2 = await createVariable('VAR2', 'value2');

			// First call populates cache
			await variablesService.getAllCached();

			const findAllSpy = jest.spyOn(variablesRepository, 'find');

			// ACT - Second call should use cache
			const variables = await variablesService.getAllCached();

			// ASSERT
			expect(variables).toHaveLength(2);
			// Should not query database again
			expect(findAllSpy).not.toHaveBeenCalled();
		});

		test('should refresh cache after variable creation', async () => {
			// ARRANGE - Start with empty cache
			await cacheService.set('variables', []);

			// ACT - Create a variable (should update cache)
			await createVariable('VAR1', 'value1');
			await variablesService.updateCache();

			// Get from cache
			const variables = await variablesService.getAllCached();

			// ASSERT
			expect(variables).toHaveLength(1);
			expect(variables[0].key).toBe('VAR1');
		});

		test('should handle concurrent cache access correctly', async () => {
			// ARRANGE
			await createVariable('VAR1', 'value1');
			await createVariable('VAR2', 'value2');

			// Simulate empty cache
			await cacheService.set('variables', []);

			// ACT - Multiple concurrent requests
			const [result1, result2, result3] = await Promise.all([
				variablesService.getAllCached(),
				variablesService.getAllCached(),
				variablesService.getAllCached(),
			]);

			// ASSERT - All should return the same correct data
			expect(result1).toHaveLength(2);
			expect(result2).toHaveLength(2);
			expect(result3).toHaveLength(2);
		});
	});

	describe('Health Check Service', () => {
		test('should detect empty cache with variables in database', async () => {
			// ARRANGE
			await createVariable('VAR1', 'value1');
			await createVariable('VAR2', 'value2');

			// Simulate stale empty cache
			await cacheService.set('variables', []);

			// ACT
			const result = await healthService.performHealthCheck();

			// ASSERT
			expect(result.healthy).toBe(false);
			expect(result.repaired).toBe(true);

			// Verify cache was repaired
			const cachedVariables = await cacheService.get<any[]>('variables');
			expect(cachedVariables).toHaveLength(2);
		});

		test('should detect cache count mismatch', async () => {
			// ARRANGE
			await createVariable('VAR1', 'value1');
			await createVariable('VAR2', 'value2');
			await createVariable('VAR3', 'value3');

			// Cache has outdated data (only 2 variables)
			await cacheService.set('variables', [
				{ id: '1', key: 'VAR1', value: 'value1' },
				{ id: '2', key: 'VAR2', value: 'value2' },
			]);

			// ACT
			const result = await healthService.performHealthCheck();

			// ASSERT
			expect(result.healthy).toBe(false);
			expect(result.repaired).toBe(true);

			// Verify cache was updated
			const cachedVariables = await cacheService.get<any[]>('variables');
			expect(cachedVariables).toHaveLength(3);
		});

		test('should report healthy when cache matches database', async () => {
			// ARRANGE
			const var1 = await createVariable('VAR1', 'value1');
			const var2 = await createVariable('VAR2', 'value2');

			// Populate cache correctly
			await variablesService.updateCache();

			// ACT
			const result = await healthService.performHealthCheck();

			// ASSERT
			expect(result.healthy).toBe(true);
			expect(result.repaired).toBe(false);
		});

		test('should handle empty database and empty cache as healthy', async () => {
			// ARRANGE - No variables in database
			await cacheService.set('variables', []);

			// ACT
			const result = await healthService.performHealthCheck();

			// ASSERT
			expect(result.healthy).toBe(true);
			expect(result.repaired).toBe(false);
		});
	});

	describe('Workflow Execution Scenarios', () => {
		test('should provide variables to workflow execution even after cache loss', async () => {
			// ARRANGE - Create variables
			await createVariable('API_KEY', 'secret-key-123');
			await createVariable('BASE_URL', 'https://api.example.com');

			// Populate cache initially
			await variablesService.updateCache();

			// Simulate cache loss (Redis restart)
			await cacheService.delete('variables');

			// ACT - Workflow execution tries to get variables
			const variables = await variablesService.getAllCached();

			// ASSERT - Should recover and return variables
			expect(variables).toHaveLength(2);
			expect(variables.find((v) => v.key === 'API_KEY')?.value).toBe('secret-key-123');
			expect(variables.find((v) => v.key === 'BASE_URL')?.value).toBe(
				'https://api.example.com',
			);
		});

		test('should handle worker node startup with empty cache', async () => {
			// ARRANGE - Variables exist in database
			await createVariable('WORKER_VAR', 'worker-value');

			// Worker node starts with no cache
			await cacheService.reset();

			// ACT - Worker tries to execute workflow
			const variables = await variablesService.getAllCached();

			// ASSERT - Should load from database
			expect(variables).toHaveLength(1);
			expect(variables[0].key).toBe('WORKER_VAR');
		});
	});

	describe('refreshCache method', () => {
		test('should force refresh cache from database', async () => {
			// ARRANGE
			await createVariable('VAR1', 'value1');

			// Set stale cache
			await cacheService.set('variables', []);

			// ACT
			const variables = await variablesService.refreshCache();

			// ASSERT
			expect(variables).toHaveLength(1);
			expect(variables[0].key).toBe('VAR1');

			// Verify cache was updated
			const cachedVariables = await cacheService.get<any[]>('variables');
			expect(cachedVariables).toHaveLength(1);
		});

		test('should return fresh data even if cache was valid', async () => {
			// ARRANGE
			await createVariable('VAR1', 'value1');
			await variablesService.updateCache();

			// Add another variable directly to database (bypassing cache)
			await createVariable('VAR2', 'value2');

			// ACT - Force refresh
			const variables = await variablesService.refreshCache();

			// ASSERT - Should include the new variable
			expect(variables).toHaveLength(2);
			expect(variables.map((v) => v.key)).toEqual(expect.arrayContaining(['VAR1', 'VAR2']));
		});
	});
});
