import type { CurrentUserResponse } from '@/Interface';
import { useUsersStore } from './users.store';
import { createPinia, setActivePinia } from 'pinia';

const { loginCurrentUser, identify, inviteUsers } = vi.hoisted(() => {
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

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		identify,
	})),
}));

vi.mock('@/stores/root.store', () => ({
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

			expect(identify).toHaveBeenCalledWith('test-instance-id', mockUser.id);
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
});
