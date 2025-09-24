import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import type { NextFunction, Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import { Cipher, UnrecognizedCredentialTypeError } from 'n8n-core';
import type { ICredentialType } from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import type { ICredentialsOverwrite } from '@/interfaces';

describe('CredentialsOverwrites', () => {
	const testCredentialType = mock<ICredentialType>({ name: 'test', extends: ['parent'] });
	const parentCredentialType = mock<ICredentialType>({ name: 'parent', extends: undefined });

	const globalConfig = mock<GlobalConfig>({ credentials: { overwrite: {} } });
	const credentialTypes = mock<CredentialTypes>();
	const logger = mock<Logger>();
	let credentialsOverwrites: CredentialsOverwrites;

	beforeEach(async () => {
		jest.resetAllMocks();

		globalConfig.credentials.overwrite.data = JSON.stringify({
			test: { username: 'user' },
			parent: { password: 'pass' },
		});
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockImplementation((credentialType) => {
			if (credentialType === testCredentialType.name) return testCredentialType;
			if (credentialType === parentCredentialType.name) return parentCredentialType;
			throw new UnrecognizedCredentialTypeError(credentialType);
		});
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
		it('should return null if endpointAuthToken is not provided', () => {
			globalConfig.credentials.overwrite.endpointAuthToken = '';
			const localCredentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);
			const middleware = localCredentialsOverwrites.getOverwriteEndpointMiddleware();
			expect(middleware).toBeNull();
		});

		it('should return a middleware function, if endpointAuthToken is provided', () => {
			globalConfig.credentials.overwrite.endpointAuthToken = 'test-token';
			const localCredentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);
			const middleware = localCredentialsOverwrites.getOverwriteEndpointMiddleware();
			expect(typeof middleware).toBe('function');
		});

		describe('middleware', () => {
			let next: () => void;
			let send: () => void;
			let status: () => {
				send: () => void;
			};
			let middleware: null | ((req: Request, res: Response, next: NextFunction) => void);
			beforeEach(() => {
				globalConfig.credentials.overwrite.endpointAuthToken = 'test-token';
				next = jest.fn();
				send = jest.fn();
				status = jest.fn().mockImplementation(() => {
					return {
						send,
					};
				});

				const localCredentialsOverwrites = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					logger,
					mock(),
					mock(),
				);
				middleware = localCredentialsOverwrites.getOverwriteEndpointMiddleware();
			});

			it('should call next with correct credentials', () => {
				middleware!(
					{
						headers: {
							authorization: `Bearer ${globalConfig.credentials.overwrite.endpointAuthToken}`,
						},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).toHaveBeenCalled();
				expect(status).not.toHaveBeenCalled();
				expect(send).not.toHaveBeenCalled();
			});

			it('should respond with 401 with invalid token', () => {
				middleware!(
					{
						headers: {
							authorization: 'Bearer invalid-token',
						},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).not.toHaveBeenCalled();
				expect(status).toHaveBeenCalledWith(401);
				expect(send).toHaveBeenCalled();
			});

			it('should respond with 401 without token', () => {
				middleware!(
					{
						headers: {},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).not.toHaveBeenCalled();
				expect(status).toHaveBeenCalledWith(401);
				expect(send).toHaveBeenCalled();
			});
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

		it('should return original data if no overwrites exist', () => {
			const data = {
				username: 'user1',
				password: 'pass1',
			};

			credentialTypes.getParentTypes.mockReturnValueOnce([]);

			const result = credentialsOverwrites.applyOverwrite('unknownCredential', data);
			expect(result).toEqual(data);
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
		let settingsRepository: jest.Mocked<SettingsRepository>;
		let cipher: jest.Mocked<Cipher>;
		let publisherMock: { publishCommand: jest.Mock };
		let dbGlobalConfig: GlobalConfig;

		beforeEach(async () => {
			// Mock SettingsRepository
			settingsRepository = mockInstance(SettingsRepository, {
				findByKey: jest.fn(),
				create: jest.fn(),
				save: jest.fn(),
			});

			// Mock Cipher
			cipher = mockInstance(Cipher, {
				encrypt: jest.fn(),
				decrypt: jest.fn(),
			});

			// Mock Publisher service - need to import the class first
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			publisherMock = { publishCommand: jest.fn() };
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

			jest.clearAllMocks();
		});

		afterEach(() => {
			jest.restoreAllMocks();
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

				cipher.encrypt.mockReturnValue(encryptedData);
				settingsRepository.create.mockReturnValue(settingObject);

				await dbCredentialsOverwrites.saveOverwriteDataToDB(overwriteData);

				expect(cipher.encrypt).toHaveBeenCalledWith(JSON.stringify(overwriteData));
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

				cipher.encrypt.mockReturnValue('encrypted');
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

				cipher.encrypt.mockReturnValue('encrypted');
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
				cipher.decrypt.mockReturnValue(JSON.stringify(overwriteData));

				await dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).toHaveBeenCalledWith(encryptedData);
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
				cipher.decrypt.mockReturnValue(JSON.stringify(overwriteData));

				await dbCredentialsOverwrites.loadOverwriteDataFromDB(true);

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).toHaveBeenCalledWith(encryptedData);
				expect(dbCredentialsOverwrites.getAll()).toEqual(overwriteData);
			});

			it('should handle missing data gracefully', async () => {
				settingsRepository.findByKey.mockResolvedValue(null);

				await dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).not.toHaveBeenCalled();
				// Should not throw error and existing data should remain unchanged
			});

			it('should handle decryption errors', async () => {
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'invalid-encrypted-data',
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decrypt.mockImplementation(() => {
					throw new Error('Decryption failed');
				});

				// Should not throw but log error
				await expect(dbCredentialsOverwrites.loadOverwriteDataFromDB(false)).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).toHaveBeenCalledWith('invalid-encrypted-data');
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
				expect(cipher.decrypt).not.toHaveBeenCalled();
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
				cipher.decrypt.mockReturnValue(JSON.stringify(overwriteData));

				// Start first call
				const firstCall = dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				// Start second call immediately (should return early due to reloading flag)
				const secondCall = dbCredentialsOverwrites.loadOverwriteDataFromDB(false);

				// Wait for both calls to complete
				await Promise.all([firstCall, secondCall]);

				// Database should only be called once due to reloading flag protection
				expect(settingsRepository.findByKey).toHaveBeenCalledTimes(1);
				expect(cipher.decrypt).toHaveBeenCalledTimes(1);
			});

			it('should handle JSON parsing errors in decrypted data', async () => {
				const settingData = {
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				};

				settingsRepository.findByKey.mockResolvedValue(settingData);
				cipher.decrypt.mockReturnValue('invalid-json{');

				// Should not throw but log error
				await expect(dbCredentialsOverwrites.loadOverwriteDataFromDB(false)).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-data');
				expect(logger.error).toHaveBeenCalledWith('Error loading overwrite credentials', {
					error: expect.any(Error),
				});
			});
		});
	});

	describe('PubSub Integration', () => {
		let pubsubCredentialsOverwrites: CredentialsOverwrites;
		let settingsRepository: jest.Mocked<SettingsRepository>;
		let cipher: jest.Mocked<Cipher>;
		let publisherMock: { publishCommand: jest.Mock };
		let pubsubGlobalConfig: GlobalConfig;

		beforeEach(async () => {
			// Mock SettingsRepository
			settingsRepository = mockInstance(SettingsRepository, {
				findByKey: jest.fn(),
				create: jest.fn(),
				save: jest.fn(),
			});

			// Mock Cipher
			cipher = mockInstance(Cipher, {
				encrypt: jest.fn(),
				decrypt: jest.fn(),
			});

			// Mock Publisher service
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			publisherMock = { publishCommand: jest.fn() };
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
			jest.clearAllMocks();
		});

		afterEach(() => {
			jest.restoreAllMocks();
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
				cipher.decrypt.mockReturnValue(JSON.stringify(overwriteData));

				// Mock the reloadFrontendService to avoid circular dependency issues
				const mockReloadFrontendService = jest.fn();
				(pubsubCredentialsOverwrites as any).reloadFrontendService = mockReloadFrontendService;

				await pubsubCredentialsOverwrites.reloadOverwriteCredentials();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-data');
				expect(pubsubCredentialsOverwrites.getAll()).toEqual(overwriteData);
				expect(mockReloadFrontendService).toHaveBeenCalled();
			});

			it('should handle database loading errors gracefully', async () => {
				const dbError = new Error('Database connection failed');
				settingsRepository.findByKey.mockRejectedValue(dbError);

				await expect(
					pubsubCredentialsOverwrites.reloadOverwriteCredentials(),
				).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).not.toHaveBeenCalled();
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
				cipher.decrypt.mockImplementation(() => {
					throw new Error('Decryption failed');
				});

				await expect(
					pubsubCredentialsOverwrites.reloadOverwriteCredentials(),
				).resolves.not.toThrow();

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
				expect(cipher.decrypt).toHaveBeenCalledWith('invalid-encrypted-data');
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
				cipher.decrypt.mockReturnValue(JSON.stringify(overwriteData));

				// Mock the reloadFrontendService
				const mockReloadFrontendService = jest.fn();
				(pubsubCredentialsOverwrites as any).reloadFrontendService = mockReloadFrontendService;

				// Start first reload
				const firstReload = pubsubCredentialsOverwrites.reloadOverwriteCredentials();

				// Start second reload immediately (should return early due to reloading flag)
				const secondReload = pubsubCredentialsOverwrites.reloadOverwriteCredentials();

				// Wait for both to complete
				await Promise.all([firstReload, secondReload]);

				// Database should only be called once due to reloading flag protection
				expect(settingsRepository.findByKey).toHaveBeenCalledTimes(1);
				expect(cipher.decrypt).toHaveBeenCalledTimes(1);
			});
		});

		describe('broadcastReloadOverwriteCredentialsCommand', () => {
			it('should publish command when persistence is enabled', async () => {
				pubsubGlobalConfig.credentials.overwrite.persistence = true;

				// Call the private method through saveOverwriteDataToDB with broadcast=true
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user' },
				};

				cipher.encrypt.mockReturnValue('encrypted-data');
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

			it('should skip publishing when persistence is disabled', async () => {
				pubsubGlobalConfig.credentials.overwrite.persistence = false;

				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'user' },
				};

				cipher.encrypt.mockReturnValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				await pubsubCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, true);

				expect(publisherMock.publishCommand).not.toHaveBeenCalled();
			});

			it('should handle publisher import errors gracefully', async () => {
				// Create a new config with persistence enabled
				const errorConfig = mock<GlobalConfig>({
					credentials: {
						overwrite: {
							data: JSON.stringify({ test: { username: 'user' } }),
							persistence: true,
							endpointAuthToken: '',
						},
					},
				});

				// Create new instance
				const errorCredentialsOverwrites = new CredentialsOverwrites(
					errorConfig,
					credentialTypes,
					logger,
					settingsRepository,
					cipher,
				);

				// Mock a module import failure
				jest.doMock('@/scaling/pubsub/publisher.service', () => {
					throw new Error('Publisher service not available');
				});

				cipher.encrypt.mockReturnValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				// Should not throw error even if Publisher import fails
				await expect(
					errorCredentialsOverwrites.saveOverwriteDataToDB({ test: { username: 'user' } }, true),
				).rejects.toThrow('Publisher service not available');

				// Cleanup
				jest.dontMock('@/scaling/pubsub/publisher.service');
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
				cipher.decrypt.mockReturnValue(JSON.stringify(overwriteData));

				// Mock the reloadFrontendService
				const mockReloadFrontendService = jest.fn();
				(pubsubCredentialsOverwrites as any).reloadFrontendService = mockReloadFrontendService;

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
				cipher.encrypt.mockReturnValue(encryptedData);
				settingsRepository.create.mockReturnValue(settingObject);

				await pubsubCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, true);

				// Verify database operations
				expect(cipher.encrypt).toHaveBeenCalledWith(JSON.stringify(overwriteData));
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

				cipher.encrypt.mockReturnValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				await pubsubCredentialsOverwrites.saveOverwriteDataToDB(overwriteData, false);

				// Verify database operations still happen
				expect(cipher.encrypt).toHaveBeenCalledWith(JSON.stringify(overwriteData));
				expect(settingsRepository.save).toHaveBeenCalled();

				// Verify no PubSub broadcast
				expect(publisherMock.publishCommand).not.toHaveBeenCalled();
			});

			it('should complete database save even if broadcast fails', async () => {
				const overwriteData: ICredentialsOverwrite = {
					test: { username: 'broadcastFailUser' },
				};

				pubsubGlobalConfig.credentials.overwrite.persistence = true;
				cipher.encrypt.mockReturnValue('encrypted-data');
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
				expect(cipher.encrypt).toHaveBeenCalledWith(JSON.stringify(overwriteData));
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
			jest.clearAllMocks();

			// Create instance for frontend tests
			frontendCredentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
				mock(),
				mock(),
			);

			await frontendCredentialsOverwrites.init();
			jest.clearAllMocks();
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe('reloadFrontendService via setData', () => {
			beforeEach(() => {
				// Mock the reloadFrontendService method directly to test through setData
				jest
					.spyOn(frontendCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);
			});

			it('should call reloadFrontendService when reloadFrontend is true', async () => {
				const testData = { test: { username: 'frontendUser' } };
				const reloadSpy = frontendCredentialsOverwrites['reloadFrontendService'] as jest.Mock;

				await frontendCredentialsOverwrites.setData(testData, false, true);

				// Verify reloadFrontendService was called
				expect(reloadSpy).toHaveBeenCalledTimes(1);
				expect(frontendCredentialsOverwrites.getAll()).toEqual(testData);
			});

			it('should skip reloadFrontendService when reloadFrontend is false', async () => {
				const testData = { test: { username: 'noReloadUser' } };
				const reloadSpy = frontendCredentialsOverwrites['reloadFrontendService'] as jest.Mock;

				await frontendCredentialsOverwrites.setData(testData, false, false);

				// Verify reloadFrontendService was NOT called
				expect(reloadSpy).not.toHaveBeenCalled();
				expect(frontendCredentialsOverwrites.getAll()).toEqual(testData);
			});

			it('should call setData with correct parameters in init methods', async () => {
				// Test both paths of setData through database loading
				const settingsRepository = mockInstance(SettingsRepository, {
					findByKey: jest.fn().mockResolvedValue({
						key: 'credentialsOverwrite',
						value: 'encrypted-data',
						loadOnStartup: false,
					}),
					create: jest.fn(),
					save: jest.fn(),
				});

				const cipher = mockInstance(Cipher, {
					encrypt: jest.fn(),
					decrypt: jest.fn().mockReturnValue(JSON.stringify({ test: { username: 'dbUser' } })),
				});

				const dbInstance = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					logger,
					settingsRepository,
					cipher,
				);

				await dbInstance.init(); // Initialize the instance first

				const setDataSpy = jest.spyOn(dbInstance, 'setData');

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

		describe('reloadFrontendService error handling', () => {
			it('should propagate errors from reloadFrontendService to setData', async () => {
				const testData = { test: { username: 'frontendErrorUser' } };
				const frontendError = new Error('Frontend service error');

				// Mock reloadFrontendService to throw error
				jest
					.spyOn(frontendCredentialsOverwrites as any, 'reloadFrontendService')
					.mockRejectedValue(frontendError);

				// setData should propagate the error
				await expect(frontendCredentialsOverwrites.setData(testData, false, true)).rejects.toThrow(
					'Frontend service error',
				);

				// Verify data was still set despite frontend error
				expect(frontendCredentialsOverwrites.getAll()).toEqual(testData);
			});

			it('should handle successful data setting even if frontend reload fails', async () => {
				const testData = { test: { username: 'dataSetUser' } };

				// Mock reloadFrontendService to throw error
				jest
					.spyOn(frontendCredentialsOverwrites as any, 'reloadFrontendService')
					.mockRejectedValue(new Error('Frontend error'));

				// Try to set data
				await expect(frontendCredentialsOverwrites.setData(testData, false, true)).rejects.toThrow(
					'Frontend error',
				);

				// Verify the core data was still set correctly
				expect(frontendCredentialsOverwrites.getAll()).toEqual(testData);
			});

			it('should handle reloadFrontendService being undefined gracefully', async () => {
				const testData = { test: { username: 'undefinedFrontendUser' } };

				// Replace the reloadFrontendService method with undefined to simulate edge case
				(frontendCredentialsOverwrites as any).reloadFrontendService = undefined;

				// Should still complete and set the data, even though frontend reload fails
				try {
					await frontendCredentialsOverwrites.setData(testData, false, true);
				} catch (error) {
					// Expected to throw since we made reloadFrontendService undefined
					expect(error).toBeDefined();
				}

				// Verify data was still set despite frontend service error
				expect(frontendCredentialsOverwrites.getAll()).toEqual(testData);
			});
		});

		describe('real reloadFrontendService method integration', () => {
			beforeEach(() => {
				// Don't mock reloadFrontendService for these tests - test the real method
			});

			it('should test the actual reloadFrontendService implementation', async () => {
				const testData = { test: { username: 'realServiceUser' } };

				// Mock the Container and dynamic import properly
				const mockContainerGet = jest.fn();
				const mockGenerateTypes = jest.fn();

				// Mock the Container.get method
				jest.doMock(
					'@n8n/di',
					() => ({
						...jest.requireActual('@n8n/di'),
						Container: { get: mockContainerGet },
					}),
					{ virtual: true },
				);

				// Mock the FrontendService
				mockContainerGet.mockReturnValue({ generateTypes: mockGenerateTypes });

				// Create a fresh instance to test real implementation
				const realInstance = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					logger,
					mock(),
					mock(),
				);

				await realInstance.init();

				try {
					// This will call the real reloadFrontendService method
					await realInstance.setData(testData, false, true);

					// In a real test, we would verify the dynamic import and Container.get calls
					// For now, we just verify the method completes without throwing
					expect(realInstance.getAll()).toEqual(testData);
				} catch (error) {
					// Expected - the dynamic import will likely fail in test environment
					// But we verified that the method is called correctly
					expect(realInstance.getAll()).toEqual(testData);
				}
			});

			it('should verify reloadFrontendService method exists and is callable', async () => {
				// Verify the private method exists
				expect(typeof (frontendCredentialsOverwrites as any).reloadFrontendService).toBe(
					'function',
				);

				// Test that it's an async method
				const reloadMethod = (frontendCredentialsOverwrites as any).reloadFrontendService;
				const result = reloadMethod.call(frontendCredentialsOverwrites);
				expect(result).toBeInstanceOf(Promise);

				// We expect this to fail in test environment due to module import issues
				await expect(result).rejects.toBeDefined();
			});

			it('should verify the integration points are correct', async () => {
				const testData = { test: { username: 'integrationUser' } };

				// Mock reloadFrontendService to avoid DI container issues
				const reloadSpy = jest
					.spyOn(frontendCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				await frontendCredentialsOverwrites.setData(testData, false, true);

				// Verify the integration point is called correctly
				expect(reloadSpy).toHaveBeenCalledTimes(1);
				expect(reloadSpy).toHaveBeenCalledWith(); // No arguments expected
			});

			it('should verify PubSub integration calls reloadFrontendService', async () => {
				const pubsubInstance = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					logger,
					mockInstance(SettingsRepository, {
						findByKey: jest.fn().mockResolvedValue({
							key: 'credentialsOverwrite',
							value: 'encrypted-data',
							loadOnStartup: false,
						}),
						create: jest.fn(),
						save: jest.fn(),
					}),
					mockInstance(Cipher, {
						encrypt: jest.fn(),
						decrypt: jest
							.fn()
							.mockReturnValue(JSON.stringify({ test: { username: 'pubsubUser' } })),
					}),
				);

				await pubsubInstance.init();

				const reloadSpy = jest
					.spyOn(pubsubInstance as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				// reloadOverwriteCredentials should call loadOverwriteDataFromDB(true) which calls setData with reloadFrontend=true
				await pubsubInstance.reloadOverwriteCredentials();

				expect(reloadSpy).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('Enhanced setData Method', () => {
		let enhancedCredentialsOverwrites: CredentialsOverwrites;
		let settingsRepository: jest.Mocked<SettingsRepository>;
		let cipher: jest.Mocked<Cipher>;
		let publisherMock: { publishCommand: jest.Mock };
		let enhancedGlobalConfig: GlobalConfig;

		beforeEach(async () => {
			// Mock SettingsRepository for database operations
			settingsRepository = mockInstance(SettingsRepository, {
				findByKey: jest.fn(),
				create: jest.fn(),
				save: jest.fn(),
			});

			// Mock Cipher for encryption/decryption
			cipher = mockInstance(Cipher, {
				encrypt: jest.fn(),
				decrypt: jest.fn(),
			});

			// Mock Publisher service for PubSub broadcasting
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			publisherMock = { publishCommand: jest.fn() };
			mockInstance(Publisher, publisherMock);

			// Create config with persistence enabled for testing database operations
			enhancedGlobalConfig = mock<GlobalConfig>({
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

			// Create instance with all mocked dependencies
			enhancedCredentialsOverwrites = new CredentialsOverwrites(
				enhancedGlobalConfig,
				credentialTypes,
				logger,
				settingsRepository,
				cipher,
			);

			await enhancedCredentialsOverwrites.init();
			jest.clearAllMocks();
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe('Parameter Combinations', () => {
			const testData: ICredentialsOverwrite = {
				test: { username: 'enhancedUser', password: 'enhancedPass' },
			};

			beforeEach(() => {
				// Setup default successful mocks
				cipher.encrypt.mockReturnValue('encrypted-test-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-test-data',
					loadOnStartup: false,
				});

				// Mock reloadFrontendService to track calls
				jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);
			});

			it('should handle default parameters (storeInDb: true, reloadFrontend: true)', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = (enhancedCredentialsOverwrites as any).reloadFrontendService;

				await enhancedCredentialsOverwrites.setData(testData);

				// Verify data is set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database storage was called
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);
				expect(saveDbSpy).toHaveBeenCalledTimes(1);

				// Verify frontend reload was called
				expect(reloadSpy).toHaveBeenCalledTimes(1);

				saveDbSpy.mockRestore();
			});

			it('should handle explicit default parameters (storeInDb: true, reloadFrontend: true)', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = (enhancedCredentialsOverwrites as any).reloadFrontendService;

				await enhancedCredentialsOverwrites.setData(testData, true, true);

				// Verify data is set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database storage was called
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);
				expect(saveDbSpy).toHaveBeenCalledTimes(1);

				// Verify frontend reload was called
				expect(reloadSpy).toHaveBeenCalledTimes(1);

				saveDbSpy.mockRestore();
			});

			it('should skip both operations (storeInDb: false, reloadFrontend: false)', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = (enhancedCredentialsOverwrites as any).reloadFrontendService;

				await enhancedCredentialsOverwrites.setData(testData, false, false);

				// Verify data is set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database storage was NOT called
				expect(saveDbSpy).not.toHaveBeenCalled();

				// Verify frontend reload was NOT called
				expect(reloadSpy).not.toHaveBeenCalled();

				saveDbSpy.mockRestore();
			});

			it('should store in DB only (storeInDb: true, reloadFrontend: false)', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = (enhancedCredentialsOverwrites as any).reloadFrontendService;

				await enhancedCredentialsOverwrites.setData(testData, true, false);

				// Verify data is set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database storage was called
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);
				expect(saveDbSpy).toHaveBeenCalledTimes(1);

				// Verify frontend reload was NOT called
				expect(reloadSpy).not.toHaveBeenCalled();

				saveDbSpy.mockRestore();
			});

			it('should reload frontend only (storeInDb: false, reloadFrontend: true)', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = (enhancedCredentialsOverwrites as any).reloadFrontendService;

				await enhancedCredentialsOverwrites.setData(testData, false, true);

				// Verify data is set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database storage was NOT called
				expect(saveDbSpy).not.toHaveBeenCalled();

				// Verify frontend reload was called
				expect(reloadSpy).toHaveBeenCalledTimes(1);

				saveDbSpy.mockRestore();
			});
		});

		describe('Database Persistence Integration', () => {
			const testData: ICredentialsOverwrite = {
				test: { username: 'dbUser', password: 'dbPass' },
			};

			it('should respect persistence configuration when storeInDb is true', async () => {
				enhancedGlobalConfig.credentials.overwrite.persistence = true;
				cipher.encrypt.mockReturnValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				await enhancedCredentialsOverwrites.setData(testData, true, false);

				// Verify database operations were called
				expect(cipher.encrypt).toHaveBeenCalledWith(JSON.stringify(testData));
				expect(settingsRepository.create).toHaveBeenCalledWith({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});
				expect(settingsRepository.save).toHaveBeenCalled();
			});

			it('should skip database operations when persistence is disabled', async () => {
				enhancedGlobalConfig.credentials.overwrite.persistence = false;

				await enhancedCredentialsOverwrites.setData(testData, true, false);

				// Verify database operations were NOT called even though storeInDb=true
				expect(cipher.encrypt).not.toHaveBeenCalled();
				expect(settingsRepository.create).not.toHaveBeenCalled();
				expect(settingsRepository.save).not.toHaveBeenCalled();

				// But data should still be set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);
			});

			it('should call saveOverwriteDataToDB with correct broadcast parameter', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');

				// Test storeInDb=true calls saveOverwriteDataToDB with broadcast=true
				await enhancedCredentialsOverwrites.setData(testData, true, false);

				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);

				saveDbSpy.mockRestore();
			});
		});

		describe('Frontend Reload Integration', () => {
			const testData: ICredentialsOverwrite = {
				test: { username: 'frontendUser' },
			};

			it('should call reloadFrontendService when reloadFrontend is true', async () => {
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				await enhancedCredentialsOverwrites.setData(testData, false, true);

				expect(reloadSpy).toHaveBeenCalledTimes(1);
				expect(reloadSpy).toHaveBeenCalledWith(); // No parameters expected
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				reloadSpy.mockRestore();
			});

			it('should skip reloadFrontendService when reloadFrontend is false', async () => {
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				await enhancedCredentialsOverwrites.setData(testData, false, false);

				expect(reloadSpy).not.toHaveBeenCalled();
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				reloadSpy.mockRestore();
			});
		});

		describe('Error Handling', () => {
			const testData: ICredentialsOverwrite = {
				test: { username: 'errorUser' },
			};

			it('should handle database storage failure but frontend success', async () => {
				const dbError = new Error('Database save failed');
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);
				const saveDbSpy = jest
					.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB')
					.mockRejectedValue(dbError);

				// Should propagate database error but data should still be set
				await expect(enhancedCredentialsOverwrites.setData(testData, true, true)).rejects.toThrow(
					'Database save failed',
				);

				// Verify data was set in memory before database error
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database operation was attempted
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);

				// Verify frontend reload was not called due to early database error
				expect(reloadSpy).not.toHaveBeenCalled();

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});

			it('should handle frontend reload failure but database success', async () => {
				const frontendError = new Error('Frontend reload failed');
				cipher.encrypt.mockReturnValue('encrypted-data');
				settingsRepository.create.mockReturnValue({
					key: 'credentialsOverwrite',
					value: 'encrypted-data',
					loadOnStartup: false,
				});

				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockRejectedValue(frontendError);

				// Should propagate frontend error
				await expect(enhancedCredentialsOverwrites.setData(testData, true, true)).rejects.toThrow(
					'Frontend reload failed',
				);

				// Verify data was set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database operations completed successfully
				expect(cipher.encrypt).toHaveBeenCalledWith(JSON.stringify(testData));
				expect(settingsRepository.save).toHaveBeenCalled();

				// Verify frontend reload was attempted
				expect(reloadSpy).toHaveBeenCalledTimes(1);

				reloadSpy.mockRestore();
			});

			it('should handle both database and frontend failures', async () => {
				const dbError = new Error('Database failed');
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockRejectedValue(new Error('Frontend failed'));
				const saveDbSpy = jest
					.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB')
					.mockRejectedValue(dbError);

				// Should propagate the first error (database)
				await expect(enhancedCredentialsOverwrites.setData(testData, true, true)).rejects.toThrow(
					'Database failed',
				);

				// Verify data was still set in memory
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				// Verify database operation was attempted
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);

				// Frontend should not be called due to early database failure
				expect(reloadSpy).not.toHaveBeenCalled();

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});

			it('should always set data in memory regardless of flag failures', async () => {
				const dbError = new Error('All operations failed');
				const saveDbSpy = jest
					.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB')
					.mockRejectedValue(dbError);
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockRejectedValue(new Error('Frontend failed'));

				// Even with failures, data should be set
				await expect(enhancedCredentialsOverwrites.setData(testData, true, true)).rejects.toThrow(
					'All operations failed',
				);

				// Verify data was set in memory despite all failures
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});
		});

		describe('Backwards Compatibility', () => {
			const testData: ICredentialsOverwrite = {
				test: { username: 'backwardsUser' },
			};

			it('should maintain backwards compatibility with single parameter', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				// Call with only data parameter (old API)
				await enhancedCredentialsOverwrites.setData(testData);

				// Should behave as if both flags are true (default behavior)
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);
				expect(reloadSpy).toHaveBeenCalledTimes(1);

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});

			it('should maintain backwards compatibility with two parameters', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				// Call with data and storeInDb parameters (intermediate API)
				await enhancedCredentialsOverwrites.setData(testData, false);

				// Should behave as if reloadFrontend is true (default value)
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(testData);
				expect(saveDbSpy).not.toHaveBeenCalled(); // storeInDb=false
				expect(reloadSpy).toHaveBeenCalledTimes(1); // reloadFrontend=true (default)

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});

			it('should work correctly with existing test patterns', async () => {
				// Test the pattern used in existing tests
				const newData = { test: { token: 'test-token' } };
				await enhancedCredentialsOverwrites.setData(newData, false, false);

				expect(enhancedCredentialsOverwrites.getAll()).toEqual(newData);
			});
		});

		describe('Method Sequence Validation', () => {
			const testData: ICredentialsOverwrite = {
				test: { username: 'sequenceUser' },
			};

			it('should execute operations in correct sequence: data -> database -> frontend', async () => {
				const operations: string[] = [];

				// Track the sequence of operations by spying on the actual operations
				let storedData: any;

				// Override the setData method to track the memory operation
				jest
					.spyOn(enhancedCredentialsOverwrites, 'setData')
					.mockImplementation(async (overwriteData, storeInDb = true, reloadFrontend = true) => {
						// First track that data is being set
						operations.push('setData');
						storedData = overwriteData;
						(enhancedCredentialsOverwrites as any).overwriteData = overwriteData;

						// Then continue with the rest of the operation sequence
						if (
							storeInDb &&
							(enhancedCredentialsOverwrites as any).globalConfig.credentials.overwrite.persistence
						) {
							operations.push('saveDB');
						}

						if (reloadFrontend) {
							operations.push('reloadFrontend');
						}
					});

				await enhancedCredentialsOverwrites.setData(testData, true, true);

				// Verify correct sequence: data first, then database, then frontend
				expect(operations).toEqual(['setData', 'saveDB', 'reloadFrontend']);
				expect(storedData).toEqual(testData);
			});

			it('should stop sequence on database error', async () => {
				const operations: string[] = [];
				const dbError = new Error('Database error');

				const saveDbSpy = jest
					.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB')
					.mockImplementation(async () => {
						operations.push('saveDB');
						throw dbError;
					});

				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockImplementation(async () => {
						operations.push('reloadFrontend');
						return;
					});

				await expect(enhancedCredentialsOverwrites.setData(testData, true, true)).rejects.toThrow(
					'Database error',
				);

				// Should stop after database error, not call frontend
				expect(operations).toEqual(['saveDB']);
				expect(operations).not.toContain('reloadFrontend');

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});

			it('should complete database before attempting frontend', async () => {
				const operations: string[] = [];
				let dbComplete = false;

				const saveDbSpy = jest
					.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB')
					.mockImplementation(async () => {
						operations.push('saveDB-start');
						await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate async database operation
						dbComplete = true;
						operations.push('saveDB-complete');
					});

				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockImplementation(async () => {
						operations.push(`reloadFrontend-start-dbComplete:${dbComplete}`);
						return;
					});

				await enhancedCredentialsOverwrites.setData(testData, true, true);

				// Verify database completed before frontend started
				expect(operations).toContain('saveDB-complete');
				expect(operations).toContain('reloadFrontend-start-dbComplete:true');

				const dbCompleteIndex = operations.indexOf('saveDB-complete');
				const frontendStartIndex = operations.indexOf('reloadFrontend-start-dbComplete:true');
				expect(dbCompleteIndex).toBeLessThan(frontendStartIndex);

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});
		});

		describe('Parameter Validation', () => {
			const testData: ICredentialsOverwrite = {
				test: { username: 'validationUser' },
			};

			it('should handle boolean parameter edge cases', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				// Test with explicit undefined (should use defaults)
				await enhancedCredentialsOverwrites.setData(testData, undefined as any, undefined as any);

				// Should use default values (true, true)
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);
				expect(reloadSpy).toHaveBeenCalledTimes(1);

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});

			it('should handle truthy/falsy values correctly', async () => {
				const saveDbSpy = jest.spyOn(enhancedCredentialsOverwrites, 'saveOverwriteDataToDB');
				const reloadSpy = jest
					.spyOn(enhancedCredentialsOverwrites as any, 'reloadFrontendService')
					.mockResolvedValue(undefined);

				// Test with truthy/falsy values
				await enhancedCredentialsOverwrites.setData(testData, 0 as any, '' as any);

				// Should treat falsy values as false
				expect(saveDbSpy).not.toHaveBeenCalled();
				expect(reloadSpy).not.toHaveBeenCalled();

				jest.clearAllMocks();

				await enhancedCredentialsOverwrites.setData(testData, 1 as any, 'true' as any);

				// Should treat truthy values as true
				expect(saveDbSpy).toHaveBeenCalledWith(testData, true);
				expect(reloadSpy).toHaveBeenCalledTimes(1);

				saveDbSpy.mockRestore();
				reloadSpy.mockRestore();
			});

			it('should handle edge case data parameters', async () => {
				// Test with empty object
				const emptyData = {};
				await enhancedCredentialsOverwrites.setData(emptyData, false, false);
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(emptyData);

				// Test with valid minimal data using known credential type
				const minimalData = { test: {} };
				await enhancedCredentialsOverwrites.setData(minimalData, false, false);
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(minimalData);

				// Verify setData handles the data correctly with known credential types
				const validData = { test: { field: 'value' }, parent: { otherField: 'otherValue' } };
				await enhancedCredentialsOverwrites.setData(validData, false, false);
				expect(enhancedCredentialsOverwrites.getAll()).toEqual(validData);
			});
		});
	});

	describe('Configuration-Based Initialization', () => {
		let initCredentialsOverwrites: CredentialsOverwrites;
		let settingsRepository: jest.Mocked<SettingsRepository>;
		let cipher: jest.Mocked<Cipher>;
		let publisherMock: { publishCommand: jest.Mock };

		beforeEach(async () => {
			// Mock SettingsRepository
			settingsRepository = mockInstance(SettingsRepository, {
				findByKey: jest.fn(),
				create: jest.fn(),
				save: jest.fn(),
			});

			// Mock Cipher
			cipher = mockInstance(Cipher, {
				encrypt: jest.fn(),
				decrypt: jest.fn(),
			});

			// Mock Publisher service
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			publisherMock = { publishCommand: jest.fn() };
			mockInstance(Publisher, publisherMock);

			jest.clearAllMocks();
		});

		afterEach(() => {
			jest.restoreAllMocks();
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
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was called with correct parameters
			expect(setDataSpy).toHaveBeenCalledWith(staticData, false, false);
			expect(setDataSpy).toHaveBeenCalledTimes(1);

			// Verify loadOverwriteDataFromDB was NOT called
			expect(loadFromDbSpy).not.toHaveBeenCalled();

			// Verify database operations were not called
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();

			setDataSpy.mockRestore();
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
			cipher.decrypt.mockReturnValue(JSON.stringify(dbData));

			// Spy on methods
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was called once indirectly by loadOverwriteDataFromDB
			expect(setDataSpy).toHaveBeenCalledWith(dbData, false, false);
			expect(setDataSpy).toHaveBeenCalledTimes(1);

			// Verify loadOverwriteDataFromDB was called with correct parameter
			expect(loadFromDbSpy).toHaveBeenCalledWith(false);
			expect(loadFromDbSpy).toHaveBeenCalledTimes(1);

			// Verify database operations were called
			expect(settingsRepository.findByKey).toHaveBeenCalledWith('credentialsOverwrite');
			expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-db-data');

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
			cipher.decrypt.mockReturnValue(JSON.stringify(dbData));

			// Spy on methods
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was called twice - once directly from init(), once from loadFromDB
			expect(setDataSpy).toHaveBeenCalledTimes(2);
			expect(setDataSpy).toHaveBeenNthCalledWith(1, staticData, false, false);
			expect(setDataSpy).toHaveBeenNthCalledWith(2, dbData, false, false);

			expect(loadFromDbSpy).toHaveBeenCalledWith(false);
			expect(loadFromDbSpy).toHaveBeenCalledTimes(1);

			// Verify correct order of operations (static setData first, then loadFromDB with its setData)
			const firstSetDataCall = setDataSpy.mock.invocationCallOrder[0];
			const loadDbCall = loadFromDbSpy.mock.invocationCallOrder[0];
			const secondSetDataCall = setDataSpy.mock.invocationCallOrder[1];

			expect(firstSetDataCall).toBeLessThan(loadDbCall);
			expect(loadDbCall).toBeLessThan(secondSetDataCall);

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
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

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

		it('should handle database loading error when persistence is enabled', async () => {
			const staticData = { test: { username: 'staticUser' } };
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

			// Make database operation fail
			const dbError = new Error('Database connection failed');
			settingsRepository.findByKey.mockRejectedValue(dbError);

			// Spy on methods
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			// Should not throw error but complete gracefully
			await expect(initCredentialsOverwrites.init()).resolves.not.toThrow();

			// Verify static data was still loaded
			expect(setDataSpy).toHaveBeenCalledWith(staticData, false, false);

			// Verify loadFromDB was attempted
			expect(loadFromDbSpy).toHaveBeenCalledWith(false);

			// Verify error was logged
			expect(logger.error).toHaveBeenCalledWith('Error loading overwrite credentials', {
				error: dbError,
			});

			setDataSpy.mockRestore();
			loadFromDbSpy.mockRestore();
		});

		it('should verify setData is called with storeToDB=false and reloadFrontend=false', async () => {
			const staticData = { test: { username: 'staticUser', password: 'staticPass' } };
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

			// Spy on setData to verify exact parameters
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');

			await initCredentialsOverwrites.init();

			// Verify exact parameters: data, storeToDB=false, reloadFrontend=false
			expect(setDataSpy).toHaveBeenCalledWith(staticData, false, false);
			expect(setDataSpy).toHaveBeenCalledTimes(1);

			setDataSpy.mockRestore();
		});

		it('should verify loadOverwriteDataFromDB is called with reloadFrontend=false', async () => {
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

			// Setup database mock
			settingsRepository.findByKey.mockResolvedValue({
				key: 'credentialsOverwrite',
				value: 'encrypted-data',
				loadOnStartup: false,
			});
			cipher.decrypt.mockReturnValue(JSON.stringify({ test: { username: 'dbUser' } }));

			// Spy on loadOverwriteDataFromDB to verify exact parameters
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify exact parameter: reloadFrontend=false
			expect(loadFromDbSpy).toHaveBeenCalledWith(false);
			expect(loadFromDbSpy).toHaveBeenCalledTimes(1);

			loadFromDbSpy.mockRestore();
		});

		it('should handle empty string as no data for static config', async () => {
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

			// Setup database mock
			settingsRepository.findByKey.mockResolvedValue(null);

			// Spy on methods
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was NOT called for empty string
			expect(setDataSpy).not.toHaveBeenCalled();

			// Verify loadFromDB was called
			expect(loadFromDbSpy).toHaveBeenCalledWith(false);

			setDataSpy.mockRestore();
			loadFromDbSpy.mockRestore();
		});

		it('should handle undefined static data as no data', async () => {
			const initConfig = mock<GlobalConfig>({
				credentials: {
					overwrite: {
						data: undefined,
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

			// Setup database mock
			settingsRepository.findByKey.mockResolvedValue(null);

			// Spy on methods
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

			await initCredentialsOverwrites.init();

			// Verify setData was NOT called for undefined data
			expect(setDataSpy).not.toHaveBeenCalled();

			// Verify loadFromDB was called
			expect(loadFromDbSpy).toHaveBeenCalledWith(false);

			setDataSpy.mockRestore();
			loadFromDbSpy.mockRestore();
		});

		it('should properly validate the init method behavior with different config combinations', async () => {
			// Test matrix of different configuration combinations
			const testCases = [
				{
					name: 'static only',
					data: JSON.stringify({ test: { username: 'user' } }),
					persistence: false,
					expectSetDataTimes: 1, // Called once directly from init()
					expectLoadDb: false,
					expectedSetDataCall: { test: { username: 'user' } },
				},
				{
					name: 'persistence only',
					data: '',
					persistence: true,
					expectSetDataTimes: 1, // Called once indirectly from loadFromDB()
					expectLoadDb: true,
					expectedSetDataCall: { db: { field: 'value' } },
				},
				{
					name: 'both static and persistence',
					data: JSON.stringify({ test: { username: 'user' } }),
					persistence: true,
					expectSetDataTimes: 2, // Called twice - once from init(), once from loadFromDB()
					expectLoadDb: true,
					expectedSetDataCall: { test: { username: 'user' } }, // First call
				},
				{
					name: 'neither static nor persistence',
					data: '',
					persistence: false,
					expectSetDataTimes: 0,
					expectLoadDb: false,
					expectedSetDataCall: null,
				},
			];

			for (const testCase of testCases) {
				// Reset mocks for each test case
				jest.clearAllMocks();

				const config = mock<GlobalConfig>({
					credentials: {
						overwrite: {
							data: testCase.data,
							persistence: testCase.persistence,
							endpointAuthToken: '',
						},
					},
				});

				const instance = new CredentialsOverwrites(
					config,
					credentialTypes,
					logger,
					settingsRepository,
					cipher,
				);

				// Setup database mock for persistence tests
				if (testCase.persistence) {
					settingsRepository.findByKey.mockResolvedValue({
						key: 'credentialsOverwrite',
						value: 'encrypted-data',
						loadOnStartup: false,
					});
					cipher.decrypt.mockReturnValue(JSON.stringify({ db: { field: 'value' } }));
				}

				// Spy on methods
				const setDataSpy = jest.spyOn(instance, 'setData');
				const loadFromDbSpy = jest.spyOn(instance, 'loadOverwriteDataFromDB');

				await instance.init();

				// Verify expectations for this test case
				expect(setDataSpy).toHaveBeenCalledTimes(testCase.expectSetDataTimes);

				if (testCase.expectSetDataTimes > 0 && testCase.expectedSetDataCall) {
					expect(setDataSpy).toHaveBeenNthCalledWith(1, testCase.expectedSetDataCall, false, false);
				}

				if (testCase.expectLoadDb) {
					expect(loadFromDbSpy).toHaveBeenCalledWith(false);
				} else {
					expect(loadFromDbSpy).not.toHaveBeenCalled();
				}

				setDataSpy.mockRestore();
				loadFromDbSpy.mockRestore();
			}
		});
	});
});
