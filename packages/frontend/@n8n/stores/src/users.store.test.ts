import type { FrontendSettings } from '@n8n/api-types';
import type { CurrentUserResponse } from '@n8n/rest-api-client/api/users';
import { createPinia, setActivePinia } from 'pinia';

import { useSettingsStore } from './settings.store';
import { useUsersStore } from './users.store';

const { loginCurrentUser, inviteUsers, login, logout, getUsers } = vi.hoisted(() => {
	return {
		loginCurrentUser: vi.fn(),
		identify: vi.fn(),
		inviteUsers: vi.fn(),
		login: vi.fn(),
		logout: vi.fn(),
		getUsers: vi.fn(),
	};
});

vi.mock('@n8n/rest-api-client/api/users', () => ({
	loginCurrentUser,
	login,
	logout,
	getUsers,
}));

vi.mock('./invitation.api', () => ({
	inviteUsers,
}));

vi.mock('./useRootStore', () => ({
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
			const errorAsyncHook = vi.fn().mockRejectedValue(new Error('Hook failed'));
			const successAsyncHook = vi.fn().mockResolvedValue(undefined);
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

	describe('showPersonalizationSurvey', () => {
		const enableSurvey = () => {
			// Assign the settings ref directly; setSettings() runs extra bootstrap logic
			// (auth cookie handling) that a partial fixture can't satisfy.
			useSettingsStore().settings = {
				telemetry: { enabled: true },
				personalizationSurveyEnabled: true,
			} as unknown as FrontendSettings;
		};

		const setCurrentUser = (usersStore: ReturnType<typeof useUsersStore>) => {
			usersStore.usersById['1'] = {
				...mockUser,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
			};
			usersStore.currentUserId = '1';
		};

		it('opens the personalization modal through the registered opener', () => {
			const usersStore = useUsersStore();
			enableSurvey();
			setCurrentUser(usersStore);

			const openModal = vi.fn();
			usersStore.registerModalOpeners({ openModal, openModalWithData: vi.fn() });

			usersStore.showPersonalizationSurvey();

			// The store passes the app's personalization modal key to the injected opener.
			expect(openModal).toHaveBeenCalledWith('personalization');
		});

		it('does not open the modal when the survey is disabled', () => {
			const usersStore = useUsersStore();
			setCurrentUser(usersStore);

			const openModal = vi.fn();
			usersStore.registerModalOpeners({ openModal, openModalWithData: vi.fn() });

			usersStore.showPersonalizationSurvey();

			expect(openModal).not.toHaveBeenCalled();
		});

		it('does not throw when no opener is registered', () => {
			const usersStore = useUsersStore();
			enableSurvey();
			setCurrentUser(usersStore);

			// No registerModalOpeners() — the default no-op opener must not break the flow.
			expect(() => usersStore.showPersonalizationSurvey()).not.toThrow();
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
			const errorAsyncHook = vi.fn().mockRejectedValue(new Error('Hook failed'));
			const successAsyncHook = vi.fn().mockResolvedValue(undefined);
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

	describe('personalizedNodeTypes', () => {
		const setCurrentUserWithAnswers = (
			usersStore: ReturnType<typeof useUsersStore>,
			personalizationAnswers?: object,
		) => {
			usersStore.usersById['1'] = {
				...mockUser,
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				...(personalizationAnswers ? { personalizationAnswers } : {}),
			} as never;
			usersStore.currentUserId = '1';
		};

		it('returns an empty list when no resolver is registered', () => {
			const usersStore = useUsersStore();
			setCurrentUserWithAnswers(usersStore, { version: 'v4' });

			expect(usersStore.personalizedNodeTypes).toEqual([]);
		});

		it('delegates to the injected resolver when one is registered', () => {
			const usersStore = useUsersStore();
			setCurrentUserWithAnswers(usersStore, { version: 'v4' });

			const resolver = vi.fn(() => ['n8n-nodes-base.webhook']);
			usersStore.setNodeTypesResolver(resolver);

			expect(usersStore.personalizedNodeTypes).toEqual(['n8n-nodes-base.webhook']);
			expect(resolver).toHaveBeenCalledWith(expect.objectContaining({ version: 'v4' }));
		});

		it('returns an empty list when the current user has no answers', () => {
			const usersStore = useUsersStore();
			setCurrentUserWithAnswers(usersStore);

			const resolver = vi.fn(() => ['n8n-nodes-base.webhook']);
			usersStore.setNodeTypesResolver(resolver);

			expect(usersStore.personalizedNodeTypes).toEqual([]);
			expect(resolver).not.toHaveBeenCalled();
		});
	});

	describe('fetchUsers', () => {
		it('does not fetch when the injected permission check denies listing (default)', async () => {
			const usersStore = useUsersStore();

			await usersStore.fetchUsers();

			expect(getUsers).not.toHaveBeenCalled();
		});

		it('fetches when the injected permission check allows listing users', async () => {
			const usersStore = useUsersStore();
			usersStore.setPermissionsResolvers({ listUsers: () => true });
			getUsers.mockResolvedValueOnce({ count: 0, items: [] });

			await usersStore.fetchUsers();

			expect(getUsers).toHaveBeenCalled();
		});
	});
});
