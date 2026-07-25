import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { useRolesStore } from '@/app/stores/roles.store';
import { mockedStore, waitAllPromises, type MockedStore } from '@/__tests__/utils';
import type { Role } from '@n8n/permissions';
import { useRoleDeletion } from './useRoleDeletion';

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();
const mockConfirm = vi.fn();
const mockTrack = vi.fn();
const mockPush = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTrack }),
}));

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({ push: mockPush }),
	};
});

function withSetup() {
	let result!: ReturnType<typeof useRoleDeletion>;
	const comp = defineComponent({
		setup() {
			result = useRoleDeletion();
			return () => null;
		},
	});
	const wrapper = mount(comp);
	return { result, unmount: () => wrapper.unmount() };
}

const mockRole: Role = {
	displayName: 'Support',
	slug: 'support',
	description: 'A custom instance role',
	scopes: ['user:read'],
	licensed: true,
	systemRole: false,
	roleType: 'global',
	usedByUsers: 3,
};

let rolesStore: MockedStore<typeof useRolesStore>;

describe('useRoleDeletion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
	});

	describe('reassign-and-delete flow', () => {
		it('opens the reassign modal instead of deleting immediately when a global role has assigned users', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockRole, usedByUsers: 3 });
			const { result, unmount } = withSetup();

			await result.requestDelete(mockRole, { roleType: 'global' });

			expect(result.reassignState.value).toEqual({
				role: mockRole,
				userCount: 3,
				roleType: 'global',
				redirectTo: undefined,
			});
			expect(rolesStore.deleteRole).not.toHaveBeenCalled();
			unmount();
		});

		it('calls deleteRole with both the deleted role slug and the chosen reassignment slug', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockRole, usedByUsers: 3 });
			rolesStore.deleteRole.mockResolvedValue(mockRole);
			rolesStore.roles.global = [mockRole];

			const { result, unmount } = withSetup();
			await result.requestDelete(mockRole, { roleType: 'global' });

			result.confirmReassignDelete('global:member');
			await waitAllPromises();

			expect(rolesStore.deleteRole).toHaveBeenCalledWith('support', 'global:member');
			unmount();
		});

		it('clears the pending reassign state as soon as a target role is selected', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockRole, usedByUsers: 3 });
			rolesStore.deleteRole.mockResolvedValue(mockRole);
			rolesStore.roles.global = [mockRole];

			const { result, unmount } = withSetup();
			await result.requestDelete(mockRole, { roleType: 'global' });
			expect(result.reassignState.value).not.toBeNull();

			result.confirmReassignDelete('global:member');

			expect(result.reassignState.value).toBeNull();
			unmount();
		});

		it('on success: removes the role locally, refetches roles, shows a success toast, tracks telemetry, and redirects', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockRole, usedByUsers: 3 });
			rolesStore.deleteRole.mockResolvedValue(mockRole);
			rolesStore.roles.global = [mockRole];
			rolesStore.fetchRoles.mockResolvedValue();

			const redirectTo = { name: 'roles-settings' };
			const { result, unmount } = withSetup();
			await result.requestDelete(mockRole, { roleType: 'global', redirectTo });

			result.confirmReassignDelete('global:member');
			await waitAllPromises();

			expect(rolesStore.roles.global).toEqual([]);
			// Reassignment shifts the target role's member count, so roles are refetched.
			expect(rolesStore.fetchRoles).toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledWith({
				title: 'Role deleted',
				type: 'success',
			});
			expect(mockTrack).toHaveBeenCalledWith(
				'User successfully deleted role',
				expect.objectContaining({ role_id: mockRole.slug, role_name: mockRole.displayName }),
			);
			expect(mockPush).toHaveBeenCalledWith(redirectTo);
			unmount();
		});

		it('on failure: shows an error toast and does not remove the role locally', async () => {
			rolesStore.fetchRoleBySlug.mockResolvedValue({ ...mockRole, usedByUsers: 3 });
			const error = new Error('boom');
			rolesStore.deleteRole.mockRejectedValue(error);
			rolesStore.roles.global = [mockRole];

			const { result, unmount } = withSetup();
			await result.requestDelete(mockRole, { roleType: 'global' });

			result.confirmReassignDelete('global:member');
			await waitAllPromises();

			expect(rolesStore.roles.global).toEqual([mockRole]);
			expect(mockShowError).toHaveBeenCalledWith(error, 'Error deleting role');
			expect(mockShowMessage).not.toHaveBeenCalled();
			unmount();
		});
	});

	describe('standard delete flow (no assigned users / project roles)', () => {
		it('deletes immediately without a reassignment slug once confirmed', async () => {
			const projectRole = { ...mockRole, roleType: 'project' as const, usedByUsers: undefined };
			mockConfirm.mockResolvedValue('confirm');
			rolesStore.deleteRole.mockResolvedValue(projectRole);
			rolesStore.roles.project = [projectRole];

			const { result, unmount } = withSetup();
			await result.requestDelete(projectRole, { roleType: 'project' });

			expect(rolesStore.deleteRole).toHaveBeenCalledWith('support', undefined);
			expect(result.reassignState.value).toBeNull();
			unmount();
		});

		it('does not delete when the confirmation dialog is dismissed', async () => {
			mockConfirm.mockResolvedValue('cancel');
			const projectRole = { ...mockRole, roleType: 'project' as const, usedByUsers: undefined };

			const { result, unmount } = withSetup();
			await result.requestDelete(projectRole, { roleType: 'project' });

			expect(rolesStore.deleteRole).not.toHaveBeenCalled();
			unmount();
		});
	});

	describe('onBeforeDelete guard', () => {
		it('aborts the deletion when the guard returns false', async () => {
			const onBeforeDelete = vi.fn().mockResolvedValue(false);

			const { result, unmount } = withSetup();
			await result.requestDelete(mockRole, { roleType: 'global', onBeforeDelete });

			expect(onBeforeDelete).toHaveBeenCalledWith(mockRole);
			expect(rolesStore.fetchRoleBySlug).not.toHaveBeenCalled();
			expect(rolesStore.deleteRole).not.toHaveBeenCalled();
			unmount();
		});
	});
});
