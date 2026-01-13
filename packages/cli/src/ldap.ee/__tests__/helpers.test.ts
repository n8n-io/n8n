import { mockInstance } from '@n8n/backend-test-utils';
import { generateNanoId, AuthIdentity, User, UserRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import * as helpers from '@/ldap.ee/helpers.ee';

const userRepository = mockInstance(UserRepository);

describe('Ldap/helpers', () => {
	describe('updateLdapUserOnLocalDb', () => {
		// We need to use `save` so that that the subscriber in
		// packages/@n8n/db/src/entities/Project.ts receives the full user.
		// With `update` it would only receive the updated fields, e.g. the `id`
		// would be missing.
		test('does not use `Repository.update`, but `Repository.save` instead', async () => {
			//
			// ARRANGE
			//
			const user = Object.assign(new User(), { id: generateNanoId() } as User);
			const authIdentity = Object.assign(new AuthIdentity(), {
				user: { id: user.id },
			} as AuthIdentity);
			const data: Partial<User> = { firstName: 'Nathan', lastName: 'Nathaniel' };

			userRepository.findOneBy.mockResolvedValueOnce(user);

			//
			// ACT
			//
			await helpers.updateLdapUserOnLocalDb(authIdentity, data);

			//
			// ASSERT
			//
			expect(userRepository.save).toHaveBeenCalledWith({ ...user, ...data }, { transaction: true });
			expect(userRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('processUsers', () => {
		let transactionManager: EntityManager;
		let mockManagerTransaction: jest.Mock;

		beforeEach(() => {
			transactionManager = mock<EntityManager>({
				findOneBy: jest.fn(),
				save: jest.fn(),
				update: jest.fn(),
			});

			mockManagerTransaction = jest.fn();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(userRepository as any).manager = { transaction: mockManagerTransaction };
		});

		test('does not update user when data has not changed', async () => {
			//
			// ARRANGE
			//
			const userId = generateNanoId();
			const ldapId = 'ldap123';
			const existingUser = Object.assign(new User(), {
				id: userId,
				email: 'same@example.com',
				firstName: 'Same',
				lastName: 'Name',
			} as User);

			// User data from LDAP is identical to existing user
			const ldapUser = Object.assign(new User(), {
				email: 'same@example.com',
				firstName: 'Same',
				lastName: 'Name',
			} as User);

			const authIdentity = Object.assign(new AuthIdentity(), {
				providerId: ldapId,
				userId,
			} as AuthIdentity);

			// Mock the transaction to capture and execute the function
			mockManagerTransaction.mockImplementation(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				async (fn: (manager: EntityManager) => Promise<any>) => await fn(transactionManager),
			);

			(transactionManager.findOneBy as jest.Mock)
				.mockResolvedValueOnce(authIdentity) // First call for AuthIdentity
				.mockResolvedValueOnce(existingUser); // Second call for User

			//
			// ACT
			//
			await helpers.processUsers([], [[ldapId, ldapUser]], []);

			//
			// ASSERT
			//
			// Should not call save when data hasn't changed
			expect(transactionManager.save).not.toHaveBeenCalled();
			expect(transactionManager.update).not.toHaveBeenCalled();
		});

		test('updates user when email has changed', async () => {
			//
			// ARRANGE
			//
			const userId = generateNanoId();
			const ldapId = 'ldap123';
			const existingUser = Object.assign(new User(), {
				id: userId,
				email: 'old@example.com',
				firstName: 'Same',
				lastName: 'Name',
			} as User);

			const updatedUser = Object.assign(new User(), {
				email: 'new@example.com',
				firstName: 'Same',
				lastName: 'Name',
			} as User);

			const authIdentity = Object.assign(new AuthIdentity(), {
				providerId: ldapId,
				userId,
			} as AuthIdentity);

			// Mock the transaction to capture and execute the function
			mockManagerTransaction.mockImplementation(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				async (fn: (manager: EntityManager) => Promise<any>) => await fn(transactionManager),
			);

			(transactionManager.findOneBy as jest.Mock)
				.mockResolvedValueOnce(authIdentity) // First call for AuthIdentity
				.mockResolvedValueOnce(existingUser); // Second call for User

			//
			// ACT
			//
			await helpers.processUsers([], [[ldapId, updatedUser]], []);

			//
			// ASSERT
			//
			expect(transactionManager.save).toHaveBeenCalledWith(User, existingUser);
			expect(existingUser.email).toBe('new@example.com');
		});
	});
});
