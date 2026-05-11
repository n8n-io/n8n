import { mockInstance } from '@n8n/backend-test-utils';
import { generateNanoId, AuthIdentity, User, UserRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import * as helpers from '../helpers.ee';

const userRepository = mockInstance(UserRepository);

describe('Ldap/helpers', () => {
	describe('createFilter', () => {
		test('should wrap the inner filter with the default objectClass discriminator when no userFilter is configured', () => {
			const result = helpers.createFilter('(uid=alice)', '');

			expect(result).toBe('(&(|(objectClass=person)(objectClass=user))(uid=alice))');
		});

		test('should produce a balanced filter when userFilter is configured', () => {
			const result = helpers.createFilter('(uid=alice)', '(objectClass=inetOrgPerson)');

			expect(result).toBe('(&(objectClass=inetOrgPerson)(uid=alice))');
			// Sanity check: every opening paren has a matching closing paren.
			const opens = (result.match(/\(/g) ?? []).length;
			const closes = (result.match(/\)/g) ?? []).length;
			expect(opens).toBe(closes);
		});

		test('should fall through to the default discriminator when userFilter is empty', () => {
			const result = helpers.createFilter('(uid=alice)', '');

			expect(result).toContain('(|(objectClass=person)(objectClass=user))');
		});

		test('should interpolate the inner filter verbatim (caller is responsible for escaping)', () => {
			// The contract: the caller passes an already-escaped filter fragment.
			// createFilter must not re-escape or mutate it.
			const preEscaped = '(uid=alice\\2a)';
			const result = helpers.createFilter(preEscaped, '');

			expect(result).toContain(preEscaped);
		});
	});

	describe('escapeFilter', () => {
		test.each([
			['*', '\\2a'],
			['(', '\\28'],
			[')', '\\29'],
			['\\', '\\5c'],
			['\0', '\\00'],
		])('should escape %p as %p', (input, expected) => {
			expect(helpers.escapeFilter(input)).toBe(expected);
		});

		test('should escape combined special characters in a single string', () => {
			expect(helpers.escapeFilter('alice*')).toBe('alice\\2a');
			expect(helpers.escapeFilter('*)(uid=*')).toBe('\\2a\\29\\28uid=\\2a');
			expect(helpers.escapeFilter('alice\\)')).toBe('alice\\5c\\29');
		});

		test('should pass through strings without special characters unchanged', () => {
			expect(helpers.escapeFilter('alice')).toBe('alice');
			expect(helpers.escapeFilter('')).toBe('');
			expect(helpers.escapeFilter('user@example.com')).toBe('user@example.com');
		});
	});

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
				findOne: jest.fn(),
				findOneBy: jest.fn(),
				save: jest.fn(),
				update: jest.fn(),
			});

			mockManagerTransaction = jest.fn();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(userRepository as any).manager = { transaction: mockManagerTransaction };

			userRepository.createUserWithProject.mockReset();
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

		test('links existing local user by email instead of creating a duplicate', async () => {
			//
			// ARRANGE
			//
			const ldapId = 'ldap-new';
			const ldapUser = Object.assign(new User(), {
				email: 'shared@example.com',
				firstName: 'Jane',
				lastName: 'Doe',
			} as User);

			const existingLocalUser = Object.assign(new User(), {
				id: generateNanoId(),
				email: 'shared@example.com',
				firstName: 'Jane',
				lastName: 'Doe',
			} as User);

			mockManagerTransaction.mockImplementation(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				async (fn: (manager: EntityManager) => Promise<any>) => await fn(transactionManager),
			);

			(transactionManager.findOne as jest.Mock).mockResolvedValueOnce(existingLocalUser);

			//
			// ACT
			//
			await helpers.processUsers([[ldapId, ldapUser]], [], []);

			//
			// ASSERT
			//
			expect(userRepository.createUserWithProject).not.toHaveBeenCalled();
			expect(transactionManager.save).toHaveBeenCalledTimes(1);
			const savedAuthIdentity = (transactionManager.save as jest.Mock).mock.calls[0][0];
			expect(savedAuthIdentity).toBeInstanceOf(AuthIdentity);
			expect(savedAuthIdentity.providerId).toBe(ldapId);
			expect(savedAuthIdentity.providerType).toBe('ldap');
			expect(savedAuthIdentity.userId).toBe(existingLocalUser.id);
		});

		test('updates firstName/lastName when linking an existing local user with stale names', async () => {
			//
			// ARRANGE
			//
			const ldapId = 'ldap-new';
			const ldapUser = Object.assign(new User(), {
				email: 'shared@example.com',
				firstName: 'Jane',
				lastName: 'Doe',
			} as User);

			const existingLocalUser = Object.assign(new User(), {
				id: generateNanoId(),
				email: 'shared@example.com',
				firstName: 'Stale',
				lastName: 'Name',
			} as User);

			mockManagerTransaction.mockImplementation(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				async (fn: (manager: EntityManager) => Promise<any>) => await fn(transactionManager),
			);

			(transactionManager.findOne as jest.Mock).mockResolvedValueOnce(existingLocalUser);

			//
			// ACT
			//
			await helpers.processUsers([[ldapId, ldapUser]], [], []);

			//
			// ASSERT
			//
			expect(transactionManager.save).toHaveBeenCalledWith(User, existingLocalUser);
			expect(existingLocalUser.firstName).toBe('Jane');
			expect(existingLocalUser.lastName).toBe('Doe');
		});

		test('creates a new user when no local user matches by email', async () => {
			//
			// ARRANGE
			//
			const ldapId = 'ldap-new';
			const ldapUser = Object.assign(new User(), {
				email: 'brand-new@example.com',
				firstName: 'New',
				lastName: 'Person',
			} as User);

			const createdUser = Object.assign(new User(), {
				id: generateNanoId(),
				email: 'brand-new@example.com',
				firstName: 'New',
				lastName: 'Person',
			} as User);

			mockManagerTransaction.mockImplementation(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				async (fn: (manager: EntityManager) => Promise<any>) => await fn(transactionManager),
			);

			(transactionManager.findOne as jest.Mock).mockResolvedValueOnce(null);
			(userRepository.createUserWithProject as jest.Mock).mockResolvedValueOnce({
				user: createdUser,
			});

			//
			// ACT
			//
			await helpers.processUsers([[ldapId, ldapUser]], [], []);

			//
			// ASSERT
			//
			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				ldapUser,
				transactionManager,
			);
			const savedAuthIdentity = (transactionManager.save as jest.Mock).mock.calls[0][0];
			expect(savedAuthIdentity).toBeInstanceOf(AuthIdentity);
			expect(savedAuthIdentity.providerId).toBe(ldapId);
			expect(savedAuthIdentity.userId).toBe(createdUser.id);
		});
	});
});
