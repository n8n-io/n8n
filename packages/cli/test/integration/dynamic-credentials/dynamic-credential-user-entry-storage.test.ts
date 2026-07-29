import { testDb, testModules } from '@n8n/backend-test-utils';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { DynamicCredentialUserEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-user-entry-storage';

import { createDynamicCredentialResolver } from './shared/db-helpers';
import { createCredentials } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';

describe('DynamicCredentialUserEntryStorage', () => {
	let storage: DynamicCredentialUserEntryStorage;
	let previousEnvVar: string | undefined;

	beforeAll(async () => {
		previousEnvVar = process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS;
		process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';
		await testModules.loadModules(['dynamic-credentials']);
		await testDb.init();
		storage = Container.get(DynamicCredentialUserEntryStorage);
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

	it('should store and retrieve credential data for a user', async () => {
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

		const testData = 'encrypted-user-credential-data';

		// ACT - Store
		await storage.setCredentialData(credential.id, user.id, resolver.id, testData, {});

		// ACT - Retrieve
		const retrievedData = await storage.getCredentialData(credential.id, user.id, resolver.id, {});

		// ASSERT
		expect(retrievedData).toBe(testData);
	});

	it('should return null for non-existent credential data', async () => {
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

		// ACT - Try to retrieve non-existent data
		const retrievedData = await storage.getCredentialData(credential.id, user.id, resolver.id, {});

		// ASSERT
		expect(retrievedData).toBeNull();
	});

	it('should update existing credential data (upsert)', async () => {
		// ARRANGE
		const credential = await createCredentials({
			name: 'Test Credential',
			type: 'testType',
			data: 'test-data',
		});
		const user = await createUser({
			email: 'upsert@example.com',
		});
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver',
			type: 'test',
			config: 'test-data',
		});

		// ACT - Insert
		await storage.setCredentialData(credential.id, user.id, resolver.id, 'original-data', {});

		// ACT - Update
		await storage.setCredentialData(credential.id, user.id, resolver.id, 'updated-data', {});

		// ACT - Retrieve
		const data = await storage.getCredentialData(credential.id, user.id, resolver.id, {});

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
		const user = await createUser({
			email: 'delete@example.com',
		});
		const resolver = await createDynamicCredentialResolver({
			name: 'test-resolver',
			type: 'test',
			config: 'test-data',
		});

		const testData = 'data-to-delete';

		// Store data first
		await storage.setCredentialData(credential.id, user.id, resolver.id, testData, {});

		// Verify it exists
		const beforeDelete = await storage.getCredentialData(credential.id, user.id, resolver.id, {});
		expect(beforeDelete).toBe(testData);

		// ACT - Delete
		await storage.deleteCredentialData(credential.id, user.id, resolver.id, {});

		// ASSERT - Verify it's gone
		const afterDelete = await storage.getCredentialData(credential.id, user.id, resolver.id, {});
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
		const user1 = await createUser({
			email: 'user1@example.com',
			firstName: 'User',
			lastName: 'One',
		});
		const user2 = await createUser({
			email: 'user2@example.com',
			firstName: 'User',
			lastName: 'Two',
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
		// Same credential, different users
		await storage.setCredentialData(
			credential1.id,
			user1.id,
			resolver1.id,
			'data-cred1-user1-res1',
			{},
		);
		await storage.setCredentialData(
			credential1.id,
			user2.id,
			resolver1.id,
			'data-cred1-user2-res1',
			{},
		);

		// Same credential and user, different resolver
		await storage.setCredentialData(
			credential1.id,
			user1.id,
			resolver2.id,
			'data-cred1-user1-res2',
			{},
		);

		// Different credential, same user and resolver
		await storage.setCredentialData(
			credential2.id,
			user1.id,
			resolver1.id,
			'data-cred2-user1-res1',
			{},
		);

		// ASSERT - Each entry should be isolated and return correct data
		const data1 = await storage.getCredentialData(credential1.id, user1.id, resolver1.id, {});
		expect(data1).toBe('data-cred1-user1-res1');

		const data2 = await storage.getCredentialData(credential1.id, user2.id, resolver1.id, {});
		expect(data2).toBe('data-cred1-user2-res1');

		const data3 = await storage.getCredentialData(credential1.id, user1.id, resolver2.id, {});
		expect(data3).toBe('data-cred1-user1-res2');

		const data4 = await storage.getCredentialData(credential2.id, user1.id, resolver1.id, {});
		expect(data4).toBe('data-cred2-user1-res1');

		// ACT - Update one entry
		await storage.setCredentialData(
			credential1.id,
			user1.id,
			resolver1.id,
			'updated-data-cred1-user1-res1',
			{},
		);

		// ASSERT - Only the updated entry should change, others remain unchanged
		const updatedData1 = await storage.getCredentialData(
			credential1.id,
			user1.id,
			resolver1.id,
			{},
		);
		expect(updatedData1).toBe('updated-data-cred1-user1-res1');

		const unchangedData2 = await storage.getCredentialData(
			credential1.id,
			user2.id,
			resolver1.id,
			{},
		);
		expect(unchangedData2).toBe('data-cred1-user2-res1');

		const unchangedData3 = await storage.getCredentialData(
			credential1.id,
			user1.id,
			resolver2.id,
			{},
		);
		expect(unchangedData3).toBe('data-cred1-user1-res2');

		// ACT - Delete one entry
		await storage.deleteCredentialData(credential1.id, user1.id, resolver1.id, {});

		// ASSERT - Deleted entry should be gone, others remain
		const deletedData = await storage.getCredentialData(credential1.id, user1.id, resolver1.id, {});
		expect(deletedData).toBeNull();

		const stillExistingData = await storage.getCredentialData(
			credential1.id,
			user2.id,
			resolver1.id,
			{},
		);
		expect(stillExistingData).toBe('data-cred1-user2-res1');
	});

	describe('CASCADE Delete - User Deletion', () => {
		it('should not retrieve credential data after user is deleted', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({
				email: 'deletable@example.com',
				firstName: 'Deletable',
				lastName: 'User',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'test-resolver',
				type: 'test',
				config: 'test-data',
			});

			const testData = 'user-credential-data';

			// Store credential data for the user
			await storage.setCredentialData(credential.id, user.id, resolver.id, testData, {});

			// Verify data exists before deletion
			const beforeDelete = await storage.getCredentialData(credential.id, user.id, resolver.id, {});
			expect(beforeDelete).toBe(testData);

			// ACT - Delete the user (CASCADE should remove credential entries)
			const userRepository = Container.get(UserRepository);
			await userRepository.delete({ id: user.id });

			// ASSERT - Credential data should no longer be retrievable
			const afterDelete = await storage.getCredentialData(credential.id, user.id, resolver.id, {});
			expect(afterDelete).toBeNull();
		});

		it('should delete all credential entries for a user when user is deleted', async () => {
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
			const user = await createUser({
				email: 'multidelete@example.com',
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

			// Store multiple credential entries for the same user
			await storage.setCredentialData(credential1.id, user.id, resolver1.id, 'data-1', {});
			await storage.setCredentialData(credential2.id, user.id, resolver1.id, 'data-2', {});
			await storage.setCredentialData(credential1.id, user.id, resolver2.id, 'data-3', {});

			// Verify all data exists before deletion
			const data1Before = await storage.getCredentialData(
				credential1.id,
				user.id,
				resolver1.id,
				{},
			);
			const data2Before = await storage.getCredentialData(
				credential2.id,
				user.id,
				resolver1.id,
				{},
			);
			const data3Before = await storage.getCredentialData(
				credential1.id,
				user.id,
				resolver2.id,
				{},
			);
			expect(data1Before).toBe('data-1');
			expect(data2Before).toBe('data-2');
			expect(data3Before).toBe('data-3');

			// ACT - Delete the user
			const userRepository = Container.get(UserRepository);
			await userRepository.delete({ id: user.id });

			// ASSERT - All credential entries for this user should be gone
			const data1After = await storage.getCredentialData(credential1.id, user.id, resolver1.id, {});
			const data2After = await storage.getCredentialData(credential2.id, user.id, resolver1.id, {});
			const data3After = await storage.getCredentialData(credential1.id, user.id, resolver2.id, {});
			expect(data1After).toBeNull();
			expect(data2After).toBeNull();
			expect(data3After).toBeNull();
		});

		it('should only delete credential entries for the deleted user, not other users', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Shared Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user1 = await createUser({
				email: 'user1-todelete@example.com',
				firstName: 'User1',
			});
			const user2 = await createUser({
				email: 'user2-tokeep@example.com',
				firstName: 'User2',
			});
			const resolver = await createDynamicCredentialResolver({
				name: 'shared-resolver',
				type: 'test',
				config: 'test-data',
			});

			// Store credential data for both users
			await storage.setCredentialData(credential.id, user1.id, resolver.id, 'user1-data', {});
			await storage.setCredentialData(credential.id, user2.id, resolver.id, 'user2-data', {});

			// Verify both exist before deletion
			const user1DataBefore = await storage.getCredentialData(
				credential.id,
				user1.id,
				resolver.id,
				{},
			);
			const user2DataBefore = await storage.getCredentialData(
				credential.id,
				user2.id,
				resolver.id,
				{},
			);
			expect(user1DataBefore).toBe('user1-data');
			expect(user2DataBefore).toBe('user2-data');

			// ACT - Delete user1
			const userRepository = Container.get(UserRepository);
			await userRepository.delete({ id: user1.id });

			// ASSERT - user1's data should be gone, user2's data should remain
			const user1DataAfter = await storage.getCredentialData(
				credential.id,
				user1.id,
				resolver.id,
				{},
			);
			const user2DataAfter = await storage.getCredentialData(
				credential.id,
				user2.id,
				resolver.id,
				{},
			);
			expect(user1DataAfter).toBeNull();
			expect(user2DataAfter).toBe('user2-data');
		});

		it('should handle user deletion when user has no credential entries', async () => {
			// ARRANGE
			const user = await createUser({
				email: 'nocreds@example.com',
				firstName: 'No',
				lastName: 'Credentials',
			});

			// ACT - Delete user with no credential entries
			const userRepository = Container.get(UserRepository);
			const deleteOperation = async () => await userRepository.delete({ id: user.id });

			// ASSERT - Should not throw any errors
			await expect(deleteOperation()).resolves.not.toThrow();
		});
	});

	describe('deleteAllCredentialData', () => {
		it('should delete all credential entries for a specific resolver', async () => {
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
			const user1 = await createUser({ email: 'user1@example.com' });
			const user2 = await createUser({ email: 'user2@example.com' });
			const resolver = await createDynamicCredentialResolver({
				name: 'resolver-to-delete',
				type: 'test',
				config: 'test-data',
			});

			// Store multiple entries using the same resolver
			await storage.setCredentialData(credential1.id, user1.id, resolver.id, 'data-1', {});
			await storage.setCredentialData(credential2.id, user1.id, resolver.id, 'data-2', {});
			await storage.setCredentialData(credential1.id, user2.id, resolver.id, 'data-3', {});

			// Verify entries exist
			const data1Before = await storage.getCredentialData(
				credential1.id,
				user1.id,
				resolver.id,
				{},
			);
			const data2Before = await storage.getCredentialData(
				credential2.id,
				user1.id,
				resolver.id,
				{},
			);
			const data3Before = await storage.getCredentialData(
				credential1.id,
				user2.id,
				resolver.id,
				{},
			);
			expect(data1Before).toBe('data-1');
			expect(data2Before).toBe('data-2');
			expect(data3Before).toBe('data-3');

			// ACT - Delete all entries for this resolver
			await storage.deleteAllCredentialData({
				resolverId: resolver.id,
				resolverName: resolver.name,
				configuration: {},
			});

			// ASSERT - All entries for this resolver should be gone
			const data1After = await storage.getCredentialData(credential1.id, user1.id, resolver.id, {});
			const data2After = await storage.getCredentialData(credential2.id, user1.id, resolver.id, {});
			const data3After = await storage.getCredentialData(credential1.id, user2.id, resolver.id, {});
			expect(data1After).toBeNull();
			expect(data2After).toBeNull();
			expect(data3After).toBeNull();
		});

		it('should only delete entries for the specified resolver, not other resolvers', async () => {
			// ARRANGE
			const credential = await createCredentials({
				name: 'Test Credential',
				type: 'testType',
				data: 'test-data',
			});
			const user = await createUser({ email: 'user@example.com' });
			const resolver1 = await createDynamicCredentialResolver({
				name: 'resolver-to-delete',
				type: 'test',
				config: 'test-data-1',
			});
			const resolver2 = await createDynamicCredentialResolver({
				name: 'resolver-to-keep',
				type: 'test',
				config: 'test-data-2',
			});

			// Store data with both resolvers
			await storage.setCredentialData(credential.id, user.id, resolver1.id, 'resolver1-data', {});
			await storage.setCredentialData(credential.id, user.id, resolver2.id, 'resolver2-data', {});

			// Verify both exist
			const resolver1DataBefore = await storage.getCredentialData(
				credential.id,
				user.id,
				resolver1.id,
				{},
			);
			const resolver2DataBefore = await storage.getCredentialData(
				credential.id,
				user.id,
				resolver2.id,
				{},
			);
			expect(resolver1DataBefore).toBe('resolver1-data');
			expect(resolver2DataBefore).toBe('resolver2-data');

			// ACT - Delete all entries for resolver1
			await storage.deleteAllCredentialData({
				resolverId: resolver1.id,
				resolverName: resolver1.name,
				configuration: {},
			});

			// ASSERT - resolver1 data should be gone, resolver2 data should remain
			const resolver1DataAfter = await storage.getCredentialData(
				credential.id,
				user.id,
				resolver1.id,
				{},
			);
			const resolver2DataAfter = await storage.getCredentialData(
				credential.id,
				user.id,
				resolver2.id,
				{},
			);
			expect(resolver1DataAfter).toBeNull();
			expect(resolver2DataAfter).toBe('resolver2-data');
		});
	});
});
