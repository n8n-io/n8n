import type { CurrentUserResponse } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from './users.store';
import { createPinia, setActivePinia } from 'pinia';

const { loginCurrentUser, inviteUsers, login, logout } = vi.hoisted(() => {
	return {
		loginCurrentUser: vi.fn(),
		identify: vi.fn(),
		inviteUsers: vi.fn(),
		login: vi.fn(),
		logout: vi.fn(),
	};
});

vi.mock('@n8n/rest-api-client/api/users', () => ({
	loginCurrentUser,
	login,
	logout,
}));

vi.mock('./invitation.api', () => ({
	inviteUsers,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		instanceId: 'test-instance-id',
	})),
}));

const mockUser: CurrentUserResponse = {
	id: '1',
	firstName: 'John Doe',
	role: 'global:owner',
	isPending: false,
};

describe('users.store', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
	});

	describe('loginWithCookie', () => {
		it('should set current user', async () => {
			const usersStore = useUsersStore();

			loginCurrentUser.mockResolvedValueOnce(mockUser);

			await usersStore.loginWithCookie();

			expect(loginCurrentUser).toHaveBeenCalled();
			expect(usersStore.currentUserId).toEqual(mockUser.id);
			expect(usersStore.currentUser).toEqual({
				...mockUser,
				fullName: `${mockUser.firstName} `,
				isDefaultUser: false,
				isPendingUser: false,
			});
		});
	});

	describe('inviteUsers', () => {
		it('should add pending user to the store', async () => {
			const usersStore = useUsersStore();

			inviteUsers.mockResolvedValueOnce([
				{
					user: { id: 'random-id', email: 'test@n8n.io', emailSent: true, role: 'global:member' },
				},
			]);

			await usersStore.inviteUsers([{ email: 'test@n8n.io', role: 'global:member' }]);

			expect(usersStore.allUsers[0]).toMatchObject(
				expect.objectContaining({
					id: 'random-id',
					email: 'test@n8n.io',
					role: 'global:member',
					isPending: true,
					isDefaultUser: false,
					isPendingUser: true,
					fullName: undefined,
					emailSent: true,
				}),
			);
		});
	});

	describe('isCalloutDismissed', () => {
		it('should return true if callout is dismissed', () => {
			const usersStore = useUsersStore();

			usersStore.usersById['1'] = {
				...mockUser,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				settings: {
					dismissedCallouts: {
						testCallout: true,
					},
				},
			};
			usersStore.currentUserId = '1';

			const isDismissed = usersStore.isCalloutDismissed('testCallout');
			expect(isDismissed).toBe(true);
		});
	});

	describe('addUsers', () => {
		it('should add a single user to the store', () => {
			const usersStore = useUsersStore();

			usersStore.addUsers([
				{
					id: '1',
					firstName: 'John',
					lastName: 'Doe',
					role: 'global:member',
					isPending: false,
				},
			]);

			expect(usersStore.usersById['1']).toMatchObject({
				id: '1',
				firstName: 'John',
				lastName: 'Doe',
				fullName: 'John Doe',
				isDefaultUser: false,
				isPendingUser: false,
			});
		});

		it('should add multiple users in a single batch update', () => {
			const usersStore = useUsersStore();

			usersStore.addUsers([
				{
					id: '1',
					firstName: 'John',
					lastName: 'Doe',
					role: 'global:member',
					isPending: false,
				},
				{
					id: '2',
					firstName: 'Jane',
					lastName: 'Smith',
					role: 'global:admin',
					isPending: false,
				},
				{
					id: '3',
					firstName: 'Bob',
					role: 'global:owner',
					isPending: true,
				},
			]);

			expect(Object.keys(usersStore.usersById)).toHaveLength(3);
			expect(usersStore.usersById['1'].fullName).toBe('John Doe');
			expect(usersStore.usersById['2'].fullName).toBe('Jane Smith');
			expect(usersStore.usersById['3'].isDefaultUser).toBe(true);
			expect(usersStore.usersById['3'].isPendingUser).toBe(true);
		});

		it('should merge with existing user data', () => {
			const usersStore = useUsersStore();

			// Add initial user
			usersStore.usersById['1'] = {
				id: '1',
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				role: 'global:member',
				isPending: false,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				settings: { userActivated: true },
			};

			// Update the user with new data
			usersStore.addUsers([
				{
					id: '1',
					firstName: 'Johnny',
					lastName: 'Doe',
					role: 'global:admin',
					isPending: false,
				},
			]);

			// Should merge: keep email and settings, update firstName and role
			expect(usersStore.usersById['1']).toMatchObject({
				id: '1',
				firstName: 'Johnny',
				lastName: 'Doe',
				email: 'john@example.com',
				role: 'global:admin',
				fullName: 'Johnny Doe',
				settings: { userActivated: true },
			});
		});

		it('should preserve existing users when adding new ones', () => {
			const usersStore = useUsersStore();

			// Add initial user
			usersStore.usersById['1'] = {
				id: '1',
				firstName: 'John',
				lastName: 'Doe',
				role: 'global:member',
				isPending: false,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
			};

			// Add a new user
			usersStore.addUsers([
				{
					id: '2',
					firstName: 'Jane',
					lastName: 'Smith',
					role: 'global:member',
					isPending: false,
				},
			]);

			// Both users should exist
			expect(Object.keys(usersStore.usersById)).toHaveLength(2);
			expect(usersStore.usersById['1'].firstName).toBe('John');
			expect(usersStore.usersById['2'].firstName).toBe('Jane');
		});

		it('should set fullName to undefined when firstName is not provided', () => {
			const usersStore = useUsersStore();

			usersStore.addUsers([
				{
					id: '1',
					email: 'test@example.com',
					role: 'global:member',
					isPending: true,
				},
			]);

			expect(usersStore.usersById['1'].fullName).toBeUndefined();
		});
	});

	describe('setCalloutDismissed', () => {
		it('should set callout as dismissed in user settings', () => {
			const usersStore = useUsersStore();

			usersStore.usersById['1'] = {
				...mockUser,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				settings: {},
			};
			usersStore.currentUserId = '1';

			usersStore.setCalloutDismissed('testCallout');

			expect(usersStore.usersById['1'].settings?.dismissedCallouts).toEqual({
				testCallout: true,
			});
		});

		it('should not lose existing dismissed callouts', () => {
			const usersStore = useUsersStore();

			usersStore.usersById['1'] = {
				...mockUser,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				settings: {
					dismissedCallouts: {
						previousCallout: true,
					},
				},
			};
			usersStore.currentUserId = '1';

			usersStore.setCalloutDismissed('testCallout');

			expect(usersStore.usersById['1'].settings?.dismissedCallouts).toEqual({
				previousCallout: true,
				testCallout: true,
			});
		});
	});

	describe('loggingHooks', () => {
		it('should run all registered loginHooks', async () => {
			const usersStore = useUsersStore();
			loginCurrentUser.mockResolvedValueOnce(mockUser);

			const hook1 = vi.fn(async () => {});
			const hook2 = vi.fn(async () => {});
			const hook3 = vi.fn(async () => {});

			usersStore.registerLoginHook(hook1);
			usersStore.registerLoginHook(hook2);
			usersStore.registerLoginHook(hook3);

			await usersStore.loginWithCookie();

			expect(hook1).toHaveBeenCalled();
			expect(hook2).toHaveBeenCalled();
			expect(hook3).toHaveBeenCalled();
		});

		it('should fail silently if a login hook fails', async () => {
			const usersStore = useUsersStore();
			login.mockResolvedValueOnce(mockUser);

			const errorHook = vi.fn(() => {
				throw new Error('Hook failed');
			});
			const errorAsyncHook = vi.fn(async () => {
				throw new Error('Hook failed');
			});
			const successAsyncHook = vi.fn(async () => {});
			const successHook = vi.fn();

			usersStore.registerLoginHook(errorHook);
			usersStore.registerLoginHook(errorAsyncHook);
			usersStore.registerLoginHook(successAsyncHook);
			usersStore.registerLoginHook(successHook);

			await usersStore.loginWithCreds({
				emailOrLdapLoginId: 'test@n8n.io',
				password: 'test-password',
			});

			expect(errorHook).toHaveBeenCalled();
			expect(errorAsyncHook).toHaveBeenCalled();
			expect(successAsyncHook).toHaveBeenCalled();
			expect(successHook).toHaveBeenCalled();
		});
	});

	describe('logoutHooks', () => {
		it('should run all registered logoutHooks', async () => {
			const usersStore = useUsersStore();

			const hook1 = vi.fn();
			const hook2 = vi.fn(async () => {});
			const hook3 = vi.fn(async () => {});

			usersStore.registerLogoutHook(hook1);
			usersStore.registerLogoutHook(hook2);
			usersStore.registerLogoutHook(hook3);

			await usersStore.logout();

			expect(hook1).toHaveBeenCalled();
			expect(hook2).toHaveBeenCalled();
			expect(hook3).toHaveBeenCalled();
		});

		it('should fail silently if a logout hook fails', async () => {
			const usersStore = useUsersStore();
			logout.mockResolvedValueOnce(mockUser);

			const errorHook = vi.fn(() => {
				throw new Error('Hook failed');
			});
			const errorAsyncHook = vi.fn(async () => {
				throw new Error('Hook failed');
			});
			const successAsyncHook = vi.fn(async () => {});
			const successHook = vi.fn();

			usersStore.registerLogoutHook(errorHook);
			usersStore.registerLogoutHook(errorAsyncHook);
			usersStore.registerLogoutHook(successAsyncHook);
			usersStore.registerLogoutHook(successHook);

			await usersStore.logout();

			expect(errorHook).toHaveBeenCalled();
			expect(errorAsyncHook).toHaveBeenCalled();
			expect(successAsyncHook).toHaveBeenCalled();
			expect(successHook).toHaveBeenCalled();
		});
	});
});
