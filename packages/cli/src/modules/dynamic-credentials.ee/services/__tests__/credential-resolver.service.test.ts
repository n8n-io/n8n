import type { Logger } from '@n8n/backend-common';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import {
	CredentialResolverValidationError,
	type CredentialResolverConfiguration,
	type ICredentialResolver,
} from '@n8n/decorators';
import type { Cipher } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { DynamicCredentialResolver } from '../../database/entities/credential-resolver';
import type { DynamicCredentialResolverRepository } from '../../database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverNotFoundError } from '../../errors/credential-resolver-not-found.error';
import type { DynamicCredentialResolverRegistry } from '../credential-resolver-registry.service';
import { DynamicCredentialResolverService } from '../credential-resolver.service';
import type { ResolverConfigExpressionService } from '../resolver-config-expression.service';

describe('DynamicCredentialResolverService', () => {
	let service: DynamicCredentialResolverService;
	let mockLogger: jest.Mocked<Logger>;
	let mockRepository: jest.Mocked<DynamicCredentialResolverRepository>;
	let mockRegistry: jest.Mocked<DynamicCredentialResolverRegistry>;
	let mockCipher: jest.Mocked<Cipher>;
	let mockExpressionService: jest.Mocked<ResolverConfigExpressionService>;

	const mockResolverImplementation: jest.Mocked<ICredentialResolver> = {
		metadata: {
			name: 'test.resolver',
			description: 'A test resolver',
		},
		getSecret: jest.fn(),
		setSecret: jest.fn(),
		validateOptions: jest.fn(),
	};

	const createMockEntity = (
		overrides: Partial<DynamicCredentialResolver> = {},
	): DynamicCredentialResolver => {
		const entity = new DynamicCredentialResolver();
		entity.id = 'resolver-id-123';
		entity.name = 'Test Resolver';
		entity.type = 'test.resolver';
		entity.config = 'encrypted-config-data';
		entity.createdAt = new Date('2024-01-01');
		entity.updatedAt = new Date('2024-01-01');
		Object.assign(entity, overrides);
		return entity;
	};

	const createMockUser = (role = GLOBAL_OWNER_ROLE): User => {
		return {
			id: 'user-123',
			role,
		} as User;
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			scoped: jest.fn().mockReturnThis(),
		} as unknown as jest.Mocked<Logger>;

		mockRepository = {
			create: jest.fn(),
			save: jest.fn(),
			find: jest.fn(),
			findOneBy: jest.fn(),
			remove: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRepository>;

		mockRegistry = {
			getResolverByTypename: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRegistry>;

		mockCipher = {
			encrypt: jest.fn(),
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;

		mockExpressionService = {
			resolve: jest.fn(async (config) => await Promise.resolve(config)),
		} as unknown as jest.Mocked<ResolverConfigExpressionService>;

		service = new DynamicCredentialResolverService(
			mockLogger,
			mockRepository,
			mockRegistry,
			mockCipher,
			mockExpressionService,
		);
	});

	describe('create', () => {
		it('should create a resolver with encrypted config', async () => {
			const config: CredentialResolverConfiguration = { prefix: 'test-prefix' };
			const savedEntity = createMockEntity();
			const mockUser = createMockUser();

			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('encrypted-config-data');
			mockRepository.create.mockReturnValue(savedEntity);
			mockRepository.save.mockResolvedValue(savedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(config));

			const result = await service.create({
				name: 'Test Resolver',
				type: 'test.resolver',
				config,
				user: mockUser,
			});

			expect(mockRegistry.getResolverByTypename).toHaveBeenCalledWith('test.resolver');
			expect(mockResolverImplementation.validateOptions).toHaveBeenCalledWith(config);
			expect(mockCipher.encrypt).toHaveBeenCalledWith(config);
			expect(mockRepository.create).toHaveBeenCalledWith({
				name: 'Test Resolver',
				type: 'test.resolver',
				config: 'encrypted-config-data',
			});
			expect(mockRepository.save).toHaveBeenCalledWith(savedEntity);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Created credential resolver'),
			);
			expect(result).toBeDefined();
		});

		it('should throw CredentialResolverValidationError for unknown resolver type', async () => {
			const mockUser = createMockUser();
			mockRegistry.getResolverByTypename.mockReturnValue(undefined);

			await expect(
				service.create({
					name: 'Test Resolver',
					type: 'unknown.resolver',
					config: {},
					user: mockUser,
				}),
			).rejects.toThrow(CredentialResolverValidationError);

			expect(mockRepository.create).not.toHaveBeenCalled();
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should throw CredentialResolverValidationError when config validation fails', async () => {
			const config: CredentialResolverConfiguration = { invalidOption: 'value' };
			const mockUser = createMockUser();

			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockRejectedValue(
				new CredentialResolverValidationError('Invalid option'),
			);

			await expect(
				service.create({
					name: 'Test Resolver',
					type: 'test.resolver',
					config,
					user: mockUser,
				}),
			).rejects.toThrow(CredentialResolverValidationError);

			expect(mockRepository.create).not.toHaveBeenCalled();
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should pass canUseExternalSecrets=true to validation for users with externalSecret:list permission', async () => {
			const config: CredentialResolverConfiguration = { prefix: 'test-prefix' };
			const savedEntity = createMockEntity();
			const mockUser = createMockUser(GLOBAL_OWNER_ROLE); // Owner has externalSecret:list

			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('encrypted-config-data');
			mockRepository.create.mockReturnValue(savedEntity);
			mockRepository.save.mockResolvedValue(savedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(config));

			await service.create({
				name: 'Test Resolver',
				type: 'test.resolver',
				config,
				user: mockUser,
			});

			// Verify expression service was called with canUseExternalSecrets=true
			expect(mockExpressionService.resolve).toHaveBeenCalledWith(config, true);
		});

		it('should pass canUseExternalSecrets=false to validation for users without externalSecret:list permission', async () => {
			const config: CredentialResolverConfiguration = { prefix: 'test-prefix' };
			const savedEntity = createMockEntity();
			const mockUser = createMockUser(GLOBAL_MEMBER_ROLE); // Member doesn't have externalSecret:list

			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('encrypted-config-data');
			mockRepository.create.mockReturnValue(savedEntity);
			mockRepository.save.mockResolvedValue(savedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(config));

			await service.create({
				name: 'Test Resolver',
				type: 'test.resolver',
				config,
				user: mockUser,
			});

			// Verify expression service was called with canUseExternalSecrets=false
			expect(mockExpressionService.resolve).toHaveBeenCalledWith(config, false);
		});
	});

	describe('findAll', () => {
		it('should return all resolvers with decryptedConfig populated', async () => {
			const entities = [
				createMockEntity({ id: 'id-1', name: 'Resolver 1' }),
				createMockEntity({ id: 'id-2', name: 'Resolver 2' }),
			];
			const decryptedConfig = { prefix: 'test' };

			mockRepository.find.mockResolvedValue(entities);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			const result = await service.findAll();

			expect(mockRepository.find).toHaveBeenCalled();
			expect(mockCipher.decrypt).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(2);
			expect(result[0].decryptedConfig).toEqual(decryptedConfig);
			expect(result[1].decryptedConfig).toEqual(decryptedConfig);
		});

		it('should return empty array when no resolvers exist', async () => {
			mockRepository.find.mockResolvedValue([]);

			const result = await service.findAll();

			expect(result).toEqual([]);
		});
	});

	describe('findById', () => {
		it('should return resolver with decryptedConfig populated', async () => {
			const entity = createMockEntity();
			const decryptedConfig = { prefix: 'test' };

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			const result = await service.findById('resolver-id-123');

			expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'resolver-id-123' });
			expect(mockCipher.decrypt).toHaveBeenCalledWith('encrypted-config-data');
			expect(result.decryptedConfig).toEqual(decryptedConfig);
		});

		it('should throw DynamicCredentialResolverNotFoundError when resolver not found', async () => {
			mockRepository.findOneBy.mockResolvedValue(null);

			await expect(service.findById('non-existent-id')).rejects.toThrow(
				DynamicCredentialResolverNotFoundError,
			);
		});

		it('should throw UnexpectedError when decryption fails', async () => {
			const entity = createMockEntity();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockCipher.decrypt.mockReturnValue('invalid-json{');

			await expect(service.findById('resolver-id-123')).rejects.toThrow(UnexpectedError);
		});
	});

	describe('update', () => {
		it('should update resolver name', async () => {
			const entity = createMockEntity();
			const updatedEntity = createMockEntity({ name: 'Updated Name' });
			const decryptedConfig = { prefix: 'test' };
			const mockUser = createMockUser();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			const result = await service.update('resolver-id-123', {
				name: 'Updated Name',
				user: mockUser,
			});

			expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'resolver-id-123' });
			expect(mockRepository.save).toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Updated credential resolver'),
			);
			expect(result.name).toBe('Updated Name');
		});

		it('should update resolver config with encryption and validation', async () => {
			const entity = createMockEntity();
			const newConfig: CredentialResolverConfiguration = { prefix: 'new-prefix' };
			const updatedEntity = createMockEntity({ config: 'new-encrypted-config' });
			const mockUser = createMockUser();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('new-encrypted-config');
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(newConfig));

			await service.update('resolver-id-123', { config: newConfig, user: mockUser });

			expect(mockRegistry.getResolverByTypename).toHaveBeenCalledWith('test.resolver');
			expect(mockResolverImplementation.validateOptions).toHaveBeenCalledWith(newConfig);
			expect(mockCipher.encrypt).toHaveBeenCalledWith(newConfig);
			expect(mockRepository.save).toHaveBeenCalled();
		});

		it('should throw DynamicCredentialResolverNotFoundError when resolver not found', async () => {
			const mockUser = createMockUser();
			mockRepository.findOneBy.mockResolvedValue(null);

			await expect(
				service.update('non-existent-id', { name: 'New Name', user: mockUser }),
			).rejects.toThrow(DynamicCredentialResolverNotFoundError);

			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should throw CredentialResolverValidationError when config validation fails on update', async () => {
			const entity = createMockEntity();
			const invalidConfig: CredentialResolverConfiguration = { badOption: 'value' };
			const mockUser = createMockUser();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockRejectedValue(
				new CredentialResolverValidationError('Invalid config'),
			);

			await expect(
				service.update('resolver-id-123', { config: invalidConfig, user: mockUser }),
			).rejects.toThrow(CredentialResolverValidationError);

			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should re-validate existing config when only type is updated', async () => {
			const entity = createMockEntity({ type: 'old.resolver' });
			const existingConfig: CredentialResolverConfiguration = { prefix: 'test' };
			const updatedEntity = createMockEntity({ type: 'new.resolver' });
			const mockUser = createMockUser();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(existingConfig));
			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockRepository.save.mockResolvedValue(updatedEntity);

			await service.update('resolver-id-123', { type: 'new.resolver', user: mockUser });

			expect(mockCipher.decrypt).toHaveBeenCalledWith('encrypted-config-data');
			expect(mockRegistry.getResolverByTypename).toHaveBeenCalledWith('new.resolver');
			expect(mockResolverImplementation.validateOptions).toHaveBeenCalledWith(existingConfig);
			expect(mockRepository.save).toHaveBeenCalled();
		});

		it('should throw CredentialResolverValidationError when existing config is incompatible with new type', async () => {
			const entity = createMockEntity({ type: 'old.resolver' });
			const existingConfig: CredentialResolverConfiguration = { prefix: 'test' };
			const mockUser = createMockUser();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(existingConfig));
			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockRejectedValue(
				new CredentialResolverValidationError('Config incompatible with new resolver type'),
			);

			await expect(
				service.update('resolver-id-123', { type: 'new.resolver', user: mockUser }),
			).rejects.toThrow(CredentialResolverValidationError);

			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should pass canUseExternalSecrets=true to validation for users with externalSecret:list permission on update', async () => {
			const entity = createMockEntity();
			const newConfig: CredentialResolverConfiguration = { prefix: 'new-prefix' };
			const updatedEntity = createMockEntity({ config: 'new-encrypted-config' });
			const mockUser = createMockUser(GLOBAL_OWNER_ROLE); // Owner has externalSecret:list

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('new-encrypted-config');
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(newConfig));

			await service.update('resolver-id-123', { config: newConfig, user: mockUser });

			// Verify expression service was called with canUseExternalSecrets=true
			expect(mockExpressionService.resolve).toHaveBeenCalledWith(newConfig, true);
		});

		it('should pass canUseExternalSecrets=false to validation for users without externalSecret:list permission on update', async () => {
			const entity = createMockEntity();
			const newConfig: CredentialResolverConfiguration = { prefix: 'new-prefix' };
			const updatedEntity = createMockEntity({ config: 'new-encrypted-config' });
			const mockUser = createMockUser(GLOBAL_MEMBER_ROLE); // Member doesn't have externalSecret:list

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('new-encrypted-config');
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(newConfig));

			await service.update('resolver-id-123', { config: newConfig, user: mockUser });

			// Verify expression service was called with canUseExternalSecrets=false
			expect(mockExpressionService.resolve).toHaveBeenCalledWith(newConfig, false);
		});
	});

	describe('delete', () => {
		it('should delete an existing resolver', async () => {
			const entity = createMockEntity();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.remove.mockResolvedValue(entity);

			await service.delete('resolver-id-123');

			expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'resolver-id-123' });
			expect(mockRepository.remove).toHaveBeenCalledWith(entity);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Deleted credential resolver'),
			);
		});

		it('should throw DynamicCredentialResolverNotFoundError when resolver not found', async () => {
			mockRepository.findOneBy.mockResolvedValue(null);

			await expect(service.delete('non-existent-id')).rejects.toThrow(
				DynamicCredentialResolverNotFoundError,
			);

			expect(mockRepository.remove).not.toHaveBeenCalled();
		});
	});
});
