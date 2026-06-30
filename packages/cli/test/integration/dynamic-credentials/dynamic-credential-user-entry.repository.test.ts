import { testDb, testModules } from '@n8n/backend-test-utils';
import { CredentialsRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { DynamicCredentialUserEntry } from '@/modules/dynamic-credentials.ee/database/entities/dynamic-credential-user-entry';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialUserEntryRepository } from '@/modules/dynamic-credentials.ee/database/repositories/dynamic-credential-user-entry.repository';

import { createDynamicCredentialResolver } from './shared/db-helpers';
import { createCredentials } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';

describe('DynamicCredentialUserEntryRepository', () => {
	let repository: DynamicCredentialUserEntryRepository;
	let previousEnvVar: string | undefined;

	beforeAll(async () => {
		previousEnvVar = process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS;
		process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';
		await testModules.loadModules(['dynamic-credentials']);
		await testDb.init();
		repository = Container.get(DynamicCredentialUserEntryRepository);
	});

	afterAll(async () => {
		process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = previousEnvVar;
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'DynamicCredentialUserEntry',
			'DynamicCredentialResolver',
			'CredentialsEntity',
			'User',
		]);
	});

	describe('CRUD Operations', () => {
		it('should create and retrieve a dynamic credential user entry', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry = new DynamicCredentialUserEntry();
			entry.credentialId = credential.id;
			entry.userId = user.id;
			entry.resolverId = resolver.id;
			entry.data = 'encrypted-user-data';

			// ACT
			const savedEntry = await repository.save(entry);

			// Retrieve it back
			const foundEntry = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
			});

			// ASSERT
			expect(savedEntry).toBeDefined();
			expect(savedEntry.credentialId).toBe(credential.id);
			expect(savedEntry.userId).toBe(user.id);
			expect(savedEntry.resolverId).toBe(resolver.id);
			expect(savedEntry.data).toBe('encrypted-user-data');
			expect(savedEntry.createdAt).toBeInstanceOf(Date);
			expect(savedEntry.updatedAt).toBeInstanceOf(Date);

			expect(foundEntry).toBeDefined();
			expect(foundEntry?.data).toBe('encrypted-user-data');
		});

		it('should update an existing entry', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({
				email: 'test@example.com',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry = new DynamicCredentialUserEntry();
			entry.credentialId = credential.id;
			entry.userId = user.id;
			entry.resolverId = resolver.id;
			entry.data = 'original-data';

			await repository.save(entry);

			// ACT - Update the entry
			const updatedEntry = await repository.save({
				credentialId: credential.id,
				userId: user.id,
				resolverId: resolver.id,
				data: 'updated-data',
			});

			// ASSERT
			const foundEntry = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
			});

			expect(updatedEntry.data).toBe('updated-data');
			expect(foundEntry?.data).toBe('updated-data');
		});

		it('should delete an entry', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({
				email: 'test@example.com',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry = new DynamicCredentialUserEntry();
			entry.credentialId = credential.id;
			entry.userId = user.id;
			entry.resolverId = resolver.id;
			entry.data = 'test-data';

			await repository.save(entry);

			// Verify it exists
			const entryBeforeDelete = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
			});
			expect(entryBeforeDelete).toBeDefined();

			// ACT - Delete the entry
			await repository.delete({
				credentialId: credential.id,
				userId: user.id,
				resolverId: resolver.id,
			});

			// ASSERT
			const entryAfterDelete = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
			});
			expect(entryAfterDelete).toBeNull();
		});

		it('should find multiple entries', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user1 = await createUser({ email: 'user1@example.com' });
			const user2 = await createUser({ email: 'user2@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential.id;
			entry1.userId = user1.id;
			entry1.resolverId = resolver.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential.id;
			entry2.userId = user2.id;
			entry2.resolverId = resolver.id;
			entry2.data = 'data-2';

			await repository.save([entry1, entry2]);

			// ACT
			const entries = await repository.find({
				where: {
					credentialId: credential.id,
				},
			});

			// ASSERT
			expect(entries).toHaveLength(2);
			expect(entries.map((e) => e.userId).sort()).toEqual([user1.id, user2.id].sort());
		});
	});

	describe('CASCADE Delete', () => {
		it('should cascade delete entries when credential is deleted', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user1 = await createUser({ email: 'user1@example.com' });
			const user2 = await createUser({ email: 'user2@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			// Create multiple entries for the same credential
			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential.id;
			entry1.userId = user1.id;
			entry1.resolverId = resolver.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential.id;
			entry2.userId = user2.id;
			entry2.resolverId = resolver.id;
			entry2.data = 'data-2';

			await repository.save([entry1, entry2]);

			// Verify entries exist
			const entriesBeforeDelete = await repository.find({
				where: {
					credentialId: credential.id,
				},
			});
			expect(entriesBeforeDelete).toHaveLength(2);

			// ACT - Delete the credential
			const credentialsRepository = Container.get(CredentialsRepository);
			await credentialsRepository.delete({ id: credential.id });

			// ASSERT - All entries for this credential should be cascade deleted
			const entriesAfterDelete = await repository.find({
				where: {
					credentialId: credential.id,
				},
			});
			expect(entriesAfterDelete).toHaveLength(0);
		});

		it('should cascade delete entries when user is deleted', async () => {
			// ARRANGE
			const credential1 = await createCredentials({
				name: 'Credential 1',
				type: 'testType',
				data: 'test-data-1',
			});
			const credential2 = await createCredentials({
				name: 'Credential 2',
				type: 'testType',
				data: 'test-data-2',
			});
			const user = await createUser({ email: 'user@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			// Create entries for multiple credentials using the same user
			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential1.id;
			entry1.userId = user.id;
			entry1.resolverId = resolver.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential2.id;
			entry2.userId = user.id;
			entry2.resolverId = resolver.id;
			entry2.data = 'data-2';

			await repository.save([entry1, entry2]);

			// Verify entries exist
			const entriesBeforeDelete = await repository.find({
				where: {
					userId: user.id,
				},
			});
			expect(entriesBeforeDelete).toHaveLength(2);

			// ACT - Delete the user
			const userRepository = Container.get(UserRepository);
			await userRepository.delete({ id: user.id });

			// ASSERT - All entries for this user should be cascade deleted
			const entriesAfterDelete = await repository.find({
				where: {
					userId: user.id,
				},
			});
			expect(entriesAfterDelete).toHaveLength(0);
		});

		it('should cascade delete entries when resolver is deleted', async () => {
			// ARRANGE
			const credential1 = await createCredentials({
				name: 'Credential 1',
				type: 'testType',
				data: 'test-data-1',
			});
			const credential2 = await createCredentials({
				name: 'Credential 2',
				type: 'testType',
				data: 'test-data-2',
			});
			const user = await createUser({ email: 'user@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			// Create entries for multiple credentials using the same resolver
			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential1.id;
			entry1.userId = user.id;
			entry1.resolverId = resolver.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential2.id;
			entry2.userId = user.id;
			entry2.resolverId = resolver.id;
			entry2.data = 'data-2';

			await repository.save([entry1, entry2]);

			// Verify entries exist
			const entriesBeforeDelete = await repository.find({
				where: {
					resolverId: resolver.id,
				},
			});
			expect(entriesBeforeDelete).toHaveLength(2);

			// ACT - Delete the resolver
			const resolverRepository = Container.get(DynamicCredentialResolverRepository);
			await resolverRepository.delete({ id: resolver.id });

			// ASSERT - All entries for this resolver should be cascade deleted
			const entriesAfterDelete = await repository.find({
				where: {
					resolverId: resolver.id,
				},
			});
			expect(entriesAfterDelete).toHaveLength(0);
		});
	});

	describe('Relationships', () => {
		it('should fetch CredentialsEntity through ManyToOne relationship', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential for Relationship',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({ email: 'user@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry = new DynamicCredentialUserEntry();
			entry.credentialId = credential.id;
			entry.userId = user.id;
			entry.resolverId = resolver.id;
			entry.data = 'encrypted-test-data';

			await repository.save(entry);

			// ACT - Fetch entry with credential relationship loaded
			const foundEntry = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
				relations: ['credential'],
			});

			// ASSERT
			expect(foundEntry).toBeDefined();
			expect(foundEntry?.credential).toBeDefined();
			expect(foundEntry?.credential.id).toBe(credential.id);
			expect(foundEntry?.credential.name).toBe('Test Credential for Relationship');
			expect(foundEntry?.credential.type).toBe('testType');
		});

		it('should fetch User through ManyToOne relationship', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({
				email: 'testuser@example.com',
				firstName: 'Test',
				lastName: 'User',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry = new DynamicCredentialUserEntry();
			entry.credentialId = credential.id;
			entry.userId = user.id;
			entry.resolverId = resolver.id;
			entry.data = 'encrypted-test-data';

			await repository.save(entry);

			// ACT - Fetch entry with user relationship loaded
			const foundEntry = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
				relations: ['user'],
			});

			// ASSERT
			expect(foundEntry).toBeDefined();
			expect(foundEntry?.user).toBeDefined();
			expect(foundEntry?.user.id).toBe(user.id);
			expect(foundEntry?.user.email).toBe('testuser@example.com');
			expect(foundEntry?.user.firstName).toBe('Test');
			expect(foundEntry?.user.lastName).toBe('User');
		});

		it('should fetch DynamicCredentialResolver through ManyToOne relationship', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({ email: 'user@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver-for-relationship',
				type: 'test-type',
				config: 'test-config-data',
			});

			const entry = new DynamicCredentialUserEntry();
			entry.credentialId = credential.id;
			entry.userId = user.id;
			entry.resolverId = resolver.id;
			entry.data = 'encrypted-test-data';

			await repository.save(entry);

			// ACT - Fetch entry with resolver relationship loaded
			const foundEntry = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
				relations: ['resolver'],
			});

			// ASSERT
			expect(foundEntry).toBeDefined();
			expect(foundEntry?.resolver).toBeDefined();
			expect(foundEntry?.resolver.id).toBe(resolver.id);
			expect(foundEntry?.resolver.name).toBe('test-resolver-for-relationship');
			expect(foundEntry?.resolver.type).toBe('test-type');
		});

		it('should fetch all relationships at once', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Multi-Relation Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({
				email: 'multirelation@example.com',
				firstName: 'Multi',
				lastName: 'Relation',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'multi-resolver',
				type: 'multi-type',
				config: 'multi-config',
			});

			const entry = new DynamicCredentialUserEntry();
			entry.credentialId = credential.id;
			entry.userId = user.id;
			entry.resolverId = resolver.id;
			entry.data = 'encrypted-test-data';

			await repository.save(entry);

			// ACT - Fetch entry with all relationships loaded
			const foundEntry = await repository.findOne({
				where: {
					credentialId: credential.id,
					userId: user.id,
					resolverId: resolver.id,
				},
				relations: ['credential', 'user', 'resolver'],
			});

			// ASSERT
			expect(foundEntry).toBeDefined();
			expect(foundEntry?.credential).toBeDefined();
			expect(foundEntry?.user).toBeDefined();
			expect(foundEntry?.resolver).toBeDefined();
			expect(foundEntry?.credential.name).toBe('Multi-Relation Credential');
			expect(foundEntry?.user.email).toBe('multirelation@example.com');
			expect(foundEntry?.resolver.name).toBe('multi-resolver');
		});
	});

	describe('Query Filtering', () => {
		it('should filter entries by user', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user1 = await createUser({ email: 'user1@example.com' });
			const user2 = await createUser({ email: 'user2@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential.id;
			entry1.userId = user1.id;
			entry1.resolverId = resolver.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential.id;
			entry2.userId = user2.id;
			entry2.resolverId = resolver.id;
			entry2.data = 'data-2';

			await repository.save([entry1, entry2]);

			// ACT - Query entries for user1
			const user1Entries = await repository.find({
				where: {
					userId: user1.id,
				},
			});

			// ASSERT
			expect(user1Entries).toHaveLength(1);
			expect(user1Entries[0].userId).toBe(user1.id);
			expect(user1Entries[0].data).toBe('data-1');
		});

		it('should filter entries by credential type using find method', async () => {
			// ARRANGE
			const credential1 = await createCredentials({
				name: 'OAuth Credential',
				type: 'oAuth2Api',
				data: 'oauth-data',
			});
			const credential2 = await createCredentials({
				name: 'API Key Credential',
				type: 'apiKeyAuth',
				data: 'api-key-data',
			});
			const credential3 = await createCredentials({
				name: 'Another OAuth Credential',
				type: 'oAuth2Api',
				data: 'oauth-data-2',
			});
			const user = await createUser({ email: 'user@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			// Create entries for different credential types
			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential1.id;
			entry1.userId = user.id;
			entry1.resolverId = resolver.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential2.id;
			entry2.userId = user.id;
			entry2.resolverId = resolver.id;
			entry2.data = 'data-2';

			const entry3 = new DynamicCredentialUserEntry();
			entry3.credentialId = credential3.id;
			entry3.userId = user.id;
			entry3.resolverId = resolver.id;
			entry3.data = 'data-3';

			await repository.save([entry1, entry2, entry3]);

			// ACT - Query entries where credential type is 'oAuth2Api'
			const oauthEntries = await repository.find({
				where: {
					credential: {
						type: 'oAuth2Api',
					},
				},
				relations: ['credential'],
			});

			// ASSERT
			expect(oauthEntries).toHaveLength(2);
			expect(oauthEntries.every((entry) => entry.credential.type === 'oAuth2Api')).toBe(true);
			expect(oauthEntries.map((e) => e.credentialId).sort()).toEqual(
				[credential1.id, credential3.id].sort(),
			);
		});

		it('should filter entries by resolver type using find method', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({ email: 'user@example.com' });
			const resolver1 = await createDynamicCredentialResolver({
				name: 'AWS Resolver',
				type: 'aws-secrets-manager',
				config: 'aws-config',
			});
			const resolver2 = await createDynamicCredentialResolver({
				name: 'Azure Resolver',
				type: 'azure-key-vault',
				config: 'azure-config',
			});
			const resolver3 = await createDynamicCredentialResolver({
				name: 'Another AWS Resolver',
				type: 'aws-secrets-manager',
				config: 'aws-config-2',
			});

			// Create entries for different resolver types
			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential.id;
			entry1.userId = user.id;
			entry1.resolverId = resolver1.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential.id;
			entry2.userId = user.id;
			entry2.resolverId = resolver2.id;
			entry2.data = 'data-2';

			const entry3 = new DynamicCredentialUserEntry();
			entry3.credentialId = credential.id;
			entry3.userId = user.id;
			entry3.resolverId = resolver3.id;
			entry3.data = 'data-3';

			await repository.save([entry1, entry2, entry3]);

			// ACT - Query entries where resolver type is 'aws-secrets-manager'
			const awsEntries = await repository.find({
				where: {
					resolver: {
						type: 'aws-secrets-manager',
					},
				},
				relations: ['resolver'],
			});

			// ASSERT
			expect(awsEntries).toHaveLength(2);
			expect(awsEntries.every((entry) => entry.resolver.type === 'aws-secrets-manager')).toBe(true);
			expect(awsEntries.map((e) => e.resolverId).sort()).toEqual(
				[resolver1.id, resolver3.id].sort(),
			);
		});

		it('should filter entries by user email using find method', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user1 = await createUser({
				email: 'alice@example.com',
				firstName: 'Alice',
			});
			const user2 = await createUser({
				email: 'bob@example.com',
				firstName: 'Bob',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential.id;
			entry1.userId = user1.id;
			entry1.resolverId = resolver.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential.id;
			entry2.userId = user2.id;
			entry2.resolverId = resolver.id;
			entry2.data = 'data-2';

			await repository.save([entry1, entry2]);

			// ACT - Query entries where user email is 'alice@example.com'
			const aliceEntries = await repository.find({
				where: {
					user: {
						email: 'alice@example.com',
					},
				},
				relations: ['user'],
			});

			// ASSERT
			expect(aliceEntries).toHaveLength(1);
			expect(aliceEntries[0].user.email).toBe('alice@example.com');
			expect(aliceEntries[0].user.firstName).toBe('Alice');
		});

		it('should filter entries by multiple criteria', async () => {
			// ARRANGE
			const credential1 = await createCredentials({
				name: 'OAuth Credential 1',
				type: 'oAuth2Api',
				data: 'oauth-data-1',
			});
			const credential2 = await createCredentials({
				name: 'OAuth Credential 2',
				type: 'oAuth2Api',
				data: 'oauth-data-2',
			});
			const credential3 = await createCredentials({
				name: 'API Key Credential',
				type: 'apiKeyAuth',
				data: 'api-key-data',
			});

			const user1 = await createUser({ email: 'user1@example.com' });
			const user2 = await createUser({ email: 'user2@example.com' });

			const resolver1 = await createDynamicCredentialResolver({
				name: 'AWS Resolver',
				type: 'aws-secrets-manager',
				config: 'aws-config',
			});
			const resolver2 = await createDynamicCredentialResolver({
				name: 'Azure Resolver',
				type: 'azure-key-vault',
				config: 'azure-config',
			});

			// Create entries with various combinations
			const entry1 = new DynamicCredentialUserEntry();
			entry1.credentialId = credential1.id;
			entry1.userId = user1.id;
			entry1.resolverId = resolver1.id;
			entry1.data = 'data-1';

			const entry2 = new DynamicCredentialUserEntry();
			entry2.credentialId = credential1.id;
			entry2.userId = user1.id;
			entry2.resolverId = resolver2.id;
			entry2.data = 'data-2';

			const entry3 = new DynamicCredentialUserEntry();
			entry3.credentialId = credential2.id;
			entry3.userId = user1.id;
			entry3.resolverId = resolver1.id;
			entry3.data = 'data-3';

			const entry4 = new DynamicCredentialUserEntry();
			entry4.credentialId = credential3.id;
			entry4.userId = user2.id;
			entry4.resolverId = resolver1.id;
			entry4.data = 'data-4';

			await repository.save([entry1, entry2, entry3, entry4]);

			// ACT - Query entries where credential type is 'oAuth2Api', user is user1, AND resolver type is 'aws-secrets-manager'
			const filteredEntries = await repository.find({
				where: {
					credential: {
						type: 'oAuth2Api',
					},
					user: {
						id: user1.id,
					},
					resolver: {
						type: 'aws-secrets-manager',
					},
				},
				relations: ['credential', 'user', 'resolver'],
			});

			// ASSERT - Should only return entries matching all criteria
			expect(filteredEntries).toHaveLength(2);
			expect(
				filteredEntries.every(
					(entry) =>
						entry.credential.type === 'oAuth2Api' &&
						entry.user.id === user1.id &&
						entry.resolver.type === 'aws-secrets-manager',
				),
			).toBe(true);
			expect(filteredEntries.map((e) => e.credentialId).sort()).toEqual(
				[credential1.id, credential2.id].sort(),
			);
		});
	});
});
