import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import type { RoleMember, RoleMembersResponse } from '@n8n/api-types';
import { useRolesStore } from '@/app/stores/roles.store';
import { useUsersStore } from '@/features/settings/users/users.store';

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRoute: () => ({ params: {}, query: {} }),
	};
});

const InstanceRoleAssignmentsTab = (await import('./InstanceRoleAssignmentsTab.vue')).default;

const renderComponent = createComponentRenderer(InstanceRoleAssignmentsTab);

function member(overrides: Partial<RoleMember> = {}): RoleMember {
	return {
		userId: 'u-other',
		firstName: 'Giulio',
		lastName: 'Andreini',
		email: 'giulio@n8n.io',
		role: 'global:admin',
		...overrides,
	};
}

function membersResponse(members: RoleMember[]): RoleMembersResponse {
	return { members, total: members.length } as RoleMembersResponse;
}

const instanceRoles = [
	{ slug: 'global:admin', displayName: 'Instance admin' },
	{ slug: 'global:member', displayName: 'Member' },
];

let rolesStore: MockedStore<typeof useRolesStore>;
let usersStore: MockedStore<typeof useUsersStore>;

describe('InstanceRoleAssignmentsTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
		usersStore = mockedStore(useUsersStore);
		rolesStore.processedInstanceRoles = instanceRoles as never;
		rolesStore.fetchRoles.mockResolvedValue();
		usersStore.currentUserId = 'u-me';
		usersStore.allUsers = [] as never;
	});

	it('lists members by identity and marks the current user with "(you)"', async () => {
		rolesStore.fetchRoleMembers.mockResolvedValue(
			membersResponse([
				member({ userId: 'u-me', firstName: 'Jan', lastName: 'Ostrówka', email: 'jan@n8n.io' }),
				member(),
			]),
		);

		const { getByText, getAllByTestId } = renderComponent({ props: { roleSlug: 'global:admin' } });

		await waitFor(() => {
			expect(getByText('giulio@n8n.io')).toBeInTheDocument();
			expect(getByText('jan@n8n.io')).toBeInTheDocument();
		});

		const rows = getAllByTestId('instance-role-member-row');
		expect(rows[0]).toHaveTextContent('(you)');
		expect(rows[1]).not.toHaveTextContent('(you)');
	});

	it('shows each member role as read-only text', async () => {
		rolesStore.fetchRoleMembers.mockResolvedValue(membersResponse([member()]));

		const { getByText, queryByTestId } = renderComponent({ props: { roleSlug: 'global:admin' } });

		await waitFor(() => expect(getByText('giulio@n8n.io')).toBeInTheDocument());

		expect(getByText('Instance admin')).toBeInTheDocument();
		expect(queryByTestId('instance-role-member-dropdown')).not.toBeInTheDocument();
		expect(queryByTestId('instance-role-add-member')).not.toBeInTheDocument();
	});

	it('reloads members when the roleSlug prop changes', async () => {
		rolesStore.fetchRoleMembers.mockResolvedValue(membersResponse([member()]));

		const { rerender } = renderComponent({ props: { roleSlug: 'global:admin' } });

		await waitFor(() => expect(rolesStore.fetchRoleMembers).toHaveBeenCalledWith('global:admin'));

		await rerender({ roleSlug: 'global:member' });

		await waitFor(() => expect(rolesStore.fetchRoleMembers).toHaveBeenCalledWith('global:member'));
	});
});
