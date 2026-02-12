import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { Role } from '@n8n/permissions';
import RoleHoverPopover from './RoleHoverPopover.vue';
import { useUsersStore } from '@/features/settings/users/users.store';

const mockPush = vi.fn();

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: mockPush,
		}),
	};
});

const mockSystemRole: Role = {
	slug: 'project:admin',
	displayName: 'Admin',
	description: 'Can manage project settings and members',
	systemRole: true,
	licensed: true,
	roleType: 'project',
	scopes: ['project:read', 'project:update', 'workflow:read'],
};

const mockCustomRole: Role = {
	slug: 'project:custom-role',
	displayName: 'Custom Role',
	description: 'A custom role for testing',
	systemRole: false,
	licensed: true,
	roleType: 'project',
	scopes: ['project:read', 'workflow:read', 'workflow:update'],
};

// Stub that renders both default slot and content slot directly for testing
const N8nTooltipStub = {
	template: `
		<div>
			<slot />
			<div data-testid="tooltip-content">
				<slot name="content" />
			</div>
		</div>
	`,
};

const renderComponent = createComponentRenderer(RoleHoverPopover, {
	props: {
		role: mockSystemRole,
	},
	slots: {
		default: '<span>Trigger</span>',
	},
	global: {
		stubs: {
			N8nTooltip: N8nTooltipStub,
		},
	},
});

describe('RoleHoverPopover', () => {
	let usersStore: MockedStore<typeof useUsersStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		usersStore = mockedStore(useUsersStore);
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render slot content', () => {
			const { getByText } = renderComponent();

			expect(getByText('Trigger')).toBeInTheDocument();
		});

		it('should display role name in tooltip', () => {
			const { getByText } = renderComponent();

			expect(getByText('Admin')).toBeInTheDocument();
		});

		it('should display permission count', () => {
			const { getByText } = renderComponent();

			expect(getByText('3/31 permissions')).toBeInTheDocument();
		});

		it('should display role description when available', () => {
			const { getByText } = renderComponent();

			expect(getByText('Can manage project settings and members')).toBeInTheDocument();
		});

		it('should not show description when role has no description', () => {
			const roleWithoutDescription = { ...mockSystemRole, description: null };
			const { queryByText } = renderComponent({
				props: { role: roleWithoutDescription },
			});

			expect(queryByText('Can manage project settings and members')).not.toBeInTheDocument();
		});
	});

	describe('Button text based on permissions', () => {
		it('should show "View and edit role" for admin with custom role', () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);
			vi.spyOn(usersStore, 'isAdmin', 'get').mockReturnValue(true);

			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			expect(getByText('View and edit role')).toBeInTheDocument();
		});

		it('should show "View role" for non-admin', () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);
			vi.spyOn(usersStore, 'isAdmin', 'get').mockReturnValue(false);

			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			expect(getByText('View role')).toBeInTheDocument();
		});

		it('should show "View role" for system role even if admin', () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(true);
			vi.spyOn(usersStore, 'isAdmin', 'get').mockReturnValue(false);

			const { getByText } = renderComponent({
				props: { role: mockSystemRole },
			});

			expect(getByText('View role')).toBeInTheDocument();
		});
	});

	describe('Button click behavior', () => {
		it('should navigate to role settings for admin with custom role', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(true);
			vi.spyOn(usersStore, 'isAdmin', 'get').mockReturnValue(false);

			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			await userEvent.click(getByText('View and edit role'));

			expect(mockPush).toHaveBeenCalledWith({
				name: 'ProjectRoleSettingsView',
				params: { roleSlug: 'project:custom-role' },
			});
		});

		it('should navigate to view route for non-admin', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);
			vi.spyOn(usersStore, 'isAdmin', 'get').mockReturnValue(false);

			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			await userEvent.click(getByText('View role'));

			expect(mockPush).toHaveBeenCalledWith({
				name: 'ProjectRoleViewView',
				params: { roleSlug: 'project:custom-role' },
			});
		});

		it('should navigate to view route for system role even if admin', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(true);
			vi.spyOn(usersStore, 'isAdmin', 'get').mockReturnValue(false);

			const { getByText } = renderComponent({
				props: { role: mockSystemRole },
			});

			await userEvent.click(getByText('View role'));

			expect(mockPush).toHaveBeenCalledWith({
				name: 'ProjectRoleViewView',
				params: { roleSlug: 'project:admin' },
			});
		});
	});
});
