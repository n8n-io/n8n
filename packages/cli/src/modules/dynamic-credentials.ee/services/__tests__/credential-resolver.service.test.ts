import type { Logger } from '@n8n/backend-common';
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

describe('DynamicCredentialResolverService', () => {
	let service: DynamicCredentialResolverService;
	let mockLogger: jest.Mocked<Logger>;
	let mockRepository: jest.Mocked<DynamicCredentialResolverRepository>;
	let mockRegistry: jest.Mocked<DynamicCredentialResolverRegistry>;
	let mockCipher: jest.Mocked<Cipher>;

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
			getResolverByName: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRegistry>;

		mockCipher = {
			encrypt: jest.fn(),
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;

		service = new DynamicCredentialResolverService(
			mockLogger,
			mockRepository,
			mockRegistry,
			mockCipher,
		);
	});

	describe('create', () => {
		it('should create a resolver with encrypted config', async () => {
			const config: CredentialResolverConfiguration = { prefix: 'test-prefix' };
			const savedEntity = createMockEntity();

			mockRegistry.getResolverByName.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('encrypted-config-data');
			mockRepository.create.mockReturnValue(savedEntity);
			mockRepository.save.mockResolvedValue(savedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(config));

			const result = await service.create({
				name: 'Test Resolver',
				type: 'test.resolver',
				config,
			});

			expect(mockRegistry.getResolverByName).toHaveBeenCalledWith('test.resolver');
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
			mockRegistry.getResolverByName.mockReturnValue(undefined);

			await expect(
				service.create({
					name: 'Test Resolver',
					type: 'unknown.resolver',
					config: {},
				}),
			).rejects.toThrow(CredentialResolverValidationError);

			expect(mockRepository.create).not.toHaveBeenCalled();
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should throw CredentialResolverValidationError when config validation fails', async () => {
			const config: CredentialResolverConfiguration = { invalidOption: 'value' };

			mockRegistry.getResolverByName.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockRejectedValue(
				new CredentialResolverValidationError('Invalid option'),
			);

			await expect(
				service.create({
					name: 'Test Resolver',
					type: 'test.resolver',
					config,
				}),
			).rejects.toThrow(CredentialResolverValidationError);

			expect(mockRepository.create).not.toHaveBeenCalled();
			expect(mockRepository.save).not.toHaveBeenCalled();
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

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			const result = await service.update('resolver-id-123', { name: 'Updated Name' });

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

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByName.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockResolvedValue(undefined);
			mockCipher.encrypt.mockReturnValue('new-encrypted-config');
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(newConfig));

			await service.update('resolver-id-123', { config: newConfig });

			expect(mockRegistry.getResolverByName).toHaveBeenCalledWith('test.resolver');
			expect(mockResolverImplementation.validateOptions).toHaveBeenCalledWith(newConfig);
			expect(mockCipher.encrypt).toHaveBeenCalledWith(newConfig);
			expect(mockRepository.save).toHaveBeenCalled();
		});

		it('should throw DynamicCredentialResolverNotFoundError when resolver not found', async () => {
			mockRepository.findOneBy.mockResolvedValue(null);

			await expect(service.update('non-existent-id', { name: 'New Name' })).rejects.toThrow(
				DynamicCredentialResolverNotFoundError,
			);

			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should throw CredentialResolverValidationError when config validation fails on update', async () => {
			const entity = createMockEntity();
			const invalidConfig: CredentialResolverConfiguration = { badOption: 'value' };

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByName.mockReturnValue(mockResolverImplementation);
			mockResolverImplementation.validateOptions.mockRejectedValue(
				new CredentialResolverValidationError('Invalid config'),
			);

			await expect(service.update('resolver-id-123', { config: invalidConfig })).rejects.toThrow(
				CredentialResolverValidationError,
			);

			expect(mockRepository.save).not.toHaveBeenCalled();
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
