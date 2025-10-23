import type { CurrentUserResponse } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from './users.store';
import { createPinia, setActivePinia } from 'pinia';

const { loginCurrentUser, inviteUsers, login } = vi.hoisted(() => {
	return {
		loginCurrentUser: vi.fn(),
		identify: vi.fn(),
		inviteUsers: vi.fn(),
		login: vi.fn(),
	};
});

vi.mock('@n8n/rest-api-client/api/users', () => ({
	loginCurrentUser,
	login,
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
		it.todo('should run all registered logoutHooks', () => {});

		it.todo('should fail silently if a logout hook fails', () => {});
	});
});
