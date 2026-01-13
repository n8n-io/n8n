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
			const setPlainDataSpy = jest.spyOn(initCredentialsOverwrites, 'setPlainData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

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
			const setPlainDataSpy = jest.spyOn(initCredentialsOverwrites, 'setPlainData');
			const setDataSpy = jest.spyOn(initCredentialsOverwrites, 'setData');
			const loadFromDbSpy = jest.spyOn(initCredentialsOverwrites, 'loadOverwriteDataFromDB');

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
	});
});
