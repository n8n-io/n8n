import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { CommaSeparatedStringArray, GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Cipher, UnrecognizedCredentialTypeError } from 'n8n-core';
import { MANAGED_VERSION_KEY } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, ICredentialType, IDataObject } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { ManagedAppUnavailableError } from '@/errors/managed-app-unavailable.error';
import type { ICredentialsOverwrite } from '@/interfaces';
import { StaticAuthService } from '@/services/static-auth-service';

describe('CredentialsOverwrites', () => {
	const testCredentialType = mock<ICredentialType>({ name: 'test', extends: ['parent'] });
	const parentCredentialType = mock<ICredentialType>({ name: 'parent', extends: undefined });

	const globalConfig = mock<GlobalConfig>({ credentials: { overwrite: {} } });
	const credentialTypes = mock<CredentialTypes>();
	const logger = mock<Logger>();
	let credentialsOverwrites: CredentialsOverwrites;

	beforeEach(async () => {
		vi.resetAllMocks();

		globalConfig.credentials.overwrite.data = JSON.stringify({
			test: { username: 'user' },
			parent: { password: 'pass' },
		});
		globalConfig.credentials.overwrite.skipTypes =
			[] as unknown as CommaSeparatedStringArray<string>;
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockImplementation((credentialType) => {
			if (credentialType === testCredentialType.name) return testCredentialType;
			if (credentialType === parentCredentialType.name) return parentCredentialType;
			throw new UnrecognizedCredentialTypeError(credentialType);
		});
		credentialTypes.getParentTypes.mockReturnValue([]);
		credentialTypes.getParentTypes
			.calledWith(testCredentialType.name)
			.mockReturnValue([parentCredentialType.name]);

		credentialsOverwrites = new CredentialsOverwrites(
			globalConfig,
			credentialTypes,
			logger,
			mock(),
			mock(),
		);

		await credentialsOverwrites.init();
	});

	describe('constructor', () => {
		it('should parse and set overwrite data from config', () => {
			expect(credentialsOverwrites.getAll()).toEqual({
				parent: { password: 'pass' },
				test: {
					password: 'pass',
					username: 'user',
				},
			});
		});
	});

	describe('getOverwriteEndpointMiddleware', () => {
		it('should call the static auth middleware with the correct token', () => {
			const getStaticAuthMiddlewareSpy = vi.spyOn(StaticAuthService, 'getStaticAuthMiddleware');
			globalConfig.credentials.overwrite.endpointAuthToken = 'test-token';
			const localCredentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);
			localCredentialsOverwrites.getOverwriteEndpointMiddleware();
			expect(getStaticAuthMiddlewareSpy).toHaveBeenCalledWith('test-token');
			getStaticAuthMiddlewareSpy.mockRestore();
		});
	});

	describe('setData', () => {
		it('should reset resolvedTypes when setting new data', async () => {
			const newData = { test: { token: 'test-token' } };
			await credentialsOverwrites.setData(newData, false, false);

			expect(credentialsOverwrites.getAll()).toEqual(newData);
		});
	});

	describe('applyOverwrite', () => {
		it('should apply overwrites only for empty fields', () => {
			const result = credentialsOverwrites.applyOverwrite('test', {
				username: 'existingUser',
				password: '',
			});

			expect(result).toEqual({
				username: 'existingUser',
				password: 'pass',
			});
		});

		it('should skip an empty overwrite value so the stored field stays unset', () => {
			credentialsOverwrites.setPlainData({ test: { username: 'user', password: '' } });

			const result = credentialsOverwrites.applyOverwrite('test', { username: '' });

			expect(result).toEqual({ username: 'user' });
		});

		it('should return original data if no overwrites exist', () => {
			const data = {
				username: 'user1',
				password: 'pass1',
			};

			credentialTypes.getParentTypes.mockReturnValueOnce([]);

			const result = credentialsOverwrites.applyOverwrite('unknownCredential', data);
			expect(result).toEqual(data);
		});

		it('should not crash when skipTypes is undefined', () => {
			// Simulate version mismatch where skipTypes is not present on the config object
			globalConfig.credentials.overwrite.skipTypes =
				undefined as unknown as CommaSeparatedStringArray<string>;

			const result = credentialsOverwrites.applyOverwrite('test', {
				username: '',
				password: '',
			});

			expect(result).toEqual({ username: 'user', password: 'pass' });
		});

		it('should not crash when overwrite config object is undefined', () => {
			// Simulate a DI/version mismatch where the nested overwrite config is undefined
			const savedOverwrite = globalConfig.credentials.overwrite;
			globalConfig.credentials.overwrite = undefined as never;

			try {
				const result = credentialsOverwrites.applyOverwrite('test', {
					username: '',
					password: '',
				});

				expect(result).toEqual({ username: 'user', password: 'pass' });
			} finally {
				globalConfig.credentials.overwrite = savedOverwrite;
			}
		});

		describe('N8N_SKIP_CREDENTIAL_OVERWRITE', () => {
			beforeEach(() => {
				globalConfig.credentials.overwrite.skipTypes = [
					'test',
				] as unknown as CommaSeparatedStringArray<string>;
			});

			it('should apply overwrite when all overwrite fields are empty', () => {
				const result = credentialsOverwrites.applyOverwrite('test', {
					username: '',
					password: '',
				});

				expect(result).toEqual({ username: 'user', password: 'pass' });
			});

			it('should apply overwrite when overwrite fields match the stored values', () => {
				// stored values already equal the overwrite values — apply is a no-op but correct path
				const result = credentialsOverwrites.applyOverwrite('test', {
					username: 'user',
					password: 'pass',
				});

				expect(result).toEqual({ username: 'user', password: 'pass' });
			});

			it('should skip overwrite when credential has a custom value for an overwrite field', () => {
				const data = { username: 'custom-user', password: '' };

				const result = credentialsOverwrites.applyOverwrite('test', data);

				expect(result).toEqual(data);
			});

			it('should not affect types not in the skip list', () => {
				// 'parent' is not in skipTypes, so its empty fields are still filled
				credentialTypes.getParentTypes.calledWith('parent').mockReturnValue([]);

				const result = credentialsOverwrites.applyOverwrite('parent', { password: '' });

				expect(result).toEqual({ password: 'pass' });
			});

			it('should still apply overwrites to an extending type when only its parent is in the skip list', () => {
				// The skip list is exact-name: a skip entry on 'parent' must not change how
				// 'test' (which extends 'parent') is treated, even when 'test' has a
				// customized field. This allows skipping a base type without affecting
				// the concrete types that inherit its overwrite.
				globalConfig.credentials.overwrite.skipTypes = [
					'parent',
				] as unknown as CommaSeparatedStringArray<string>;

				const result = credentialsOverwrites.applyOverwrite('test', {
					username: 'custom-user',
					password: '',
				});

				expect(result).toEqual({ username: 'custom-user', password: 'pass' });
			});
		});
	});

	describe('supportsManagedAuth', () => {
		it('should return true when an overwrite is configured for the type', () => {
			expect(credentialsOverwrites.supportsManagedAuth('test')).toBe(true);
		});

		it('should return true for a base type that has its own overwrite', () => {
			credentialTypes.getParentTypes.calledWith('parent').mockReturnValue([]);
			expect(credentialsOverwrites.supportsManagedAuth('parent')).toBe(true);
		});

		it('should return false when no overwrite is configured for the type', () => {
			credentialTypes.getParentTypes.mockReturnValueOnce([]);
			expect(credentialsOverwrites.supportsManagedAuth('unknownCredential')).toBe(false);
		});
	});

	describe('usesManagedAuth', () => {
		it('should return true when an overwritten field is left empty', () => {
			expect(
				credentialsOverwrites.usesManagedAuth('test', { username: '', password: 'pass' }),
			).toBe(true);
		});

		it('should return false when the user supplied all overwritten fields', () => {
			expect(
				credentialsOverwrites.usesManagedAuth('test', {
					username: 'own-user',
					password: 'own-pass',
				}),
			).toBe(false);
		});

		it('should return false when no overwrite is configured for the type', () => {
			credentialTypes.getParentTypes.mockReturnValueOnce([]);
			expect(credentialsOverwrites.usesManagedAuth('unknownCredential', { username: 'user' })).toBe(
				false,
			);
		});

		it('should return false for a skip-list type when the user customized an overwritten field', () => {
			// applyOverwrite skips injection entirely here, so the credential is not managed
			globalConfig.credentials.overwrite.skipTypes = [
				'test',
			] as unknown as CommaSeparatedStringArray<string>;

			expect(
				credentialsOverwrites.usesManagedAuth('test', { username: 'custom-user', password: '' }),
			).toBe(false);
		});
	});

	describe('getOverwrites', () => {
		it('should return undefined for unrecognized credential type', () => {
			credentialTypes.recognizes.mockReturnValue(false);

			const result = credentialsOverwrites.getOverwrites('unknownType');

			expect(result).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown credential type'));
		});

		it('should cache resolved types', () => {
			credentialsOverwrites.getOverwrites('parent');
			const firstCall = credentialsOverwrites.getOverwrites('test');
			const secondCall = credentialsOverwrites.getOverwrites('test');

			expect(firstCall).toEqual(secondCall);
			expect(credentialTypes.getByName).toHaveBeenCalledTimes(2);

			expect(credentialsOverwrites['resolvedTypes']).toEqual(['parent', 'test']);
		});

		it('should merge overwrites from parent types', async () => {
			credentialTypes.getByName.mockImplementation((credentialType) => {
				if (credentialType === 'childType')
					return mock<ICredentialType>({ extends: ['parentType1', 'parentType2'] });
				if (credentialType === 'parentType1') return mock<ICredentialType>({ extends: undefined });
				if (credentialType === 'parentType2') return mock<ICredentialType>({ extends: undefined });
				throw new UnrecognizedCredentialTypeError(credentialType);
			});

			globalConfig.credentials.overwrite.data = JSON.stringify({
				childType: { specificField: 'childValue' },
				parentType1: { parentField1: 'value1' },
				parentType2: { parentField2: 'value2' },
			});

			const credentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);

			await credentialsOverwrites.init();
			const result = credentialsOverwrites.getOverwrites('childType');

			expect(result).toEqual({
				parentField1: 'value1',
				parentField2: 'value2',
				specificField: 'childValue',
			});
		});
	});

	describe('Database Persistence', () => {
		let dbCredentialsOverwrites: CredentialsOverwrites;
		let settingsRepository: Mocked<SettingsRepository>;
		let cipher: Mocked<Cipher>;
		let publisherMock: { publishCommand: Mock };
		let dbGlobalConfig: GlobalConfig;

		beforeEach(async () => {
			// Mock SettingsRepository
			settingsRepository = mockInstance(SettingsRepository, {
				findByKey: vi.fn() as never,
				create: vi.fn() as never,
				save: vi.fn() as never,
			});

			// Mock Cipher
			cipher = mockInstance(Cipher, {
				encryptV2: vi.fn(),
				decryptV2: vi.fn(),
			});

			// Mock Publisher service - need to import the class first
			const { Publisher } = await import('@/scaling/pubsub/publisher.service.js');
			publisherMock = { publishCommand: vi.fn() };
			mockInstance(Publisher, publisherMock);

			// Create separate config for database tests
			dbGlobalConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: JSON.stringify({
							test: { username: 'user' },
							parent: { password: 'pass' },
						}),
						persistence: true,
						endpointAuthToken: '',
					},
				},
			});

			// Create a new instance with mocked dependencies
			dbCredentialsOverwrites = new CredentialsOverwrites(
				dbGlobalConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			await dbCredentialsOverwrites.init();

			vi.clearAllMocks();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('saveOverwriteDataToDB', () => {
			it('should encrypt data and save to database', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user', password: 'pass' },
				};
				const encryptedData = 'encrypted-data';
				const settingObject = {
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				};

				cipher.encryptV2.mockResolvedValue(encryptedData);
				settingsRepository.create.mockReturnValue(settingObject);

				await dbCredentialsOverwrites.saveOverwriteDataToDB(overwriteData);

				expect(cipher.encryptV2).toHaveBeenCalledWith(JSON.stringify(overwriteData));
				expect(settingsRepository.create).toHaveBeenCalledWith({
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				});
				expect(settingsRepository.save).toHaveBeenCalledWith(settingObject);
			});

			it('should call Publisher when broadcast is true', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user' },
				};

				cipher.encryptV2.mockResolvedValue('encrypted');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted',
					loadOnStartup: false,
				});

				await dbCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, true);

				expect(publisherMock.publishCommand).toHaveBeenCalledWith({
					command: 'reload-overwrite-credentials',
				});
			});

			it('should skip Publisher when broadcast is false', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user' },
				};

				cipher.encryptV2.mockResolvedValue('encrypted');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted',
					loadOnStartup: false,
				});

				await dbCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, false);

				expect(publisherMock.publishCommand).not.toHaveBeenCalled();
			});
		});

		describe('loadOverwriteDataFromDB', () => {
			it('should load and decrypt data without frontend reload', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user', password: 'pass' },
				};
				const encryptedData = 'encrypted-data';
				const settingData = {
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decryptV2.mockResolvedValue(JSON.stringify(overwriteData));

				await dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).toHaveBeenCalledWith(encryptedData);
				expect(dbCredentialsOverwrites.getAll()).toEqual(overwriteData);
			});

			it('should load and decrypt data with frontend reload', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user', password: 'pass' },
				};
				const encryptedData = 'encrypted-data';
				const settingData = {
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decryptV2.mockResolvedValue(JSON.stringify(overwriteData));

				await dbCredentialsOverwrites.loadOverwriteDataFromDB(true);

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).toHaveBeenCalledWith(encryptedData);
				expect(dbCredentialsOverwrites.getAll()).toEqual(overwriteData);
			});

			it('should handle missing data gracefully', async () => {
				settingsRepository.findByKey.mockResolvedValue(null);

				await dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).not.toHaveBeenCalled();
				// Should not throw error and existing data should remain unchanged
			});

			it('should handle decryption errors', async () => {
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'invalid-encrypted-data',
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decryptV2.mockImplementation(async () => {
					throw new Error('Decryption failed');
				});

				// Should not throw but log error
				await expect(dbCredentialsOverwrites.loadOverwriteDataFromDB(false)).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).toHaveBeenCalledWith('invalid-encrypted-data');
				expect(logger.error).toHaveBeenCalledWith('Error loading overwrite credentials', {
					error: expect.any(Error),
				});
			});

			it('should handle database errors', async () => {
				const dbError = new Error('Database connection failed');
				settingsRepository.findByKey.mockRejectedValue(dbError);

				// Should not throw but log error
				await expect(dbCredentialsOverwrites.loadOverwriteDataFromDB(false)).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).not.toHaveBeenCalled();
				expect(logger.error).toHaveBeenCalledWith('Error loading overwrite credentials', {
					error: dbError,
				});
			});

			it('should prevent concurrent calls using reloading flag', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user' },
				};
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				};

				// Setup mocks
				settingsRepository.findByKey.mockImplementation(async () => {
					// Simulate slow database operation
					return await new Promise((resolve) => {
						setTimeout(() => resolve(settingData), 100);
					});
				});
				cipher.decryptV2.mockResolvedValue(JSON.stringify(overwriteData));

				// Start first call
				const firstCall = dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				// Start second call immediately (should return early due to reloading flag)
				const secondCall = dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				// Wait for both calls to complete
				await Promise.all([firstCall, secondCall]);

				// Database should only be called once due to reloading flag protection
				expect(settingsRepository.findByKey).toHaveBeenCalledTimes(1);
				expect(cipher.decryptV2).toHaveBeenCalledTimes(1);
			});

			it('should handle JSON parsing errors in decrypted data', async () => {
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decryptV2.mockResolvedValue('invalid-json{');

				// Should not throw but log error
				await expect(dbCredentialsOverwrites.loadOverwriteDataFromDB(false)).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).toHaveBeenCalledWith('encrypted-data');
				expect(logger.error).toHaveBeenCalledWith('Error loading overwrite credentials', {
					error: expect.any(Error),
				});
			});
		});
	});

	describe('PubSub Integration', () => {
		let pubsubCredentialsOverwrites: CredentialsOverwrites;
		let settingsRepository: Mocked<SettingsRepository>;
		let cipher: Mocked<Cipher>;
		let publisherMock: { publishCommand: Mock };
		let pubsubGlobalConfig: GlobalConfig;

		beforeEach(async () => {
			// Mock SettingsRepository
			settingsRepository = mockInstance(SettingsRepository, {
				findByKey: vi.fn() as never,
				create: vi.fn() as never,
				save: vi.fn() as never,
			});

			// Mock Cipher
			cipher = mockInstance(Cipher, {
				encryptV2: vi.fn(),
				decryptV2: vi.fn(),
			});

			// Mock Publisher service
			const { Publisher } = await import('@/scaling/pubsub/publisher.service.js');
			publisherMock = { publishCommand: vi.fn() };
			mockInstance(Publisher, publisherMock);

			// Create config for PubSub tests with persistence enabled
			pubsubGlobalConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: JSON.stringify({
							test: { username: 'user' },
						}),
						persistence: true,
						endpointAuthToken: '',
					},
				},
			});

			// Create instance with mocked dependencies
			pubsubCredentialsOverwrites = new CredentialsOverwrites(
				pubsubGlobalConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			await pubsubCredentialsOverwrites.init();
			vi.clearAllMocks();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('reloadOverwriteCredentials', () => {
			it('should call loadOverwriteDataFromDB with reloadFrontend=true', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'newUser', password: 'newPass' },
				};
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decryptV2.mockResolvedValue(JSON.stringify(overwriteData));

				const mockReloadHandler = vi.fn();
				pubsubCredentialsOverwrites.registerReloadHandler(mockReloadHandler);

				await pubsubCredentialsOverwrites.reloadOverwriteCredentials();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).toHaveBeenCalledWith('encrypted-data');
				expect(pubsubCredentialsOverwrites.getAll()).toEqual(overwriteData);
				expect(mockReloadHandler).toHaveBeenCalled();
			});

			it('should handle database loading errors gracefully', async () => {
				const dbError = new Error('Database connection failed');
				settingsRepository.findByKey.mockRejectedValue(dbError);

				await expect(
					pubsubCredentialsOverwrites.reloadOverwriteCredentials(),
				).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).not.toHaveBeenCalled();
				expect(logger.error).toHaveBeenCalledWith('Error loading overwrite credentials', {
					error: dbError,
				});
			});

			it('should handle decryption errors gracefully', async () => {
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'invalid-encrypted-data',
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decryptV2.mockImplementation(async () => {
					throw new Error('Decryption failed');
				});

				await expect(
					pubsubCredentialsOverwrites.reloadOverwriteCredentials(),
				).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decryptV2).toHaveBeenCalledWith('invalid-encrypted-data');
				expect(logger.error).toHaveBeenCalledWith('Error loading overwrite credentials', {
					error: expect.any(Error),
				});
			});

			it('should prevent concurrent reload operations', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user' },
				};
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				};

				// Setup mocks with slow database operation
				settingsRepository.findByKey.mockImplementation(async () => {
					return await new Promise((resolve) => {
						setTimeout(() => resolve(settingData), 100);
					});
				});
				cipher.decryptV2.mockResolvedValue(JSON.stringify(overwriteData));

				pubsubCredentialsOverwrites.registerReloadHandler(vi.fn());

				// Start first reload
				const firstReload = pubsubCredentialsOverwrites.reloadOverwriteCredentials();

				// Start second reload immediately (should return early due to reloading flag)
				const secondReload = pubsubCredentialsOverwrites.reloadOverwriteCredentials();

				// Wait for both to complete
				await Promise.all([firstReload, secondReload]);

				// Database should only be called once due to reloading flag protection
				expect(settingsRepository.findByKey).toHaveBeenCalledTimes(1);
				expect(cipher.decryptV2).toHaveBeenCalledTimes(1);
			});
		});

		describe('broadcastReloadOverwriteCredentialsCommand', () => {
			it('should publish command when persistence is enabled', async () => {
				pubsubGlobalConfig.credentials.overwrite.persistence = true;

				// Call the private method through saveOverwriteDataToDB with broadcast=true
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user' },
				};

				cipher.encryptV2.mockResolvedValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				await pubsubCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, true);

				expect(publisherMock.publishCommand).toHaveBeenCalledWith({
					command: 'reload-overwrite-credentials',
				});
			});
		});

		describe('PubSub Event Decorator Integration', () => {
			it('should have @OnPubSubEvent decorator configured correctly', async () => {
				// Test that the method exists and can be called directly
				expect(typeof pubsubCredentialsOverwrites.reloadOverwriteCredentials).toBe('function');

				// Test that calling the method works (basic smoke test for decorator)
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				};
				const overwriteData = { test: { username: 'decoratorTest' } };

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decryptV2.mockResolvedValue(JSON.stringify(overwriteData));

				pubsubCredentialsOverwrites.registerReloadHandler(vi.fn());

				await expect(
					pubsubCredentialsOverwrites.reloadOverwriteCredentials(),
				).resolves.not.toThrow();
			});
		});

		describe('Integration between saveOverwriteDataToDB and PubSub broadcasting', () => {
			it('should save to database and broadcast when both are enabled', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'integrationUser', password: 'integrationPass' },
				};
				const encryptedData = 'integration-encrypted-data';
				const settingObject = {
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				};

				pubsubGlobalConfig.credentials.overwrite.persistence = true;
				cipher.encryptV2.mockResolvedValue(encryptedData);
				settingsRepository.create.mockReturnValue(settingObject);

				await pubsubCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, true);

				// Verify database operations
				expect(cipher.encryptV2).toHaveBeenCalledWith(JSON.stringify(overwriteData));
				expect(settingsRepository.create).toHaveBeenCalledWith({
					key: 'credentialsOverwrite',
					value: encryptedData,
					loadOnStartup: false,
				});
				expect(settingsRepository.save).toHaveBeenCalledWith(settingObject);

				// Verify PubSub broadcast
				expect(publisherMock.publishCommand).toHaveBeenCalledWith({
					command: 'reload-overwrite-credentials',
				});
			});

			it('should save to database but skip broadcast when disabled', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'noBroadcastUser' },
				};

				cipher.encryptV2.mockResolvedValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				await pubsubCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, false);

				// Verify database operations still happen
				expect(cipher.encryptV2).toHaveBeenCalledWith(JSON.stringify(overwriteData));
				expect(settingsRepository.save).toHaveBeenCalled();

				// Verify no PubSub broadcast
				expect(publisherMock.publishCommand).not.toHaveBeenCalled();
			});

			it('should complete database save even if broadcast fails', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'broadcastFailUser' },
				};

				pubsubGlobalConfig.credentials.overwrite.persistence = true;
				cipher.encryptV2.mockResolvedValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				// Make publishCommand fail
				publisherMock.publishCommand.mockRejectedValue(new Error('Broadcast failed'));

				await expect(
					pubsubCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, true),
				).rejects.toThrow('Broadcast failed');

				// Verify database operations completed before broadcast failure
				expect(cipher.encryptV2).toHaveBeenCalledWith(JSON.stringify(overwriteData));
				expect(settingsRepository.save).toHaveBeenCalled();
				expect(publisherMock.publishCommand).toHaveBeenCalledWith({
					command: 'reload-overwrite-credentials',
				});
			});
		});
	});

	describe('Frontend Integration', () => {
		let frontendCredentialsOverwrites: CredentialsOverwrites;

		beforeEach(async () => {
			vi.clearAllMocks();

			// Create instance for frontend tests
			frontendCredentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);

			await frontendCredentialsOverwrites.init();
			vi.clearAllMocks();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('reload handler via setData', () => {
			let reloadHandler: Mock;

			beforeEach(() => {
				reloadHandler = vi.fn().mockResolvedValue(undefined);
				frontendCredentialsOverwrites.registerReloadHandler(reloadHandler);
			});

			it('should call the reload handler when reloadFrontend is true', async () => {
				const testData = { test: { username: 'frontendUser' } };

				await frontendCredentialsOverwrites.setData(testData, false, true);

				expect(reloadHandler).toHaveBeenCalledTimes(1);
				expect(frontendCredentialsOverwrites.getAll()).toEqual(testData);
			});

			it('should skip the reload handler when reloadFrontend is false', async () => {
				const testData = { test: { username: 'noReloadUser' } };

				await frontendCredentialsOverwrites.setData(testData, false, false);

				expect(reloadHandler).not.toHaveBeenCalled();
				expect(frontendCredentialsOverwrites.getAll()).toEqual(testData);
			});

			it('should call setData with correct parameters in init methods', async () => {
				// Test both paths of setData through database loading
				const settingsRepository = mockInstance(SettingsRepository, {
					findByKey: vi.fn().mockResolvedValue({
						key: 'credentialsOverwrite',
						value: 'encrypted-data',
						loadOnStartup: false,
					}),
					create: vi.fn() as never,
					save: vi.fn() as never,
				});

				const cipher = mockInstance(Cipher, {
					encryptV2: vi.fn(),
					decryptV2: vi.fn().mockResolvedValue(JSON.stringify({ test: { username: 'dbUser' } })),
				});

				const dbInstance = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					logger,
					settingsRepository,
					cipher,
				);

				await dbInstance.init(); // Initialize the instance first

				const setDataSpy = vi.spyOn(dbInstance, 'setData');

				await dbInstance.loadOverwriteDataFromDB(false);

				// Verify setData was called with reloadFrontend=false
				expect(setDataSpy).toHaveBeenCalledWith({ test: { username: 'dbUser' } }, false, false);

				setDataSpy.mockClear();

				await dbInstance.loadOverwriteDataFromDB(true);

				// Verify setData was called with reloadFrontend=true
				expect(setDataSpy).toHaveBeenCalledWith({ test: { username: 'dbUser' } }, false, true);

				setDataSpy.mockRestore();
			});
		});
	});

	describe('Configuration-Based Initialization', () => {
		let initCredentialsOverwrites: CredentialsOverwrites;
		let settingsRepository: Mocked<SettingsRepository>;
		let cipher: Mocked<Cipher>;
		let publisherMock: { publishCommand: Mock };

		beforeEach(async () => {
			// Mock SettingsRepository
			settingsRepository = mockInstance(SettingsRepository, {
				findByKey: vi.fn() as never,
				create: vi.fn() as never,
				save: vi.fn() as never,
			});

			// Mock Cipher
			cipher = mockInstance(Cipher, {
				encryptV2: vi.fn(),
				decryptV2: vi.fn(),
			});

			// Mock Publisher service
			const { Publisher } = await import('@/scaling/pubsub/publisher.service.js');
			publisherMock = { publishCommand: vi.fn() };
			mockInstance(Publisher, publisherMock);

			vi.clearAllMocks();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should only load static config data when persistence is disabled', async () => {
			const staticData = { test: { username: 'staticUser' } };
			const initConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: JSON.stringify(staticData),
						persistence: false,
						endpointAuthToken: '',
					},
				},
			});

			initCredentialsOverwrites = new CredentialsOverwrites(
				initConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			// Spy on methods to verify call patterns
			const setPlainDataSpy = vi.spyOn(initCredentialsOverwrites, 'setPlainData');
			const loadFromDbSpy = vi.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was called with correct parameters
			expect(setPlainDataSpy).toHaveBeenCalledWith(staticData);
			expect(setPlainDataSpy).toHaveBeenCalledTimes(1);

			// Verify loadOverwriteDataFromDB was NOT called
			expect(loadFromDbSpy).not.toHaveBeenCalled();

			// Verify database operations were not called
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();

			setPlainDataSpy.mockRestore();
			loadFromDbSpy.mockRestore();
		});

		it('should only load from database when persistence is enabled and no static data', async () => {
			const dbData = { test: { username: 'dbUser' } };
			const initConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: '',
						persistence: true,
						endpointAuthToken: '',
					},
				},
			});

			initCredentialsOverwrites = new CredentialsOverwrites(
				initConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			// Setup database mocks
			settingsRepository.findByKey.mockResolvedValue({
				key: 'credentialsOverwrite',
				value: 'encrypted-db-data',
				loadOnStartup: false,
			});
			cipher.decryptV2.mockResolvedValue(JSON.stringify(dbData));

			// Spy on methods
			const setDataSpy = vi.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = vi.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was called once indirectly by loadOverwriteDataFromDB
			expect(setDataSpy).toHaveBeenCalledWith(dbData, false, false);
			expect(setDataSpy).toHaveBeenCalledTimes(1);

			// Verify loadOverwriteDataFromDB was called with correct parameter
			expect(loadFromDbSpy).toHaveBeenCalledWith(false);
			expect(loadFromDbSpy).toHaveBeenCalledTimes(1);

			// Verify database operations were called
			expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
			expect(cipher.decryptV2).toHaveBeenCalledWith('encrypted-db-data');

			setDataSpy.mockRestore();
			loadFromDbSpy.mockRestore();
		});

		it('should load both static data and database when both are enabled', async () => {
			const staticData = { test: { username: 'staticUser' } };
			const dbData = { parent: { password: 'dbPass' } };
			const initConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: JSON.stringify(staticData),
						persistence: true,
						endpointAuthToken: '',
					},
				},
			});

			initCredentialsOverwrites = new CredentialsOverwrites(
				initConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			// Setup database mocks
			settingsRepository.findByKey.mockResolvedValue({
				key: 'credentialsOverwrite',
				value: 'encrypted-db-data',
				loadOnStartup: false,
			});
			cipher.decryptV2.mockResolvedValue(JSON.stringify(dbData));

			// Spy on methods
			const setPlainDataSpy = vi.spyOn(initCredentialsOverwrites, 'setPlainData');
			const setDataSpy = vi.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = vi.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was called twice - once directly from init(), once from loadFromDB
			expect(setPlainDataSpy).toHaveBeenCalledTimes(2);
			expect(setPlainDataSpy).toHaveBeenNthCalledWith(1, staticData);
			expect(setPlainDataSpy).toHaveBeenNthCalledWith(2, dbData);
			expect(setDataSpy).toHaveBeenCalledWith(dbData, false, false);

			expect(loadFromDbSpy).toHaveBeenCalledWith(false);
			expect(loadFromDbSpy).toHaveBeenCalledTimes(1);

			// Verify correct order of operations (static setData first, then loadFromDB with its setData)
			const firstSetDataCall = setPlainDataSpy.mock.invocationCallOrder[0];
			const loadDbCall = loadFromDbSpy.mock.invocationCallOrder[0];
			const secondSetDataCall = setPlainDataSpy.mock.invocationCallOrder[1];

			expect(firstSetDataCall).toBeLessThan(loadDbCall);
			expect(loadDbCall).toBeLessThan(secondSetDataCall);

			setPlainDataSpy.mockRestore();
			setDataSpy.mockRestore();
			loadFromDbSpy.mockRestore();
		});

		it('should do nothing when neither static data nor persistence are enabled', async () => {
			const initConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: '',
						persistence: false,
						endpointAuthToken: '',
					},
				},
			});

			initCredentialsOverwrites = new CredentialsOverwrites(
				initConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			// Spy on methods
			const setDataSpy = vi.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = vi.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify no methods were called
			expect(setDataSpy).not.toHaveBeenCalled();
			expect(loadFromDbSpy).not.toHaveBeenCalled();

			// Verify no database operations
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();

			setDataSpy.mockRestore();
			loadFromDbSpy.mockRestore();
		});

		it('should handle invalid JSON in static config data gracefully', async () => {
			const initConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: 'invalid-json{',
						persistence: false,
						endpointAuthToken: '',
					},
				},
			});

			initCredentialsOverwrites = new CredentialsOverwrites(
				initConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			// Should throw error during init due to invalid JSON
			await expect(initCredentialsOverwrites.init()).rejects.toThrow(
				'The credentials-overwrite is not valid JSON.',
			);

			// Verify database operations were not attempted
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});
	});

	describe('isManagedOAuthType', () => {
		const oauthCredentialType = mock<ICredentialType>({
			name: 'notionOAuth2Api',
			extends: ['oAuth2Api'],
		});
		const baseOAuth2Type = mock<ICredentialType>({ name: 'oAuth2Api', extends: undefined });
		const oauth1CredentialType = mock<ICredentialType>({
			name: 'trelloOAuth1Api',
			extends: ['oAuth1Api'],
		});
		const baseOAuth1Type = mock<ICredentialType>({ name: 'oAuth1Api', extends: undefined });
		const apiKeyCredentialType = mock<ICredentialType>({ name: 'notionApi', extends: undefined });

		const createInstance = async (data: ICredentialsOverwrite) => {
			globalConfig.credentials.overwrite.data = JSON.stringify(data);
			const instance = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);
			await instance.init();
			return instance;
		};

		beforeEach(() => {
			credentialTypes.recognizes.mockReturnValue(true);
			credentialTypes.getByName.mockImplementation((name) => {
				if (name === 'notionOAuth2Api') return oauthCredentialType;
				if (name === 'oAuth2Api') return baseOAuth2Type;
				if (name === 'trelloOAuth1Api') return oauth1CredentialType;
				if (name === 'oAuth1Api') return baseOAuth1Type;
				if (name === 'notionApi') return apiKeyCredentialType;
				throw new UnrecognizedCredentialTypeError(name);
			});
			credentialTypes.getParentTypes.mockImplementation((name) => {
				if (name === 'notionOAuth2Api') return ['oAuth2Api'];
				if (name === 'trelloOAuth1Api') return ['oAuth1Api'];
				return [];
			});
		});

		it('returns true for an OAuth type whose clientId and clientSecret are overwritten', async () => {
			const instance = await createInstance({
				notionOAuth2Api: { clientId: 'client-id', clientSecret: 'client-secret' },
			});

			expect(instance.isManagedOAuthType('notionOAuth2Api')).toBe(true);
		});

		it('returns true for an OAuth1 type whose consumerKey and consumerSecret are overwritten', async () => {
			const instance = await createInstance({
				trelloOAuth1Api: { consumerKey: 'consumer-key', consumerSecret: 'consumer-secret' },
			});

			expect(instance.isManagedOAuthType('trelloOAuth1Api')).toBe(true);
		});

		it('returns false for an OAuth1 type overwritten with the OAuth2 client fields', async () => {
			// clientId/clientSecret are meaningless for OAuth1; only consumerKey/consumerSecret count.
			const instance = await createInstance({
				trelloOAuth1Api: { clientId: 'client-id', clientSecret: 'client-secret' },
			});

			expect(instance.isManagedOAuthType('trelloOAuth1Api')).toBe(false);
		});

		it('returns false for a non-OAuth type even when overwritten', async () => {
			const instance = await createInstance({
				notionApi: { apiKey: 'key' },
			});

			expect(instance.isManagedOAuthType('notionApi')).toBe(false);
		});

		it('returns false when the client pair is not fully overwritten', async () => {
			const instance = await createInstance({
				notionOAuth2Api: { clientId: 'client-id' },
			});

			expect(instance.isManagedOAuthType('notionOAuth2Api')).toBe(false);
		});

		it('returns false for skip-list types', async () => {
			globalConfig.credentials.overwrite.skipTypes = [
				'notionOAuth2Api',
			] as unknown as CommaSeparatedStringArray<string>;
			const instance = await createInstance({
				notionOAuth2Api: { clientId: 'client-id', clientSecret: 'client-secret' },
			});

			expect(instance.isManagedOAuthType('notionOAuth2Api')).toBe(false);
		});

		it('returns false for unrecognized types', async () => {
			const instance = await createInstance({});
			credentialTypes.recognizes.mockReturnValue(false);

			expect(instance.isManagedOAuthType('somethingUnknown')).toBe(false);
		});
	});

	describe('managed OAuth versions', () => {
		const oauthCredentialType = mock<ICredentialType>({
			name: 'notionOAuth2Api',
			extends: ['oAuth2Api'],
		});
		const baseOAuth2Type = mock<ICredentialType>({ name: 'oAuth2Api', extends: undefined });
		const apiKeyCredentialType = mock<ICredentialType>({ name: 'notionApi', extends: undefined });

		const baseApp = { clientId: 'old-id', clientSecret: 'old-secret' };
		const newApp = { clientId: 'new-id', clientSecret: 'new-secret' };
		const tokens = { access_token: 'token' };

		const createInstance = async (data: Record<string, unknown>) => {
			globalConfig.credentials.overwrite.data = JSON.stringify(data);
			const instance = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);
			await instance.init();
			return instance;
		};

		/** A managed credential: the client fields are empty, so the overwrite supplies them. */
		const managed = (oauthTokenData?: Record<string, unknown>): ICredentialDataDecryptedObject => ({
			clientId: '',
			clientSecret: '',
			...(oauthTokenData ? { oauthTokenData: oauthTokenData as IDataObject } : {}),
		});

		beforeEach(() => {
			credentialTypes.recognizes.mockReturnValue(true);
			credentialTypes.getByName.mockImplementation((name) => {
				if (name === 'notionOAuth2Api') return oauthCredentialType;
				if (name === 'oAuth2Api') return baseOAuth2Type;
				if (name === 'notionApi') return apiKeyCredentialType;
				throw new UnrecognizedCredentialTypeError(name);
			});
			credentialTypes.getParentTypes.mockImplementation((name) =>
				name === 'notionOAuth2Api' ? ['oAuth2Api'] : [],
			);
		});

		describe('without a rollout', () => {
			it('should use the base entry for every credential', async () => {
				const instance = await createInstance({ notionOAuth2Api: baseApp });

				expect(instance.applyOverwrite('notionOAuth2Api', managed(tokens))).toMatchObject(baseApp);
				expect(instance.applyOverwrite('notionOAuth2Api', managed())).toMatchObject(baseApp);
			});

			it('should not read a version from the base entry of a non-OAuth type', async () => {
				const instance = await createInstance({ notionApi: { version: 'v2', apiKey: 'key' } });

				expect(instance.getOverwrites('notionApi')).toEqual({ version: 'v2', apiKey: 'key' });
			});
		});

		describe('during a rollout', () => {
			const rollout = {
				notionOAuth2Api: baseApp,
				__versions: { notionOAuth2Api: { version: 2, ...newApp } },
			};

			it('should use the base app for a credential with tokens and no stored version', async () => {
				const instance = await createInstance(rollout);

				expect(instance.applyOverwrite('notionOAuth2Api', managed(tokens))).toMatchObject(baseApp);
			});

			it('should use the stored version', async () => {
				const instance = await createInstance(rollout);

				expect(
					instance.applyOverwrite(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 2 }),
					),
				).toMatchObject(newApp);
				expect(
					instance.applyOverwrite(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 1 }),
					),
				).toMatchObject(baseApp);
			});

			it('should use the newer app for a credential with no tokens', async () => {
				const instance = await createInstance(rollout);

				expect(instance.applyOverwrite('notionOAuth2Api', managed())).toMatchObject(newApp);
			});

			it('should fail when the stored version matches no app', async () => {
				const instance = await createInstance(rollout);

				expect(() =>
					instance.applyOverwrite(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 5 }),
					),
				).toThrow(ManagedAppUnavailableError);
				expect(() =>
					instance.applyOverwrite(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 5 }),
					),
				).toThrow('Reconnect the credential to continue.');
			});

			it('should keep a user-owned client, whatever the stored version is', async () => {
				const instance = await createInstance(rollout);
				const data = {
					clientId: 'mine',
					clientSecret: 'my-secret',
					oauthTokenData: { ...tokens, [MANAGED_VERSION_KEY]: 5 },
				};

				expect(instance.applyOverwrite('notionOAuth2Api', data)).toMatchObject({
					clientId: 'mine',
					clientSecret: 'my-secret',
				});
				expect(instance.resolveBoundVersion('notionOAuth2Api', data)).toBeUndefined();
			});

			it.each([
				['a string', '2'],
				['zero', 0],
				['a fraction', 1.5],
			])(
				'should fail when the stored version is %s, and not use version 1',
				async (_name, value) => {
					const instance = await createInstance(rollout);
					const data = managed({ ...tokens, [MANAGED_VERSION_KEY]: value });

					expect(() => instance.resolveBoundVersion('notionOAuth2Api', data)).toThrow(
						ManagedAppUnavailableError,
					);
					expect(() => instance.applyOverwrite('notionOAuth2Api', data)).toThrow(
						'Reconnect the credential to continue.',
					);
					expect(instance.getManagedAuthState('notionOAuth2Api', data)).toBe('missing-app');
				},
			);

			it('should give the newer app the fields of the base entry that it does not set', async () => {
				const instance = await createInstance({
					notionOAuth2Api: { ...baseApp, scope: 'read' },
					__versions: { notionOAuth2Api: { version: 2, ...newApp } },
				});

				expect(instance.getOverwrites('notionOAuth2Api')).toEqual({ ...newApp, scope: 'read' });
			});

			it('should return the default app, or the requested app, from getOverwrites', async () => {
				const instance = await createInstance(rollout);

				expect(instance.getOverwrites('notionOAuth2Api')).toEqual(newApp);
				expect(instance.getOverwrites('notionOAuth2Api', 2)).toEqual(newApp);
				expect(instance.getOverwrites('notionOAuth2Api', 1)).toEqual(baseApp);
				expect(() => instance.getOverwrites('notionOAuth2Api', 7)).toThrow(
					ManagedAppUnavailableError,
				);
			});

			it('should not leak versions into the credential data or the overwrites', async () => {
				const instance = await createInstance(rollout);

				expect(instance.getAll()).toEqual({ notionOAuth2Api: baseApp });
				expect(instance.applyOverwrite('notionOAuth2Api', managed())).not.toHaveProperty('version');
			});

			it('should not log an unknown credential type for the versions key', async () => {
				await createInstance(rollout);

				expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('__versions'));
			});

			it('should report managed auth for the resolved app, without failing', async () => {
				const instance = await createInstance(rollout);

				expect(instance.usesManagedAuth('notionOAuth2Api', managed(tokens))).toBe(true);
				expect(
					instance.usesManagedAuth(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 5 }),
					),
				).toBe(false);
			});

			it('should use the version and the rollout of the type that owns the app', async () => {
				const parentApp = { clientId: 'parent-id', clientSecret: 'parent-secret' };
				const instance = await createInstance({
					oAuth2Api: { version: 2, ...parentApp },
					notionOAuth2Api: baseApp,
					__versions: { oAuth2Api: { version: 3, ...newApp } },
				});

				// The child sets its own client, so it keeps its own app and its own version 1.
				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(1);
				expect(instance.getOverwrites('notionOAuth2Api')).toMatchObject(baseApp);
				expect(instance.getNewerAppProperties('notionOAuth2Api')).toEqual([]);
				expect(instance.applyOverwrite('notionOAuth2Api', managed())).toMatchObject(baseApp);
				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(1);
			});

			it('should use the version of the parent for a type that sets no client fields', async () => {
				const instance = await createInstance({
					oAuth2Api: { version: 2, ...baseApp },
					notionOAuth2Api: { scope: 'read' },
				});

				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(2);
				expect(
					instance.applyOverwrite(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 2 }),
					),
				).toMatchObject({ ...baseApp, scope: 'read' });
				// Tokens without a stored version count as version 1, and the parent has no version 1.
				expect(() => instance.applyOverwrite('notionOAuth2Api', managed(tokens))).toThrow(
					'Reconnect the credential to continue.',
				);
			});

			it('should find the newer app of a parent type', async () => {
				const instance = await createInstance({
					oAuth2Api: baseApp,
					__versions: { oAuth2Api: { version: 2, ...newApp } },
				});

				expect(instance.applyOverwrite('notionOAuth2Api', managed())).toMatchObject(newApp);
				expect(instance.applyOverwrite('notionOAuth2Api', managed(tokens))).toMatchObject(baseApp);
			});
		});

		describe('fields of the newer app', () => {
			it('should list the fields that the newer app sets, without the version', async () => {
				const instance = await createInstance({
					notionOAuth2Api: baseApp,
					__versions: { notionOAuth2Api: { version: 2, ...newApp, scope: 'read' } },
				});

				expect(instance.getNewerAppProperties('notionOAuth2Api')).toEqual([
					'clientId',
					'clientSecret',
					'scope',
				]);
			});

			it('should find the fields of the newer app of a parent type', async () => {
				const instance = await createInstance({
					oAuth2Api: baseApp,
					__versions: { oAuth2Api: { version: 2, ...newApp } },
				});

				expect(instance.getNewerAppProperties('notionOAuth2Api')).toEqual([
					'clientId',
					'clientSecret',
				]);
			});

			it('should be empty without a rollout or for a non-OAuth type', async () => {
				const instance = await createInstance({
					notionOAuth2Api: baseApp,
					notionApi: { apiKey: 'k' },
				});

				expect(instance.getNewerAppProperties('notionOAuth2Api')).toEqual([]);
				expect(instance.getNewerAppProperties('notionApi')).toEqual([]);
			});
		});

		describe('getManagedAppVersion', () => {
			const rollout = {
				notionOAuth2Api: baseApp,
				__versions: { notionOAuth2Api: { version: 2, ...newApp } },
			};

			it('should return the version a new credential would use', async () => {
				const instance = await createInstance(rollout);

				expect(instance.getManagedAppVersion('notionOAuth2Api', managed())).toBe(2);
			});

			it('should return the base version for a credential with tokens and no stored version', async () => {
				const instance = await createInstance(rollout);

				expect(instance.getManagedAppVersion('notionOAuth2Api', managed(tokens))).toBe(1);
			});

			it('should return the stored version', async () => {
				const instance = await createInstance(rollout);

				expect(
					instance.getManagedAppVersion(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 2 }),
					),
				).toBe(2);
			});

			it('should return the base version when there is no rollout', async () => {
				const instance = await createInstance({ notionOAuth2Api: baseApp });

				expect(instance.getManagedAppVersion('notionOAuth2Api', managed())).toBe(1);
			});

			it('should return nothing for a user-owned app', async () => {
				const instance = await createInstance(rollout);

				expect(
					instance.getManagedAppVersion('notionOAuth2Api', {
						clientId: 'own-id',
						clientSecret: 'own-secret',
						oauthTokenData: { ...tokens, [MANAGED_VERSION_KEY]: 2 },
					}),
				).toBeUndefined();
			});

			it('should return nothing for a type without an overwrite', async () => {
				const instance = await createInstance(rollout);

				expect(
					instance.getManagedAppVersion('notionApi', { oauthTokenData: tokens }),
				).toBeUndefined();
			});

			it('should report a stored version that has no app in the config', async () => {
				const instance = await createInstance(rollout);

				expect(
					instance.getManagedAppVersion(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 9 }),
					),
				).toBe(9);
			});

			it('should return nothing, and not throw, when the stored version is not valid', async () => {
				const instance = await createInstance(rollout);

				expect(
					instance.getManagedAppVersion(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 'abc' }),
					),
				).toBeUndefined();
			});
		});

		describe('a type without an overwrite', () => {
			it('should leave the credential data unchanged', async () => {
				const instance = await createInstance({
					notionOAuth2Api: baseApp,
					__versions: { notionOAuth2Api: { version: 2, ...newApp } },
				});
				const data = { apiKey: 'own', oauthTokenData: { [MANAGED_VERSION_KEY]: 7 } };

				expect(instance.applyOverwrite('notionApi', data)).toEqual(data);
			});
		});

		describe('after a migration', () => {
			it('should serve the stored version of the base entry and reject any other', async () => {
				const instance = await createInstance({ notionOAuth2Api: { version: 2, ...newApp } });

				expect(
					instance.applyOverwrite(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 2 }),
					),
				).toMatchObject(newApp);
				expect(instance.applyOverwrite('notionOAuth2Api', managed())).toMatchObject(newApp);
				expect(() => instance.applyOverwrite('notionOAuth2Api', managed(tokens))).toThrow(
					ManagedAppUnavailableError,
				);
				expect(instance.getAll()).toEqual({ notionOAuth2Api: newApp });
			});

			it('should accept a next rollout with a greater version', async () => {
				const third = { clientId: 'third-id', clientSecret: 'third-secret' };
				const instance = await createInstance({
					notionOAuth2Api: { version: 2, ...newApp },
					__versions: { notionOAuth2Api: { version: 3, ...third } },
				});

				expect(
					instance.applyOverwrite(
						'notionOAuth2Api',
						managed({ ...tokens, [MANAGED_VERSION_KEY]: 2 }),
					),
				).toMatchObject(newApp);
				expect(instance.applyOverwrite('notionOAuth2Api', managed())).toMatchObject(third);
			});
		});

		describe('default version', () => {
			it('should be the version of the base entry when there is no rollout', async () => {
				const instance = await createInstance({ notionOAuth2Api: baseApp });

				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(1);
			});

			it('should be the version of the base entry after a migration', async () => {
				const instance = await createInstance({ notionOAuth2Api: { version: 2, ...newApp } });

				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(2);
			});

			it('should be the version of the newer app during a rollout', async () => {
				const instance = await createInstance({
					notionOAuth2Api: baseApp,
					__versions: { notionOAuth2Api: { version: 2, ...newApp } },
				});

				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(2);
			});

			it('should be undefined for a type without an overwrite or a non-OAuth type', async () => {
				const instance = await createInstance({ notionApi: { apiKey: 'k' } });

				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBeUndefined();
				expect(instance.getNewConnectionVersion('notionApi', managed())).toBeUndefined();
			});
		});

		describe('version of a new connection', () => {
			const rollout = {
				notionOAuth2Api: baseApp,
				__versions: { notionOAuth2Api: { version: 2, ...newApp } },
			};

			it('should be the default version when the overwrite supplies the client', async () => {
				const instance = await createInstance(rollout);

				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(2);
				// A reconnect of a credential that holds tokens of the old app moves to the default app.
				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed(tokens))).toBe(2);
			});

			it('should be the version of the base entry when there is no rollout', async () => {
				const instance = await createInstance({ notionOAuth2Api: baseApp });

				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(1);
			});

			it('should be undefined for a user-owned app', async () => {
				const instance = await createInstance(rollout);

				expect(
					instance.getNewConnectionVersion('notionOAuth2Api', {
						clientId: 'mine',
						clientSecret: 'my-secret',
					}),
				).toBeUndefined();
			});
		});

		describe('getManagedAuthState', () => {
			const rollout = {
				notionOAuth2Api: baseApp,
				__versions: { notionOAuth2Api: { version: 2, ...newApp } },
			};
			const empty = { clientId: '', clientSecret: '' };

			it('should report a credential that gets its client from the overwrite as managed', async () => {
				const instance = await createInstance(rollout);

				expect(instance.getManagedAuthState('notionOAuth2Api', empty)).toBe('managed');
				expect(instance.usesManagedAuth('notionOAuth2Api', empty)).toBe(true);
			});

			it('should report a stored version that no app has as missing-app', async () => {
				const instance = await createInstance(rollout);
				const data = { ...empty, oauthTokenData: { access_token: 'a', n8n_managed_version: 3 } };

				expect(instance.getManagedAuthState('notionOAuth2Api', data)).toBe('missing-app');
				expect(instance.usesManagedAuth('notionOAuth2Api', data)).toBe(false);
			});

			it('should report a credential with its own client as not-managed', async () => {
				const instance = await createInstance(rollout);
				const data = { clientId: 'own', clientSecret: 'own-secret' };

				expect(instance.getManagedAuthState('notionOAuth2Api', data)).toBe('not-managed');
			});

			it('should report a type without an overwrite as not-managed', async () => {
				const instance = await createInstance(rollout);

				expect(instance.getManagedAuthState('notionApi', {})).toBe('not-managed');
			});
		});

		describe('a payload that does not follow the format', () => {
			const base = { notionOAuth2Api: baseApp };
			const newerThan = (version: unknown) => ({
				...base,
				__versions: { notionOAuth2Api: { version, ...newApp } },
			});

			it.each([
				[
					'an array',
					{ ...base, __versions: { notionOAuth2Api: [{ version: 2, ...newApp }] } },
					'one object',
				],
				['a version that equals the base version', newerThan(1), 'must be greater'],
				[
					'a version below the base version',
					{
						notionOAuth2Api: { version: 3, ...baseApp },
						__versions: { notionOAuth2Api: { version: 2, ...newApp } },
					},
					'must be greater',
				],
				['a version that is not an integer', newerThan(1.5), 'integer "version"'],
				[
					'a missing version',
					{ ...base, __versions: { notionOAuth2Api: newApp } },
					'integer "version"',
				],
				[
					'a missing client field',
					{ ...base, __versions: { notionOAuth2Api: { version: 2, clientId: 'x' } } },
					'must set "clientSecret"',
				],
				[
					'a versions key that is not an object',
					{ ...base, __versions: 'two' },
					'must be an object',
				],
			])('should skip %s and load the rest', async (_name, payload, reason) => {
				const instance = await createInstance(payload);

				expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(reason));
				expect(instance.getOverwrites('notionOAuth2Api')).toEqual(expect.objectContaining(baseApp));
			});

			it('should compare a versions entry with the version of its own base entry', async () => {
				// The child sets its own client. The version of the parent does not apply to it.
				const instance = await createInstance({
					oAuth2Api: { version: 5, clientId: 'parent-id', clientSecret: 'parent-secret' },
					notionOAuth2Api: baseApp,
					__versions: { notionOAuth2Api: { version: 2, ...newApp } },
				});

				expect(logger.warn).not.toHaveBeenCalled();
				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(2);
			});

			it('should compare a versions entry with the base version of a parent type', async () => {
				// The child entry sets no client fields, so it inherits the version of the parent.
				const parentBase = {
					oAuth2Api: { version: 2, ...baseApp },
					notionOAuth2Api: { scope: 'read' },
				};

				await createInstance({
					...parentBase,
					__versions: { notionOAuth2Api: { version: 2, ...newApp } },
				});
				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('must be greater than the version of the base entry (2)'),
				);

				logger.warn.mockClear();
				const instance = await createInstance({
					...parentBase,
					__versions: { notionOAuth2Api: { version: 3, ...newApp } },
				});
				expect(logger.warn).not.toHaveBeenCalled();
				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(3);
			});

			it('should skip a versions entry that has no base entry', async () => {
				const instance = await createInstance({
					__versions: { notionOAuth2Api: { version: 2, ...newApp } },
				});

				expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('needs a base entry'));
				expect(instance.getOverwrites('notionOAuth2Api')).toEqual({});
			});

			it('should skip the versions of a non-OAuth type', async () => {
				const instance = await createInstance({
					notionApi: { apiKey: 'k' },
					__versions: { notionApi: { version: 2, apiKey: 'k2' } },
				});

				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('versions are supported only for OAuth credential types'),
				);
				expect(instance.getOverwrites('notionApi')).toEqual({ apiKey: 'k' });
			});

			it('should ignore an invalid base version and keep the base entry', async () => {
				const instance = await createInstance({ notionOAuth2Api: { version: 0, ...baseApp } });

				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('must be an integer of at least 1'),
				);
				expect(instance.getOverwrites('notionOAuth2Api')).toEqual(baseApp);
				expect(instance.getNewConnectionVersion('notionOAuth2Api', managed())).toBe(1);
			});

			it('should load no overwrites when the payload is not an object', async () => {
				const instance = await createInstance(null as never);

				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('it must be an object keyed by credential type'),
				);
				expect(instance.getOverwrites('notionOAuth2Api')).toEqual({});
			});

			it('should skip an entry that is not an object', async () => {
				const instance = await createInstance({ notionOAuth2Api: [baseApp] });

				expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('must be an object'));
				expect(instance.getOverwrites('notionOAuth2Api')).toEqual({});
			});

			it('should skip a versions entry of a type that this instance does not know', async () => {
				credentialTypes.recognizes.mockImplementation((type) => type !== 'communityOAuth2Api');

				const instance = await createInstance({
					...base,
					communityOAuth2Api: { clientId: 'c', clientSecret: 's' },
					__versions: {
						notionOAuth2Api: { version: 2, ...newApp },
						communityOAuth2Api: { version: 2, clientId: 'c2', clientSecret: 's2' },
					},
				});

				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('this instance does not know the credential type'),
				);
				expect(instance.getOverwrites('notionOAuth2Api')).toMatchObject(newApp);
			});

			it('should replace the overwrites with the valid part of a later payload', async () => {
				const instance = await createInstance(base);

				instance.setPlainData(newerThan(1));

				expect(instance.getAll()).toEqual(base);
				expect(instance.getOverwrites('notionOAuth2Api')).toEqual(baseApp);
			});
		});
	});
});
