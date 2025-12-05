import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { DynamicCredentialEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-entry-storage';

import { createCredentials } from '../shared/db/credentials';
import { createDynamicCredentialResolver } from './shared/db-helpers';

describe('DynamicCredentialEntryStorage', () => {
	let storage: DynamicCredentialEntryStorage;

	beforeAll(async () => {
		await testModules.loadModules(['dynamic-credentials']);
		await testDb.init();
		storage = Container.get(DynamicCredentialEntryStorage);
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

	it('should store and retrieve credential data', async () => {
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

		const testData = 'encrypted-credential-data';

		// ACT - Store
		await storage.setCredentialData(credential.id, 'test-subject', resolver.id, testData, {});

		// ACT - Retrieve
		const retrievedData = await storage.getCredentialData(
			credential.id,
			'test-subject',
			resolver.id,
			{},
		);

		// ASSERT
		expect(retrievedData).toBe(testData);
	});

	it('should update existing credential data (upsert)', async () => {
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

		// ACT - Insert
		await storage.setCredentialData(
			credential.id,
			'upsert-subject',
			resolver.id,
			'original-data',
			{},
		);

		// ACT - Update
		await storage.setCredentialData(
			credential.id,
			'upsert-subject',
			resolver.id,
			'updated-data',
			{},
		);

		// ACT - Retrieve
		const data = await storage.getCredentialData(credential.id, 'upsert-subject', resolver.id, {});

		// ASSERT
		expect(data).toBe('updated-data');
	});

	it('should delete credential data', async () => {
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

		const testData = 'data-to-delete';

		// Store data first
		await storage.setCredentialData(credential.id, 'delete-subject', resolver.id, testData, {});

		// Verify it exists
		const beforeDelete = await storage.getCredentialData(
			credential.id,
			'delete-subject',
			resolver.id,
			{},
		);
		expect(beforeDelete).toBe(testData);

		// ACT - Delete
		await storage.deleteCredentialData(credential.id, 'delete-subject', resolver.id, {});

		// ASSERT - Verify it's gone
		const afterDelete = await storage.getCredentialData(
			credential.id,
			'delete-subject',
			resolver.id,
			{},
		);
		expect(afterDelete).toBeNull();
	});

	it('should isolate entries by composite key (multiple entries do not affect each other)', async () => {
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
		const resolver1 = await createDynamicCredentialResolver({
			name: 'resolver-1',
			type: 'test',
			config: 'test-config-1',
		});
		const resolver2 = await createDynamicCredentialResolver({
			name: 'resolver-2',
			type: 'test',
			config: 'test-config-2',
		});

		// ACT - Create multiple entries with different combinations
		// Same credential, different subjects
		await storage.setCredentialData(
			credential1.id,
			'subject-A',
			resolver1.id,
			'data-cred1-subjA-res1',
			{},
		);
		await storage.setCredentialData(
			credential1.id,
			'subject-B',
			resolver1.id,
			'data-cred1-subjB-res1',
			{},
		);

		// Same credential and subject, different resolver
		await storage.setCredentialData(
			credential1.id,
			'subject-A',
			resolver2.id,
			'data-cred1-subjA-res2',
			{},
		);

		// Different credential, same subject and resolver
		await storage.setCredentialData(
			credential2.id,
			'subject-A',
			resolver1.id,
			'data-cred2-subjA-res1',
			{},
		);

		// ASSERT - Each entry should be isolated and return correct data
		const data1 = await storage.getCredentialData(credential1.id, 'subject-A', resolver1.id, {});
		expect(data1).toBe('data-cred1-subjA-res1');

		const data2 = await storage.getCredentialData(credential1.id, 'subject-B', resolver1.id, {});
		expect(data2).toBe('data-cred1-subjB-res1');

		const data3 = await storage.getCredentialData(credential1.id, 'subject-A', resolver2.id, {});
		expect(data3).toBe('data-cred1-subjA-res2');

		const data4 = await storage.getCredentialData(credential2.id, 'subject-A', resolver1.id, {});
		expect(data4).toBe('data-cred2-subjA-res1');

		// ACT - Update one entry
		await storage.setCredentialData(
			credential1.id,
			'subject-A',
			resolver1.id,
			'updated-data-cred1-subjA-res1',
			{},
		);

		// ASSERT - Only the updated entry should change, others remain unchanged
		const updatedData1 = await storage.getCredentialData(
			credential1.id,
			'subject-A',
			resolver1.id,
			{},
		);
		expect(updatedData1).toBe('updated-data-cred1-subjA-res1');

		const unchangedData2 = await storage.getCredentialData(
			credential1.id,
			'subject-B',
			resolver1.id,
			{},
		);
		expect(unchangedData2).toBe('data-cred1-subjB-res1');

		const unchangedData3 = await storage.getCredentialData(
			credential1.id,
			'subject-A',
			resolver2.id,
			{},
		);
		expect(unchangedData3).toBe('data-cred1-subjA-res2');

		// ACT - Delete one entry
		await storage.deleteCredentialData(credential1.id, 'subject-A', resolver1.id, {});

		// ASSERT - Deleted entry should be gone, others remain
		const deletedData = await storage.getCredentialData(
			credential1.id,
			'subject-A',
			resolver1.id,
			{},
		);
		expect(deletedData).toBeNull();

		const stillExistingData = await storage.getCredentialData(
			credential1.id,
			'subject-B',
			resolver1.id,
			{},
		);
		expect(stillExistingData).toBe('data-cred1-subjB-res1');
	});
});
