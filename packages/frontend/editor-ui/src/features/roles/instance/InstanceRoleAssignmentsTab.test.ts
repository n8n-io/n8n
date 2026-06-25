import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { RoleMember, RoleMembersResponse } from '@n8n/api-types';
import { useRolesStore } from '@/app/stores/roles.store';
import { useUsersStore } from '@/features/settings/users/users.store';

// Drives whether the tab is editable; toggled per test.
const mockHasPermission = vi.fn(() => true);
vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: () => mockHasPermission(),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
		useRoute: () => ({ params: {}, query: {} }),
	};
});

// Stub the two interactive design-system components so their emits can be driven directly.
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionDropdown: {
			name: 'N8nActionDropdown',
			props: { items: { type: Array, required: true } },
			emits: ['select'],
			template: `
				<div data-test-id="instance-role-member-dropdown">
					<slot name="activator" />
					<button
						v-for="item in items"
						:key="item.id"
						:data-test-id="'action-' + item.id"
						@click="$emit('select', item.id)"
					/>
				</div>
			`,
		},
		N8nUserSelect: {
			name: 'N8nUserSelect',
			emits: ['update:model-value'],
			template: `
				<button data-test-id="instance-role-add-member" @click="$emit('update:model-value', 'new-user')" />
			`,
		},
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
		mockHasPermission.mockReturnValue(true);
		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
		usersStore = mockedStore(useUsersStore);
		rolesStore.processedInstanceRoles = instanceRoles as never;
		rolesStore.fetchRoles.mockResolvedValue();
		usersStore.currentUserId = 'u-me';
		usersStore.allUsers = [] as never;
		usersStore.fetchUsers.mockResolvedValue(undefined);
		usersStore.updateGlobalRole.mockResolvedValue(undefined as never);
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

	it('changes a member role inline and refreshes the list and counts', async () => {
		rolesStore.fetchRoleMembers.mockResolvedValue(membersResponse([member()]));

		const { getByTestId } = renderComponent({ props: { roleSlug: 'global:admin' } });

		await waitFor(() => expect(getByTestId('action-global:member')).toBeInTheDocument());

		await userEvent.click(getByTestId('action-global:member'));

		await waitFor(() => {
			expect(usersStore.updateGlobalRole).toHaveBeenCalledWith({
				id: 'u-other',
				newRoleName: 'global:member',
			});
		});
		// once on mount, once after the change
		expect(rolesStore.fetchRoleMembers).toHaveBeenCalledTimes(2);
		expect(rolesStore.fetchRoles).toHaveBeenCalled();
	});

	it('assigns this role to a picked user via the add-member search', async () => {
		rolesStore.fetchRoleMembers.mockResolvedValue(membersResponse([member()]));

		const { getByTestId } = renderComponent({ props: { roleSlug: 'global:admin' } });

		await waitFor(() => expect(getByTestId('instance-role-add-member')).toBeInTheDocument());

		await userEvent.click(getByTestId('instance-role-add-member'));

		await waitFor(() => {
			expect(usersStore.updateGlobalRole).toHaveBeenCalledWith({
				id: 'new-user',
				newRoleName: 'global:admin',
			});
		});
	});

	it('disables each row independently when two role changes overlap', async () => {
		const deferred = new Map<string, () => void>();
		usersStore.updateGlobalRole.mockImplementation(
			async ({ id }: { id: string }) =>
				await new Promise<void>((resolve) => deferred.set(id, resolve)),
		);
		rolesStore.fetchRoleMembers.mockResolvedValue(
			membersResponse([
				member({ userId: 'u-a', email: 'a@n8n.io' }),
				member({ userId: 'u-b', email: 'b@n8n.io' }),
			]),
		);

		const { getAllByTestId } = renderComponent({ props: { roleSlug: 'global:admin' } });

		await waitFor(() => expect(getAllByTestId('instance-role-member-row')).toHaveLength(2));

		// The role-label activator button (type="button") carries the per-row disabled state.
		const activator = (row: HTMLElement) =>
			row.querySelector('button[type="button"]') as HTMLButtonElement;
		const rows = () => getAllByTestId('instance-role-member-row');

		// Start both edits; neither updateGlobalRole promise has resolved yet.
		const dropdowns = getAllByTestId('action-global:member');
		await userEvent.click(dropdowns[0]);
		await userEvent.click(dropdowns[1]);

		await waitFor(() => {
			expect(activator(rows()[0]).disabled).toBe(true);
			expect(activator(rows()[1]).disabled).toBe(true);
		});

		// Resolving one edit must re-enable only its own row.
		deferred.get('u-a')?.();
		await waitFor(() => expect(activator(rows()[0]).disabled).toBe(false));
		expect(activator(rows()[1]).disabled).toBe(true);

		deferred.get('u-b')?.();
		await waitFor(() => expect(activator(rows()[1]).disabled).toBe(false));
	});

	it('is read-only without user:changeRole', async () => {
		mockHasPermission.mockReturnValue(false);
		rolesStore.fetchRoleMembers.mockResolvedValue(membersResponse([member()]));

		const { queryByTestId, getByText } = renderComponent({ props: { roleSlug: 'global:admin' } });

		await waitFor(() => expect(getByText('giulio@n8n.io')).toBeInTheDocument());

		expect(queryByTestId('instance-role-add-member')).not.toBeInTheDocument();
		expect(queryByTestId('instance-role-member-dropdown')).not.toBeInTheDocument();
		// role still shown as plain text
		expect(getByText('Instance admin')).toBeInTheDocument();
	});
});
