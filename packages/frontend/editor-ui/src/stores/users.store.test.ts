import type { CurrentUserResponse } from '@/Interface';
import { useUsersStore } from './users.store';
import { createPinia, setActivePinia } from 'pinia';

const { loginCurrentUser, inviteUsers } = vi.hoisted(() => {
	return {
		loginCurrentUser: vi.fn(),
		identify: vi.fn(),
		inviteUsers: vi.fn(),
	};
});

vi.mock('@/api/users', () => ({
	loginCurrentUser,
}));

vi.mock('@/api/invitation', () => ({
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
});
