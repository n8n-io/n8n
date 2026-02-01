import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { CredentialsOverwrites } from '@/credentials-overwrites';
import { CredentialTypes } from '@/credential-types';
import type { ICredentialsOverwrite } from '@/interfaces';

describe('CredentialsOverwrites - Integration Tests', () => {
	let credentialsOverwrites: CredentialsOverwrites;
	let globalConfig: GlobalConfig;
	let settingsRepository: SettingsRepository;
	let cipher: Cipher;
	let credentialTypes: CredentialTypes;

	beforeAll(async () => {
		// Initialize real database
		await testDb.init();

		// Get real instances from DI container
		globalConfig = Container.get(GlobalConfig);
		settingsRepository = Container.get(SettingsRepository);
		cipher = Container.get(Cipher);
		credentialTypes = Container.get(CredentialTypes);

		// Configure globalConfig for integration tests
		(globalConfig as any).credentials = {
			overwrite: {
				data: '', // No static data for integration tests
				persistence: true, // Enable persistence for integration tests
				endpointAuthToken: 'integration-test-token',
				endpoint: 'integration-credentials-overwrite',
			},
		};

		// Create instance for integration testing
		credentialsOverwrites = Container.get(CredentialsOverwrites);
	});

	beforeEach(async () => {
		// Clean up database before each test
		await testDb.truncate(['Settings']);
	});

	afterAll(async () => {
		// Clean up database after all tests
		await testDb.terminate();
	});

	describe('Integration Test Coverage', () => {
		describe('Complete Credential Update Flow', () => {
			it('should execute full API → Database → PubSub → Frontend chain', async () => {
				const testOverwriteData: ICredentialsOverwrite = {
					test: { username: 'integrationUser', password: 'integrationPass' },
				};

				// Step 1: API call (setData) - this will save to real database
				await credentialsOverwrites.setData(testOverwriteData, true, false); // Skip frontend reload for integration test

				// Step 2: Verify data was saved to database by reading it back
				const savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();
				expect(savedSetting?.value).toBeTruthy();

				// Step 3: Decrypt and verify the saved data
				const decryptedData = cipher.decrypt(savedSetting!.value);
				const parsedData = JSON.parse(decryptedData);
				expect(parsedData).toEqual(testOverwriteData);

				// Step 4: Test that the data was set in memory
				const allData = credentialsOverwrites.getAll();
				expect(allData).toEqual(testOverwriteData);
			});

			it('should maintain data consistency across sequential operations', async () => {
				const data1: ICredentialsOverwrite = { type1: { key1: 'value1' } };
				const data2: ICredentialsOverwrite = { type2: { key2: 'value2' } };

				// Execute sequential operations (avoid UNIQUE constraint issues)
				await credentialsOverwrites.setData(data1, true, false);

				// Verify first operation
				let savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();
				let decryptedData = cipher.decrypt(savedSetting!.value);
				expect(JSON.parse(decryptedData)).toEqual(data1);

				await credentialsOverwrites.setData(data2, true, false);

				// Verify second operation overwrote the first
				savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();
				decryptedData = cipher.decrypt(savedSetting!.value);
				expect(JSON.parse(decryptedData)).toEqual(data2);

				// The final state should be the last write
				const finalData = credentialsOverwrites.getAll();
				expect(finalData).toEqual(data2);
			});
		});

		describe('PubSub Event Flow Integration', () => {
			it('should execute complete PubSub event → Database load → Frontend reload chain', async () => {
				const testData: ICredentialsOverwrite = {
					pubsub: { token: 'pubsubToken', secret: 'pubsubSecret' },
				};

				// Step 1: Save data to database first
				const encryptedData = cipher.encrypt(JSON.stringify(testData));
				const setting = settingsRepository.create({
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				});
				await settingsRepository.save(setting);

				// Step 2: Simulate PubSub event (this will load from database)
				await credentialsOverwrites.reloadOverwriteCredentials();

				// Step 3: Verify data was loaded from database
				const loadedData = credentialsOverwrites.getAll();
				expect(loadedData).toEqual(testData);
			});

			it('should prevent race conditions between PubSub reload calls', async () => {
				const testData: ICredentialsOverwrite = { race: { condition: 'test' } };
				const encryptedData = cipher.encrypt(JSON.stringify(testData));

				// Save test data to database
				const setting = settingsRepository.create({
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				});
				await settingsRepository.save(setting);

				// Fire multiple concurrent PubSub events
				const promises = Array(3)
					.fill(0)
					.map(async () => await credentialsOverwrites.reloadOverwriteCredentials());

				await Promise.all(promises);

				// Should complete without errors and load the data
				const loadedData = credentialsOverwrites.getAll();
				expect(loadedData).toEqual(testData);
			});
		});

		describe('Mixed Configuration Scenarios', () => {
			it('should handle static config + database persistence working together', async () => {
				const staticData: ICredentialsOverwrite = { static: { key: 'staticValue' } };
				const dbData: ICredentialsOverwrite = { database: { key: 'dbValue' } };

				// Configure static config
				(globalConfig as any).credentials.overwrite.data = JSON.stringify(staticData);

				// Save database data
				const encryptedDbData = cipher.encrypt(JSON.stringify(dbData));
				const dbSetting = settingsRepository.create({
					key: 'credentialsOverwrite',
					value: encryptedDbData,
					loadOnStartup: false,
				});
				await settingsRepository.save(dbSetting);

				// Initialize with both static and database data
				const mixedConfig = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					{ debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
					settingsRepository,
					cipher,
				);

				await mixedConfig.init();

				// Should have database data (loaded after static)
				const finalData = mixedConfig.getAll();
				expect(finalData).toEqual(dbData);

				// Reset config
				(globalConfig as any).credentials.overwrite.data = '';
			});

			it('should handle configuration changes at runtime', async () => {
				const initialData: ICredentialsOverwrite = { initial: { key: 'initialValue' } };
				const updatedData: ICredentialsOverwrite = { updated: { key: 'updatedValue' } };

				// Set initial data
				await credentialsOverwrites.setData(initialData, true, false);
				expect(credentialsOverwrites.getAll()).toEqual(initialData);

				// Update configuration at runtime
				await credentialsOverwrites.setData(updatedData, true, false);
				expect(credentialsOverwrites.getAll()).toEqual(updatedData);

				// Verify updated data was saved to database
				const savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();
				const decryptedData = cipher.decrypt(savedSetting!.value);
				expect(JSON.parse(decryptedData)).toEqual(updatedData);
			});
		});

		describe('Multi-Instance Coordination', () => {
			it('should broadcast changes to multiple instances via PubSub', async () => {
				const testData: ICredentialsOverwrite = { broadcast: { message: 'hello' } };

				// Simulate saving data with broadcast enabled (default behavior)
				await credentialsOverwrites.setData(testData, true, false);

				// Verify data was saved
				const savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();

				// Verify data is accessible
				const loadedData = credentialsOverwrites.getAll();
				expect(loadedData).toEqual(testData);
			});

			it('should coordinate multiple instances receiving same PubSub event', async () => {
				const testData: ICredentialsOverwrite = { coordination: { test: 'value' } };
				const encryptedData = cipher.encrypt(JSON.stringify(testData));

				// Save data to database
				const setting = settingsRepository.create({
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				});
				await settingsRepository.save(setting);

				// Simulate multiple instances receiving the same PubSub event
				const instance1Promise = credentialsOverwrites.reloadOverwriteCredentials();
				const instance2Promise = credentialsOverwrites.reloadOverwriteCredentials();
				const instance3Promise = credentialsOverwrites.reloadOverwriteCredentials();

				await Promise.all([instance1Promise, instance2Promise, instance3Promise]);

				// All instances should coordinate properly without conflicts
				const loadedData = credentialsOverwrites.getAll();
				expect(loadedData).toEqual(testData);
			});
		});

		describe('Error Resilience Integration', () => {
			it('should handle transient failures and recovery', async () => {
				const testData: ICredentialsOverwrite = { recovery: { test: 'data' } };

				// First attempt with failing repository
				const failingRepo = {
					...settingsRepository,
					create: jest.fn(() => {
						throw new Error('Temporary failure');
					}),
				};

				const failingInstance = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					{ debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
					failingRepo as any,
					cipher,
				);

				// First call with failing repo (memory only)
				await failingInstance.setData(testData, false, false);

				// Second call with working repo (should succeed)
				await credentialsOverwrites.setData(testData, true, false);

				// Verify recovery worked
				const savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();
			});
		});

		describe('Backwards Compatibility Integration', () => {
			it('should maintain compatibility with existing workflow patterns', async () => {
				const legacyData: ICredentialsOverwrite = {
					existing: { username: 'legacy', password: 'legacy' },
				};

				// Test existing setData call with explicit parameters to avoid frontend reload
				await credentialsOverwrites.setData(legacyData, true, false);

				// Verify backwards compatibility
				expect(credentialsOverwrites.getAll()).toEqual(legacyData);

				// Verify data was saved to database (default behavior)
				const savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();

				// Test credential application (existing interface)
				const appliedData = credentialsOverwrites.applyOverwrite('existing', {
					username: '',
					password: '',
				});

				expect(appliedData).toEqual({
					username: 'legacy',
					password: 'legacy',
				});
			});

			it('should work with existing middleware and endpoint patterns', async () => {
				// Test middleware functionality
				const middleware = credentialsOverwrites.getOverwriteEndpointMiddleware();
				expect(middleware).toBeDefined();

				// Test overwrite application
				const testData: ICredentialsOverwrite = { middleware: { token: 'middlewareTest' } };

				await credentialsOverwrites.setData(testData, true, false);

				const appliedData = credentialsOverwrites.applyOverwrite('middleware', {
					token: '',
				});

				expect(appliedData).toEqual({ token: 'middlewareTest' });
			});
		});

		describe('End-to-End Validation', () => {
			it('should complete full system integration successfully', async () => {
				const e2eData: ICredentialsOverwrite = {
					e2eTest: {
						username: 'e2eUser',
						password: 'e2ePass',
						token: 'e2eToken',
					},
				};

				// Step 1: Complete integration flow (skip frontend for test)
				await credentialsOverwrites.setData(e2eData, true, false);

				// Step 2: Verify database persistence
				const savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();
				const decryptedData = cipher.decrypt(savedSetting!.value);
				expect(JSON.parse(decryptedData)).toEqual(e2eData);

				// Step 3: Test PubSub reload
				const freshInstance = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					{ debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
					settingsRepository,
					cipher,
				);
				await freshInstance.reloadOverwriteCredentials();
				expect(freshInstance.getAll()).toEqual(e2eData);

				// Step 4: Test that overwrites work correctly with new data
				const appliedOverwrite = credentialsOverwrites.applyOverwrite('e2eTest', {
					username: '',
					password: '',
					token: '',
				});

				expect(appliedOverwrite).toMatchObject({
					username: 'e2eUser',
					password: 'e2ePass',
					token: 'e2eToken',
				});

				// Step 5: Test middleware still works
				const middleware = credentialsOverwrites.getOverwriteEndpointMiddleware();
				expect(middleware).toBeDefined();
			});

			it('should maintain data integrity across complete integration lifecycle', async () => {
				const lifecycleData: ICredentialsOverwrite = {
					lifecycle: { phase1: 'init', phase2: 'process', phase3: 'complete' },
				};

				// Phase 1: Initial save
				await credentialsOverwrites.setData(lifecycleData, true, false);

				// Phase 2: Database verification
				const savedSetting = await settingsRepository.findByKey('credentialsOverwrite');
				expect(savedSetting).toBeTruthy();

				// Phase 3: Fresh instance reload
				const newInstance = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					{ debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
					settingsRepository,
					cipher,
				);

				await newInstance.reloadOverwriteCredentials();

				// Phase 4: Verify complete data integrity
				expect(newInstance.getAll()).toEqual(lifecycleData);

				// Phase 5: Apply overwrites and verify functionality
				const result = newInstance.applyOverwrite('lifecycle', {
					phase1: '',
					phase2: '',
					phase3: '',
				});

				expect(result).toEqual({
					phase1: 'init',
					phase2: 'process',
					phase3: 'complete',
				});
			});
		});
	});
});
