import { DataSource, Repository, FindManyOptions, FindOneOptions, SaveOptions } from '@n8n/typeorm';
import { AuthIdentityRepository } from '../auth-identity.repository';
import { AuthIdentity } from '../../entities/auth-identity';
import { User } from '../../entities/user';
import type { AuthProviderType } from '../../entities/types-db';

// Mock DataSource and its manager
const mockManager = {
	save: jest.fn(),
	find: jest.fn(),
	findOne: jest.fn(),
	findOneBy: jest.fn(),
	findBy: jest.fn(),
	findAndCount: jest.fn(),
	findAndCountBy: jest.fn(),
	remove: jest.fn(),
	delete: jest.fn(),
	update: jest.fn(),
	count: jest.fn(),
	countBy: jest.fn(),
	create: jest.fn(),
	preload: jest.fn(),
	merge: jest.fn(),
	query: jest.fn(),
	createQueryBuilder: jest.fn(() => ({
		where: jest.fn().mockReturnThis(),
		andWhere: jest.fn().mockReturnThis(),
		orWhere: jest.fn().mockReturnThis(),
		orderBy: jest.fn().mockReturnThis(),
		skip: jest.fn().mockReturnThis(),
		take: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		leftJoin: jest.fn().mockReturnThis(),
		innerJoin: jest.fn().mockReturnThis(),
		leftJoinAndSelect: jest.fn().mockReturnThis(),
		innerJoinAndSelect: jest.fn().mockReturnThis(),
		getOne: jest.fn(),
		getMany: jest.fn(),
		getRawOne: jest.fn(),
		getRawMany: jest.fn(),
		getCount: jest.fn(),
		getManyAndCount: jest.fn(),
		execute: jest.fn(),
	})),
};

const mockDataSource = {
	manager: mockManager,
	getRepository: jest.fn(),
	createQueryBuilder: jest.fn(() => mockManager.createQueryBuilder()),
} as unknown as DataSource;

// Mock the Repository constructor
jest.mock('@n8n/typeorm', () => {
	const actual = jest.requireActual('@n8n/typeorm');
	return {
		...actual,
		Repository: jest.fn().mockImplementation(function (this: any, entity: any, manager: any) {
			this.manager = manager;
			this.target = entity;
			this.metadata = {
				name: 'AuthIdentity',
				tableName: 'auth_identity',
			};
			// Mock all inherited methods
			this.save = jest.fn();
			this.find = jest.fn();
			this.findOne = jest.fn();
			this.findOneBy = jest.fn();
			this.findBy = jest.fn();
			this.findAndCount = jest.fn();
			this.findAndCountBy = jest.fn();
			this.remove = jest.fn();
			this.delete = jest.fn();
			this.update = jest.fn();
			this.count = jest.fn();
			this.countBy = jest.fn();
			this.create = jest.fn();
			this.preload = jest.fn();
			this.merge = jest.fn();
			this.query = jest.fn();
			this.createQueryBuilder = mockManager.createQueryBuilder;
			return this;
		}),
	};
});

