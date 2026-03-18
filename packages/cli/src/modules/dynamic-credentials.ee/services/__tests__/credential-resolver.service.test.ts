import type { Logger } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, type User, type WorkflowRepository } from '@n8n/db';
import {
	CredentialResolverValidationError,
	type CredentialResolverConfiguration,
	type ICredentialResolver,
} from '@n8n/decorators';
import type { Cipher } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';

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
	let mockWorkflowRepository: jest.Mocked<WorkflowRepository>;
	let mockActiveWorkflowManager: jest.Mocked<ActiveWorkflowManager>;

	const mockResolverImplementation = {
		metadata: {
			name: 'test.resolver',
			description: 'A test resolver',
		},
		getSecret: jest.fn(),
		setSecret: jest.fn(),
		validateOptions: jest.fn(),
		deleteAllSecrets: jest.fn(),
	} as jest.Mocked<ICredentialResolver>;

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
			manager: {
				transaction: jest.fn(async (cb: (trx: unknown) => Promise<void>) => {
					const trx = { remove: mockRepository.remove };
					await cb(trx);
				}),
			},
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

		mockWorkflowRepository = {
			findByCredentialResolverId: jest.fn().mockResolvedValue([]),
			findActiveByCredentialResolverId: jest.fn().mockResolvedValue([]),
			clearCredentialResolverId: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
		} as unknown as jest.Mocked<WorkflowRepository>;

		mockActiveWorkflowManager = {
			remove: jest.fn().mockResolvedValue(undefined),
			add: jest.fn().mockResolvedValue(undefined),
		} as unknown as jest.Mocked<ActiveWorkflowManager>;

		service = new DynamicCredentialResolverService(
			mockLogger,
			mockRepository,
			mockRegistry,
			mockCipher,
			mockExpressionService,
			mockWorkflowRepository,
			mockActiveWorkflowManager,
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

		it('should call deleteAllSecrets when clearCredentials is true', async () => {
			const entity = createMockEntity();
			const updatedEntity = createMockEntity();
			const mockUser = createMockUser();
			const decryptedConfig = { prefix: 'test' };
			const resolverWithDeleteAllSecrets = {
				...mockResolverImplementation,
				deleteAllSecrets: jest.fn().mockResolvedValue(undefined),
			};

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByTypename.mockReturnValue(
				resolverWithDeleteAllSecrets as jest.Mocked<ICredentialResolver>,
			);
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			await service.update('resolver-id-123', {
				clearCredentials: true,
				user: mockUser,
			});

			expect(mockRegistry.getResolverByTypename).toHaveBeenCalledWith('test.resolver');
			expect(resolverWithDeleteAllSecrets.deleteAllSecrets).toHaveBeenCalledWith({
				resolverId: 'resolver-id-123',
				resolverName: 'test.resolver',
				configuration: decryptedConfig,
			});
			expect(mockRepository.save).toHaveBeenCalled();
		});

		it('should not call deleteAllSecrets when clearCredentials is false', async () => {
			const entity = createMockEntity();
			const updatedEntity = createMockEntity();
			const mockUser = createMockUser();
			const decryptedConfig = { prefix: 'test' };

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			await service.update('resolver-id-123', {
				clearCredentials: false,
				user: mockUser,
			});

			expect(mockRepository.save).toHaveBeenCalled();
		});

		it('should not call deleteAllSecrets when clearCredentials is undefined', async () => {
			const entity = createMockEntity();
			const updatedEntity = createMockEntity();
			const mockUser = createMockUser();
			const decryptedConfig = { prefix: 'test' };

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			await service.update('resolver-id-123', {
				name: 'Updated Name',
				user: mockUser,
			});

			expect(mockRepository.save).toHaveBeenCalled();
		});

		it('should throw CredentialResolverValidationError when resolver type is unknown and clearCredentials is true', async () => {
			const entity = createMockEntity();
			const mockUser = createMockUser();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByTypename.mockReturnValue(undefined);

			await expect(
				service.update('resolver-id-123', {
					clearCredentials: true,
					user: mockUser,
				}),
			).rejects.toThrow(CredentialResolverValidationError);

			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should handle resolver without deleteAllSecrets method gracefully', async () => {
			const entity = createMockEntity();
			const updatedEntity = createMockEntity();
			const mockUser = createMockUser();
			const decryptedConfig = { prefix: 'test' };
			const resolverWithoutDeleteAllSecrets = {
				...mockResolverImplementation,
				deleteAllSecrets: undefined,
			};

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRegistry.getResolverByTypename.mockReturnValue(
				resolverWithoutDeleteAllSecrets as jest.Mocked<ICredentialResolver>,
			);
			mockRepository.save.mockResolvedValue(updatedEntity);
			mockCipher.decrypt.mockReturnValue(JSON.stringify(decryptedConfig));

			await service.update('resolver-id-123', {
				clearCredentials: true,
				user: mockUser,
			});

			expect(mockRepository.save).toHaveBeenCalled();
		});
	});

	describe('findAffectedWorkflows', () => {
		it('should return workflows referencing the resolver', async () => {
			const entity = createMockEntity();
			mockRepository.findOneBy.mockResolvedValue(entity);

			const workflows = [
				{ id: 'wf-1', name: 'Workflow 1' },
				{ id: 'wf-2', name: 'Workflow 2' },
			];
			mockWorkflowRepository.findByCredentialResolverId.mockResolvedValue(workflows);

			const result = await service.findAffectedWorkflows('resolver-id-123');

			expect(mockWorkflowRepository.findByCredentialResolverId).toHaveBeenCalledWith(
				'resolver-id-123',
			);
			expect(result).toEqual(workflows);
		});

		it('should return empty array when no workflows reference the resolver', async () => {
			const entity = createMockEntity();
			mockRepository.findOneBy.mockResolvedValue(entity);
			mockWorkflowRepository.findByCredentialResolverId.mockResolvedValue([]);

			const result = await service.findAffectedWorkflows('resolver-id-123');

			expect(result).toEqual([]);
		});

		it('should throw DynamicCredentialResolverNotFoundError when resolver not found', async () => {
			mockRepository.findOneBy.mockResolvedValue(null);

			await expect(service.findAffectedWorkflows('non-existent-id')).rejects.toThrow(
				DynamicCredentialResolverNotFoundError,
			);

			expect(mockWorkflowRepository.findByCredentialResolverId).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('should clear workflow references and delete the resolver in a transaction', async () => {
			const entity = createMockEntity();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.remove.mockResolvedValue(entity);

			await service.delete('resolver-id-123');

			expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'resolver-id-123' });
			expect(mockRepository.manager.transaction).toHaveBeenCalled();
			expect(mockWorkflowRepository.clearCredentialResolverId).toHaveBeenCalledWith(
				'resolver-id-123',
				expect.anything(), // transaction manager
			);
			expect(mockRepository.remove).toHaveBeenCalledWith(entity);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Deleted credential resolver'),
			);
		});

		it('should clear workflow references before removing the resolver', async () => {
			const entity = createMockEntity();
			const callOrder: string[] = [];

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockWorkflowRepository.clearCredentialResolverId.mockImplementation(async () => {
				callOrder.push('clearCredentialResolverId');
			});
			mockRepository.remove.mockImplementation(async () => {
				callOrder.push('remove');
				return entity;
			});

			await service.delete('resolver-id-123');

			expect(callOrder).toEqual(['clearCredentialResolverId', 'remove']);
		});

		it('should reactivate active workflows after deleting the resolver', async () => {
			const entity = createMockEntity();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.remove.mockResolvedValue(entity);
			mockWorkflowRepository.findActiveByCredentialResolverId.mockResolvedValue([
				'wf-active-1',
				'wf-active-2',
			]);

			await service.delete('resolver-id-123');

			expect(mockWorkflowRepository.findActiveByCredentialResolverId).toHaveBeenCalledWith(
				'resolver-id-123',
			);
			expect(mockActiveWorkflowManager.remove).toHaveBeenCalledWith('wf-active-1');
			expect(mockActiveWorkflowManager.remove).toHaveBeenCalledWith('wf-active-2');
			expect(mockActiveWorkflowManager.add).toHaveBeenCalledWith('wf-active-1', 'update');
			expect(mockActiveWorkflowManager.add).toHaveBeenCalledWith('wf-active-2', 'update');
		});

		it('should not reactivate workflows when none are active', async () => {
			const entity = createMockEntity();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.remove.mockResolvedValue(entity);
			mockWorkflowRepository.findActiveByCredentialResolverId.mockResolvedValue([]);

			await service.delete('resolver-id-123');

			expect(mockActiveWorkflowManager.remove).not.toHaveBeenCalled();
			expect(mockActiveWorkflowManager.add).not.toHaveBeenCalled();
		});

		it('should deactivate workflow and log warning when reactivation fails', async () => {
			const entity = createMockEntity();

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.remove.mockResolvedValue(entity);
			mockWorkflowRepository.findActiveByCredentialResolverId.mockResolvedValue(['wf-active-1']);
			mockActiveWorkflowManager.remove.mockRejectedValue(new Error('Reactivation failed'));

			await expect(service.delete('resolver-id-123')).resolves.toBeUndefined();

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to reactivate workflow'),
				expect.objectContaining({ error: expect.any(Error) }),
			);
			expect(mockWorkflowRepository.update).toHaveBeenCalledWith('wf-active-1', {
				active: false,
				activeVersionId: null,
			});
		});

		it('should process workflows sequentially during reactivation', async () => {
			const entity = createMockEntity();
			const callOrder: string[] = [];

			mockRepository.findOneBy.mockResolvedValue(entity);
			mockRepository.remove.mockResolvedValue(entity);
			mockWorkflowRepository.findActiveByCredentialResolverId.mockResolvedValue(['wf-1', 'wf-2']);
			mockActiveWorkflowManager.remove.mockImplementation(async (id: string) => {
				callOrder.push(`remove-${id}`);
			});
			mockActiveWorkflowManager.add.mockImplementation(async (id) => {
				callOrder.push(`add-${id}`);
				return { webhooks: false, triggersAndPollers: false };
			});

			await service.delete('resolver-id-123');

			expect(callOrder).toEqual(['remove-wf-1', 'add-wf-1', 'remove-wf-2', 'add-wf-2']);
		});

		it('should throw DynamicCredentialResolverNotFoundError when resolver not found', async () => {
			mockRepository.findOneBy.mockResolvedValue(null);

			await expect(service.delete('non-existent-id')).rejects.toThrow(
				DynamicCredentialResolverNotFoundError,
			);

			expect(mockWorkflowRepository.clearCredentialResolverId).not.toHaveBeenCalled();
			expect(mockRepository.remove).not.toHaveBeenCalled();
		});
	});
});
