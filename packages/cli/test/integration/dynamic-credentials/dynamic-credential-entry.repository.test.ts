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
});