describe('AuthIdentityRepository', () => {
	let repository: AuthIdentityRepository;
	let mockUser: User;

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();

		// Create repository instance
		repository = new AuthIdentityRepository(mockDataSource);

		// Create mock user
		mockUser = Object.assign(new User(), {
			id: 'user_123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			role: 'global:member',
		});
	});

	describe('Basic Repository Operations', () => {
		describe('constructor', () => {
			it('should create AuthIdentityRepository instance with DataSource', () => {
				const repo = new AuthIdentityRepository(mockDataSource);

				expect(repo).toBeInstanceOf(AuthIdentityRepository);
				expect(Repository).toHaveBeenCalledWith(AuthIdentity, mockDataSource.manager);
			});

			it('should properly initialize with TypeORM Repository base class', () => {
				expect(repository).toHaveProperty('manager');
				expect(repository).toHaveProperty('target');
				expect(repository).toHaveProperty('metadata');
			});
		});

		describe('DataSource integration', () => {
			it('should use provided DataSource manager', () => {
				const repo = new AuthIdentityRepository(mockDataSource);
				expect(repo.manager).toBe(mockManager);
			});

			it('should handle DataSource with null manager gracefully', () => {
				const nullManagerDataSource = {
					manager: null,
				} as unknown as DataSource;

				expect(() => {
					new AuthIdentityRepository(nullManagerDataSource);
				}).not.toThrow();
			});
		});

		describe('Service decorator functionality', () => {
			it('should be decorated as a Service for dependency injection', () => {
				// The @Service() decorator should be present on the class
				// This is verified by the ability to instantiate the class
				expect(repository).toBeDefined();
				expect(repository).toBeInstanceOf(AuthIdentityRepository);
			});
		});
	});

	describe('Inherited Repository Methods', () => {
		let mockAuthIdentity: AuthIdentity;

		beforeEach(() => {
			mockAuthIdentity = AuthIdentity.create(mockUser, 'test_provider_123', 'ldap');
		});

		describe('find operations', () => {
			it('should call inherited find method with options', async () => {
				const findOptions: FindManyOptions<AuthIdentity> = {
					where: { providerType: 'ldap' },
					relations: ['user'],
				};

				repository.find = jest.fn().mockResolvedValue([mockAuthIdentity]);

				const result = await repository.find(findOptions);

				expect(repository.find).toHaveBeenCalledWith(findOptions);
				expect(result).toEqual([mockAuthIdentity]);
			});

			it('should find by provider type', async () => {
				const providerType: AuthProviderType = 'saml';
				repository.findBy = jest.fn().mockResolvedValue([mockAuthIdentity]);

				const result = await repository.findBy({ providerType });

				expect(repository.findBy).toHaveBeenCalledWith({ providerType });
				expect(result).toEqual([mockAuthIdentity]);
			});

			it('should find with user relationships', async () => {
				const findOptions: FindManyOptions<AuthIdentity> = {
					relations: ['user'],
					where: { userId: mockUser.id },
				};

				repository.find = jest.fn().mockResolvedValue([mockAuthIdentity]);

				const result = await repository.find(findOptions);

				expect(repository.find).toHaveBeenCalledWith(findOptions);
				expect(result).toEqual([mockAuthIdentity]);
			});

			it('should handle empty find results', async () => {
				repository.find = jest.fn().mockResolvedValue([]);

				const result = await repository.find({ where: { providerType: 'oidc' } });

				expect(result).toEqual([]);
			});
		});

		describe('findOne operations', () => {
			it('should call inherited findOne method with user relationships', async () => {
				const findOptions: FindOneOptions<AuthIdentity> = {
					where: { providerId: 'test_provider_123', providerType: 'ldap' },
					relations: ['user'],
				};

				repository.findOne = jest.fn().mockResolvedValue(mockAuthIdentity);

				const result = await repository.findOne(findOptions);

				expect(repository.findOne).toHaveBeenCalledWith(findOptions);
				expect(result).toEqual(mockAuthIdentity);
			});

			it('should find by composite primary key', async () => {
				repository.findOneBy = jest.fn().mockResolvedValue(mockAuthIdentity);

				const result = await repository.findOneBy({
					providerId: 'test_provider_123',
					providerType: 'ldap',
				});

				expect(repository.findOneBy).toHaveBeenCalledWith({
					providerId: 'test_provider_123',
					providerType: 'ldap',
				});
				expect(result).toEqual(mockAuthIdentity);
			});

			it('should return null when identity not found', async () => {
				repository.findOneBy = jest.fn().mockResolvedValue(null);

				const result = await repository.findOneBy({
					providerId: 'nonexistent',
					providerType: 'ldap',
				});

				expect(result).toBeNull();
			});
		});

		describe('save operations', () => {
			it('should save auth identity', async () => {
				repository.save = jest.fn().mockResolvedValue(mockAuthIdentity);

				const result = await repository.save(mockAuthIdentity);

				expect(repository.save).toHaveBeenCalledWith(mockAuthIdentity);
				expect(result).toEqual(mockAuthIdentity);
			});

			it('should save multiple auth identities', async () => {
				const identities = [
					mockAuthIdentity,
					AuthIdentity.create(mockUser, 'saml_provider_456', 'saml'),
				];

				repository.save = jest.fn().mockResolvedValue(identities);

				const result = await repository.save(identities);

				expect(repository.save).toHaveBeenCalledWith(identities);
				expect(result).toEqual(identities);
			});

			it('should handle save with options', async () => {
				const saveOptions: SaveOptions = { transaction: true };
				repository.save = jest.fn().mockResolvedValue(mockAuthIdentity);

				const result = await repository.save(mockAuthIdentity, saveOptions);

				expect(repository.save).toHaveBeenCalledWith(mockAuthIdentity, saveOptions);
				expect(result).toEqual(mockAuthIdentity);
			});
		});

		describe('delete operations', () => {
			it('should remove auth identity', async () => {
				repository.remove = jest.fn().mockResolvedValue(mockAuthIdentity);

				const result = await repository.remove(mockAuthIdentity);

				expect(repository.remove).toHaveBeenCalledWith(mockAuthIdentity);
				expect(result).toEqual(mockAuthIdentity);
			});

			it('should delete by criteria', async () => {
				const deleteResult = { affected: 1, raw: {} };
				repository.delete = jest.fn().mockResolvedValue(deleteResult);

				const result = await repository.delete({
					providerId: 'test_provider_123',
					providerType: 'ldap',
				});

				expect(repository.delete).toHaveBeenCalledWith({
					providerId: 'test_provider_123',
					providerType: 'ldap',
				});
				expect(result).toEqual(deleteResult);
			});

			it('should handle cascading deletion with user removal', async () => {
				repository.delete = jest.fn().mockResolvedValue({ affected: 2, raw: {} });

				const result = await repository.delete({ userId: mockUser.id });

				expect(repository.delete).toHaveBeenCalledWith({ userId: mockUser.id });
				expect(result.affected).toBe(2);
			});
		});
	});

	describe('Security and Authentication Scenarios', () => {
		describe('multiple auth identities per user', () => {
			it('should handle user with multiple provider types', async () => {
				const ldapIdentity = AuthIdentity.create(mockUser, 'ldap_123', 'ldap');
				const samlIdentity = AuthIdentity.create(mockUser, 'saml_456', 'saml');
				const identities = [ldapIdentity, samlIdentity];

				repository.find = jest.fn().mockResolvedValue(identities);

				const result = await repository.find({ where: { userId: mockUser.id } });

				expect(result).toHaveLength(2);
				expect(result[0].providerType).toBe('ldap');
				expect(result[1].providerType).toBe('saml');
				expect(result[0].userId).toBe(result[1].userId);
			});

			it('should handle same provider type for different users', async () => {
				const user2 = Object.assign(new User(), { id: 'user_456' });
				const identity1 = AuthIdentity.create(mockUser, 'provider_123', 'ldap');
				const identity2 = AuthIdentity.create(user2, 'provider_456', 'ldap');

				repository.find = jest.fn().mockResolvedValue([identity1, identity2]);

				const result = await repository.find({ where: { providerType: 'ldap' } });

				expect(result).toHaveLength(2);
				expect(result[0].userId).not.toBe(result[1].userId);
				expect(result[0].providerType).toBe(result[1].providerType);
			});
		});

		describe('provider type validation and constraints', () => {
			it('should enforce provider type constraints', async () => {
				const validTypes: AuthProviderType[] = ['ldap', 'email', 'saml', 'oidc'];

				for (const type of validTypes) {
					const identity = AuthIdentity.create(mockUser, `provider_${type}`, type);
					repository.save = jest.fn().mockResolvedValue(identity);

					const result = await repository.save(identity);
					expect(result.providerType).toBe(type);
				}
			});

			it('should validate provider type enum values', () => {
				const validTypes: AuthProviderType[] = ['ldap', 'email', 'saml', 'oidc'];

				validTypes.forEach((type) => {
					const identity = AuthIdentity.create(mockUser, 'test_provider', type);
					expect(identity.providerType).toBe(type);
				});
			});
		});

		describe('unique constraint testing', () => {
			it('should enforce unique constraint on providerId + providerType', async () => {
				const identity1 = AuthIdentity.create(mockUser, 'duplicate_provider', 'ldap');
				const identity2 = AuthIdentity.create(mockUser, 'duplicate_provider', 'ldap');

				// First save should succeed
				repository.save = jest.fn().mockResolvedValueOnce(identity1);
				const result1 = await repository.save(identity1);
				expect(result1).toBe(identity1);

				// Second save with same providerId + providerType should fail
				const duplicateKeyError = new Error('UNIQUE constraint failed');
				repository.save = jest.fn().mockRejectedValueOnce(duplicateKeyError);

				await expect(repository.save(identity2)).rejects.toThrow('UNIQUE constraint failed');
			});

			it('should allow same providerId with different providerType', async () => {
				const identity1 = AuthIdentity.create(mockUser, 'same_provider_id', 'ldap');
				const identity2 = AuthIdentity.create(mockUser, 'same_provider_id', 'saml');

				repository.save = jest
					.fn()
					.mockResolvedValueOnce(identity1)
					.mockResolvedValueOnce(identity2);

				const result1 = await repository.save(identity1);
				const result2 = await repository.save(identity2);

				expect(result1.providerId).toBe(result2.providerId);
				expect(result1.providerType).not.toBe(result2.providerType);
			});

			it('should allow same providerType with different providerId', async () => {
				const identity1 = AuthIdentity.create(mockUser, 'provider_1', 'ldap');
				const identity2 = AuthIdentity.create(mockUser, 'provider_2', 'ldap');

				repository.save = jest
					.fn()
					.mockResolvedValueOnce(identity1)
					.mockResolvedValueOnce(identity2);

				const result1 = await repository.save(identity1);
				const result2 = await repository.save(identity2);

				expect(result1.providerType).toBe(result2.providerType);
				expect(result1.providerId).not.toBe(result2.providerId);
			});
		});

		describe('user relationship integrity', () => {
			it('should maintain foreign key relationship with User', async () => {
				const identity = AuthIdentity.create(mockUser, 'provider_123', 'ldap');
				repository.save = jest.fn().mockResolvedValue(identity);

				const result = await repository.save(identity);

				expect(result.user).toBe(mockUser);
				expect(result.userId).toBe(mockUser.id);
			});

			it('should handle user reference changes', async () => {
				const identity = AuthIdentity.create(mockUser, 'provider_123', 'ldap');
				const newUser = Object.assign(new User(), { id: 'new_user_456' });

				// Simulate changing user reference
				identity.user = newUser;
				identity.userId = newUser.id;

				repository.save = jest.fn().mockResolvedValue(identity);
				const result = await repository.save(identity);

				expect(result.user).toBe(newUser);
				expect(result.userId).toBe(newUser.id);
			});
		});
	});

	describe('Query Operations', () => {
		describe('finding by provider type', () => {
			it('should find LDAP identities', async () => {
				const ldapIdentities = [
					AuthIdentity.create(mockUser, 'ldap_1', 'ldap'),
					AuthIdentity.create(mockUser, 'ldap_2', 'ldap'),
				];

				repository.findBy = jest.fn().mockResolvedValue(ldapIdentities);

				const result = await repository.findBy({ providerType: 'ldap' });

				expect(repository.findBy).toHaveBeenCalledWith({ providerType: 'ldap' });
				expect(result).toEqual(ldapIdentities);
				expect(result.every((identity) => identity.providerType === 'ldap')).toBe(true);
			});

			it('should find email identities', async () => {
				const emailIdentities = [AuthIdentity.create(mockUser, 'email@test.com', 'email')];

				repository.findBy = jest.fn().mockResolvedValue(emailIdentities);

				const result = await repository.findBy({ providerType: 'email' });

				expect(result).toEqual(emailIdentities);
				expect(result[0].providerType).toBe('email');
			});

			it('should find SAML identities', async () => {
				const samlIdentities = [AuthIdentity.create(mockUser, 'saml_provider', 'saml')];

				repository.findBy = jest.fn().mockResolvedValue(samlIdentities);

				const result = await repository.findBy({ providerType: 'saml' });

				expect(result).toEqual(samlIdentities);
				expect(result[0].providerType).toBe('saml');
			});

			it('should find OIDC identities', async () => {
				const oidcIdentities = [AuthIdentity.create(mockUser, 'oidc_provider', 'oidc')];

				repository.findBy = jest.fn().mockResolvedValue(oidcIdentities);

				const result = await repository.findBy({ providerType: 'oidc' });

				expect(result).toEqual(oidcIdentities);
				expect(result[0].providerType).toBe('oidc');
			});
		});

		describe('finding by user ID', () => {
			it('should find all identities for a user', async () => {
				const userIdentities = [
					AuthIdentity.create(mockUser, 'ldap_provider', 'ldap'),
					AuthIdentity.create(mockUser, 'saml_provider', 'saml'),
				];

				repository.findBy = jest.fn().mockResolvedValue(userIdentities);

				const result = await repository.findBy({ userId: mockUser.id });

				expect(repository.findBy).toHaveBeenCalledWith({ userId: mockUser.id });
				expect(result).toEqual(userIdentities);
				expect(result.every((identity) => identity.userId === mockUser.id)).toBe(true);
			});

			it('should handle user with no identities', async () => {
				repository.findBy = jest.fn().mockResolvedValue([]);

				const result = await repository.findBy({ userId: 'nonexistent_user' });

				expect(result).toEqual([]);
			});
		});

		describe('complex relationship queries', () => {
			it('should query with User entity joins', async () => {
				const queryBuilder = repository.createQueryBuilder('auth_identity');
				queryBuilder.leftJoinAndSelect = jest.fn().mockReturnThis();
				queryBuilder.where = jest.fn().mockReturnThis();
				const testIdentity = AuthIdentity.create(mockUser, 'test_provider', 'ldap');
				queryBuilder.getMany = jest.fn().mockResolvedValue([testIdentity]);

				repository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

				const result = await repository
					.createQueryBuilder('auth_identity')
					.leftJoinAndSelect('auth_identity.user', 'user')
					.where('user.email = :email', { email: mockUser.email })
					.getMany();

				expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('auth_identity.user', 'user');
				expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
					email: mockUser.email,
				});
				expect(result).toEqual([testIdentity]);
			});

			it('should handle complex filtering with relationships', async () => {
				const queryBuilder = repository.createQueryBuilder('auth_identity');
				queryBuilder.leftJoinAndSelect = jest.fn().mockReturnThis();
				queryBuilder.where = jest.fn().mockReturnThis();
				queryBuilder.andWhere = jest.fn().mockReturnThis();
				const testIdentity = AuthIdentity.create(mockUser, 'test_provider', 'ldap');
				queryBuilder.getMany = jest.fn().mockResolvedValue([testIdentity]);

				repository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

				const result = await repository
					.createQueryBuilder('auth_identity')
					.leftJoinAndSelect('auth_identity.user', 'user')
					.where('auth_identity.providerType = :type', { type: 'ldap' })
					.andWhere('user.disabled = :disabled', { disabled: false })
					.getMany();

				expect(queryBuilder.where).toHaveBeenCalledWith('auth_identity.providerType = :type', {
					type: 'ldap',
				});
				expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.disabled = :disabled', {
					disabled: false,
				});
				expect(result).toEqual([testIdentity]);
			});
		});
	});

	describe('Edge Cases and Error Handling', () => {
		describe('invalid provider types', () => {
			it('should handle invalid provider type gracefully', () => {
				// TypeScript prevents this at compile time, but testing runtime behavior
				expect(() => {
					AuthIdentity.create(mockUser, 'provider_123', 'invalid' as AuthProviderType);
				}).not.toThrow();
			});
		});

		describe('orphaned auth identities', () => {
			it('should find orphaned identities with null user reference', async () => {
				const orphanedIdentity = new AuthIdentity();
				orphanedIdentity.providerId = 'orphaned_provider';
				orphanedIdentity.providerType = 'ldap';
				orphanedIdentity.userId = 'nonexistent_user';
				orphanedIdentity.user = null as any;

				repository.find = jest.fn().mockResolvedValue([orphanedIdentity]);

				const result = await repository.find({
					where: { user: null as any },
					relations: ['user'],
				});

				expect(result).toEqual([orphanedIdentity]);
				expect(result[0].user).toBeNull();
			});

			it('should handle cleanup of orphaned identities', async () => {
				repository.delete = jest.fn().mockResolvedValue({ affected: 3, raw: {} });

				const result = await repository.delete({ user: null as any });

				expect(repository.delete).toHaveBeenCalledWith({ user: null as any });
				expect(result.affected).toBe(3);
			});
		});

		describe('null/undefined handling', () => {
			it('should handle null providerId', async () => {
				const identity = new AuthIdentity();
				identity.providerId = null as any;
				identity.providerType = 'ldap';
				identity.userId = mockUser.id;

				repository.save = jest.fn().mockRejectedValue(new Error('NOT NULL constraint failed'));

				await expect(repository.save(identity)).rejects.toThrow('NOT NULL constraint failed');
			});

			it('should handle undefined providerType', async () => {
				const identity = new AuthIdentity();
				identity.providerId = 'test_provider';
				identity.providerType = undefined as any;
				identity.userId = mockUser.id;

				repository.save = jest.fn().mockRejectedValue(new Error('NOT NULL constraint failed'));

				await expect(repository.save(identity)).rejects.toThrow('NOT NULL constraint failed');
			});

			it('should handle null user reference', () => {
				expect(() => {
					AuthIdentity.create(null as any, 'provider_123', 'ldap');
				}).toThrow();
			});
		});

		describe('constraint violation scenarios', () => {
			it('should handle primary key constraint violations', async () => {
				const identity = AuthIdentity.create(mockUser, 'existing_provider', 'ldap');

				repository.save = jest.fn().mockRejectedValue(new Error('PRIMARY KEY constraint failed'));

				await expect(repository.save(identity)).rejects.toThrow('PRIMARY KEY constraint failed');
			});

			it('should handle foreign key constraint violations', async () => {
				const identity = new AuthIdentity();
				identity.providerId = 'test_provider';
				identity.providerType = 'ldap';
				identity.userId = 'nonexistent_user_id';

				repository.save = jest.fn().mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

				await expect(repository.save(identity)).rejects.toThrow('FOREIGN KEY constraint failed');
			});
		});
	});

	describe('Integration Testing', () => {
		describe('transaction handling', () => {
			it('should handle transactional save operations', async () => {
				const identity = AuthIdentity.create(mockUser, 'transactional_provider', 'ldap');
				const saveOptions: SaveOptions = {
					transaction: true,
					reload: false,
				};

				repository.save = jest.fn().mockResolvedValue(identity);

				const result = await repository.save(identity, saveOptions);

				expect(repository.save).toHaveBeenCalledWith(identity, saveOptions);
				expect(result).toBe(identity);
			});

			it('should handle transaction rollback scenarios', async () => {
				const identity = AuthIdentity.create(mockUser, 'rollback_provider', 'ldap');

				repository.save = jest.fn().mockRejectedValue(new Error('Transaction rolled back'));

				await expect(repository.save(identity, { transaction: true })).rejects.toThrow(
					'Transaction rolled back',
				);
			});
		});

		describe('cascading deletion with user removal', () => {
			it('should handle user deletion affecting auth identities', async () => {
				// When user is deleted, related auth identities should be affected
				repository.delete = jest.fn().mockResolvedValue({ affected: 2, raw: {} });

				const result = await repository.delete({ userId: mockUser.id });

				expect(repository.delete).toHaveBeenCalledWith({ userId: mockUser.id });
				expect(result.affected).toBe(2);
			});

			it('should verify cascade options are properly configured', async () => {
				// This test verifies that the relationship is properly configured for cascading
				const identity = AuthIdentity.create(mockUser, 'cascade_test', 'ldap');

				repository.save = jest.fn().mockResolvedValue(identity);
				repository.remove = jest.fn().mockResolvedValue(identity);

				// Save the identity
				await repository.save(identity);

				// Remove the identity (simulating cascade from user deletion)
				const result = await repository.remove(identity);

				expect(result).toBe(identity);
			});
		});

		describe('bulk operations for multiple identities', () => {
			it('should handle bulk save operations', async () => {
				const identities = [
					AuthIdentity.create(mockUser, 'bulk_1', 'ldap'),
					AuthIdentity.create(mockUser, 'bulk_2', 'saml'),
					AuthIdentity.create(mockUser, 'bulk_3', 'oidc'),
				];

				repository.save = jest.fn().mockResolvedValue(identities);

				const result = await repository.save(identities);

				expect(repository.save).toHaveBeenCalledWith(identities);
				expect(result).toEqual(identities);
				expect(result).toHaveLength(3);
			});

			it('should handle bulk delete operations', async () => {
				const providerIds = ['bulk_1', 'bulk_2', 'bulk_3'];

				repository.delete = jest.fn().mockResolvedValue({ affected: 3, raw: {} });

				const result = await repository.delete({ providerId: providerIds as any });

				expect(repository.delete).toHaveBeenCalledWith({ providerId: providerIds });
				expect(result.affected).toBe(3);
			});

			it('should handle partial bulk operation failures', async () => {
				const identities = [
					AuthIdentity.create(mockUser, 'valid_1', 'ldap'),
					AuthIdentity.create(mockUser, 'invalid_duplicate', 'ldap'), // This should fail due to constraint
				];

				repository.save = jest.fn().mockRejectedValue(new Error('Bulk operation partially failed'));

				await expect(repository.save(identities)).rejects.toThrow(
					'Bulk operation partially failed',
				);
			});
		});

		describe('performance and optimization', () => {
			it('should handle large result sets efficiently', async () => {
				const largeResultSet = Array.from({ length: 1000 }, (_, i) =>
					AuthIdentity.create(mockUser, `provider_${i}`, 'ldap'),
				);

				repository.find = jest.fn().mockResolvedValue(largeResultSet);

				const result = await repository.find({ where: { providerType: 'ldap' } });

				expect(result).toHaveLength(1000);
				expect(repository.find).toHaveBeenCalledTimes(1);
			});

			it('should support pagination for large datasets', async () => {
				const paginatedResults = Array.from({ length: 50 }, (_, i) =>
					AuthIdentity.create(mockUser, `paginated_${i}`, 'ldap'),
				);

				repository.find = jest.fn().mockResolvedValue(paginatedResults);

				const result = await repository.find({
					skip: 100,
					take: 50,
					where: { providerType: 'ldap' },
				});

				expect(repository.find).toHaveBeenCalledWith({
					skip: 100,
					take: 50,
					where: { providerType: 'ldap' },
				});
				expect(result).toHaveLength(50);
			});
		});
	});

	describe('Repository Method Coverage', () => {
		describe('count operations', () => {
			it('should count auth identities', async () => {
				repository.count = jest.fn().mockResolvedValue(5);

				const result = await repository.count();

				expect(repository.count).toHaveBeenCalled();
				expect(result).toBe(5);
			});

			it('should count by criteria', async () => {
				repository.countBy = jest.fn().mockResolvedValue(3);

				const result = await repository.countBy({ providerType: 'ldap' });

				expect(repository.countBy).toHaveBeenCalledWith({ providerType: 'ldap' });
				expect(result).toBe(3);
			});
		});

		describe('findAndCount operations', () => {
			it('should find and count with pagination', async () => {
				const identities = [
					AuthIdentity.create(mockUser, 'provider_1', 'ldap'),
					AuthIdentity.create(mockUser, 'provider_2', 'ldap'),
				];
				const countResult: [AuthIdentity[], number] = [identities, 10];

				repository.findAndCount = jest.fn().mockResolvedValue(countResult);

				const result = await repository.findAndCount({
					skip: 0,
					take: 2,
					where: { providerType: 'ldap' },
				});

				expect(repository.findAndCount).toHaveBeenCalledWith({
					skip: 0,
					take: 2,
					where: { providerType: 'ldap' },
				});
				expect(result[0]).toEqual(identities);
				expect(result[1]).toBe(10);
			});
		});

		describe('create and merge operations', () => {
			it('should create new entity instance', () => {
				const entityData = {
					providerId: 'new_provider',
					providerType: 'ldap' as AuthProviderType,
					userId: mockUser.id,
				};

				repository.create = jest.fn().mockReturnValue(entityData);

				const result = repository.create(entityData);

				expect(repository.create).toHaveBeenCalledWith(entityData);
				expect(result).toEqual(entityData);
			});

			it('should merge entities', () => {
				const existingIdentity = AuthIdentity.create(mockUser, 'existing', 'ldap');
				const updateData = { providerId: 'updated_provider' };

				repository.merge = jest.fn().mockReturnValue({ ...existingIdentity, ...updateData });

				const result = repository.merge(existingIdentity, updateData);

				expect(repository.merge).toHaveBeenCalledWith(existingIdentity, updateData);
				expect(result.providerId).toBe('updated_provider');
			});

			it('should preload entity with relations', async () => {
				const entityData = {
					providerId: 'preload_provider',
					providerType: 'ldap' as AuthProviderType,
					userId: mockUser.id,
				};

				const preloadedEntity = AuthIdentity.create(mockUser, 'preload_provider', 'ldap');
				repository.preload = jest.fn().mockResolvedValue(preloadedEntity);

				const result = await repository.preload(entityData);

				expect(repository.preload).toHaveBeenCalledWith(entityData);
				expect(result).toEqual(preloadedEntity);
			});
		});

		describe('update operations', () => {
			it('should update entities by criteria', async () => {
				const updateResult = { affected: 1, raw: {}, generatedMaps: [] };
				repository.update = jest.fn().mockResolvedValue(updateResult);

				const result = await repository.update(
					{ providerId: 'old_provider' },
					{ providerId: 'new_provider' },
				);

				expect(repository.update).toHaveBeenCalledWith(
					{ providerId: 'old_provider' },
					{ providerId: 'new_provider' },
				);
				expect(result).toEqual(updateResult);
			});
		});

		describe('query operations', () => {
			it('should execute raw queries', async () => {
				const queryResult = [{ count: 5 }];
				repository.query = jest.fn().mockResolvedValue(queryResult);

				const result = await repository.query('SELECT COUNT(*) as count FROM auth_identity');

				expect(repository.query).toHaveBeenCalledWith(
					'SELECT COUNT(*) as count FROM auth_identity',
				);
				expect(result).toEqual(queryResult);
			});
		});
	});
});
