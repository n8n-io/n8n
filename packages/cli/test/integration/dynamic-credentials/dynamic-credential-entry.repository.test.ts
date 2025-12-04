import { testDb, testModules } from '@n8n/backend-test-utils';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { DynamicCredentialEntryRepository } from '@/modules/dynamic-credentials.ee/database/repositories/dynamic-credential-entry.repository';
import { DynamicCredentialEntry } from '@/modules/dynamic-credentials.ee/database/entities/dynamic-credential-entry';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';

import { createCredentials } from '../shared/db/credentials';
import { createDynamicCredentialResolver } from './shared/db-helpers';

describe('DynamicCredentialEntryRepository', () => {
	let repository: DynamicCredentialEntryRepository;

	beforeAll(async () => {
		await testModules.loadModules(['dynamic-credentials']);
		await testDb.init();
		repository = Container.get(DynamicCredentialEntryRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'DynamicCredentialEntry',
			'DynamicCredentialResolver',
			'CredentialsEntity',
		]);
	});

	it('should save and retrieve a dynamic credential entry', async () => {
		// ARRANGE
		const credential = await createCredentials({
			name: 'Test Credential',
			type: 'testType',
			data: 'test-data',
		});
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver',
			type: 'test',
			config: 'test-data',
		});

		const entry = new DynamicCredentialEntry();
		entry.credentialId = credential.id;
		entry.subjectId = 'subject-123';
		entry.resolverId = resolver.id;
		entry.data = 'encrypted-test-data';

		// ACT
		const savedEntry = await repository.save(entry);

		// Retrieve it back
		const foundEntry = await repository.findOne({
			where: {
				credentialId: credential.id,
				subjectId: 'subject-123',
				resolverId: resolver.id,
			},
		});

		// ASSERT
		expect(savedEntry).toBeDefined();
		expect(savedEntry.credentialId).toBe(credential.id);
		expect(savedEntry.subjectId).toBe('subject-123');
		expect(savedEntry.resolverId).toBe(resolver.id);
		expect(savedEntry.data).toBe('encrypted-test-data');
		expect(savedEntry.createdAt).toBeInstanceOf(Date);
		expect(savedEntry.updatedAt).toBeInstanceOf(Date);

		expect(foundEntry).toBeDefined();
		expect(foundEntry?.data).toBe('encrypted-test-data');
	});

	it('should cascade delete entries when credential is deleted', async () => {
		// ARRANGE
		const credential = await createCredentials({
			name: 'Test Credential',
			type: 'testType',
			data: 'test-data',
		});
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver',
			type: 'test',
			config: 'test-data',
		});

		// Create multiple entries for the same credential
		const entry1 = new DynamicCredentialEntry();
		entry1.credentialId = credential.id;
		entry1.subjectId = 'subject-1';
		entry1.resolverId = resolver.id;
		entry1.data = 'data-1';

		const entry2 = new DynamicCredentialEntry();
		entry2.credentialId = credential.id;
		entry2.subjectId = 'subject-2';
		entry2.resolverId = resolver.id;
		entry2.data = 'data-2';

		await repository.save(entry1);
		await repository.save(entry2);

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
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver',
			type: 'test',
			config: 'test-data',
		});

		// Create entries for multiple credentials using the same resolver
		const entry1 = new DynamicCredentialEntry();
		entry1.credentialId = credential1.id;
		entry1.subjectId = 'subject-1';
		entry1.resolverId = resolver.id;
		entry1.data = 'data-1';

		const entry2 = new DynamicCredentialEntry();
		entry2.credentialId = credential2.id;
		entry2.subjectId = 'subject-2';
		entry2.resolverId = resolver.id;
		entry2.data = 'data-2';

		await repository.save(entry1);
		await repository.save(entry2);

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

	it('should fetch CredentialsEntity through ManyToOne relationship', async () => {
		// ARRANGE
		const credential = await createCredentials({
			name: 'Test Credential for Relationship',
			type: 'testType',
			data: 'test-data',
		});
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver',
			type: 'test',
			config: 'test-data',
		});

		const entry = new DynamicCredentialEntry();
		entry.credentialId = credential.id;
		entry.subjectId = 'subject-123';
		entry.resolverId = resolver.id;
		entry.data = 'encrypted-test-data';

		await repository.save(entry);

		// ACT - Fetch entry with credential relationship loaded
		const foundEntry = await repository.findOne({
			where: {
				credentialId: credential.id,
				subjectId: 'subject-123',
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

	it('should fetch DynamicCredentialResolver through ManyToOne relationship', async () => {
		// ARRANGE
		const credential = await createCredentials({
			name: 'Test Credential',
			type: 'testType',
			data: 'test-data',
		});
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver-for-relationship',
			type: 'test-type',
			config: 'test-config-data',
		});

		const entry = new DynamicCredentialEntry();
		entry.credentialId = credential.id;
		entry.subjectId = 'subject-456';
		entry.resolverId = resolver.id;
		entry.data = 'encrypted-test-data';

		await repository.save(entry);

		// ACT - Fetch entry with resolver relationship loaded
		const foundEntry = await repository.findOne({
			where: {
				credentialId: credential.id,
				subjectId: 'subject-456',
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
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver',
			type: 'test',
			config: 'test-data',
		});

		// Create entries for different credential types
		const entry1 = new DynamicCredentialEntry();
		entry1.credentialId = credential1.id;
		entry1.subjectId = 'subject-1';
		entry1.resolverId = resolver.id;
		entry1.data = 'data-1';

		const entry2 = new DynamicCredentialEntry();
		entry2.credentialId = credential2.id;
		entry2.subjectId = 'subject-2';
		entry2.resolverId = resolver.id;
		entry2.data = 'data-2';

		const entry3 = new DynamicCredentialEntry();
		entry3.credentialId = credential3.id;
		entry3.subjectId = 'subject-3';
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
		expect(oauthEntries.map((e) => e.subjectId).sort()).toEqual(['subject-1', 'subject-3']);
	});

	it('should filter entries by resolver type using find method', async () => {
		// ARRANGE
		const credential = await createCredentials({
			name: 'Test Credential',
			type: 'testType',
			data: 'test-data',
		});
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
		const entry1 = new DynamicCredentialEntry();
		entry1.credentialId = credential.id;
		entry1.subjectId = 'subject-1';
		entry1.resolverId = resolver1.id;
		entry1.data = 'data-1';

		const entry2 = new DynamicCredentialEntry();
		entry2.credentialId = credential.id;
		entry2.subjectId = 'subject-2';
		entry2.resolverId = resolver2.id;
		entry2.data = 'data-2';

		const entry3 = new DynamicCredentialEntry();
		entry3.credentialId = credential.id;
		entry3.subjectId = 'subject-3';
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
		expect(awsEntries.map((e) => e.subjectId).sort()).toEqual(['subject-1', 'subject-3']);
	});

	it('should filter entries by both credential type and resolver type using find method', async () => {
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
		const entry1 = new DynamicCredentialEntry();
		entry1.credentialId = credential1.id;
		entry1.subjectId = 'subject-1';
		entry1.resolverId = resolver1.id;
		entry1.data = 'data-1';

		const entry2 = new DynamicCredentialEntry();
		entry2.credentialId = credential1.id;
		entry2.subjectId = 'subject-2';
		entry2.resolverId = resolver2.id;
		entry2.data = 'data-2';

		const entry3 = new DynamicCredentialEntry();
		entry3.credentialId = credential2.id;
		entry3.subjectId = 'subject-3';
		entry3.resolverId = resolver1.id;
		entry3.data = 'data-3';

		const entry4 = new DynamicCredentialEntry();
		entry4.credentialId = credential3.id;
		entry4.subjectId = 'subject-4';
		entry4.resolverId = resolver1.id;
		entry4.data = 'data-4';

		await repository.save([entry1, entry2, entry3, entry4]);

		// ACT - Query entries where credential type is 'oAuth2Api' AND resolver type is 'aws-secrets-manager'
		const filteredEntries = await repository.find({
			where: {
				credential: {
					type: 'oAuth2Api',
				},
				resolver: {
					type: 'aws-secrets-manager',
				},
			},
			relations: ['credential', 'resolver'],
		});

		// ASSERT - Should only return entries with both OAuth credentials and AWS resolver
		expect(filteredEntries).toHaveLength(2);
		expect(
			filteredEntries.every(
				(entry) =>
					entry.credential.type === 'oAuth2Api' && entry.resolver.type === 'aws-secrets-manager',
			),
		).toBe(true);
		expect(filteredEntries.map((e) => e.subjectId).sort()).toEqual(['subject-1', 'subject-3']);
	});
});
