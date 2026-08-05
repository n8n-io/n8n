import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { Role } from '@n8n/permissions';
import RoleHoverPopover from './RoleHoverPopover.vue';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { TOTAL_PROJECT_PERMISSIONS } from '@/features/roles/project/projectRoleScopes';

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(),
}));

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
	let settingsStore: MockedStore<typeof useSettingsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isCustomRolesFeatureEnabled = true;
		vi.mocked(hasPermission).mockReturnValue(false);
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

			expect(getByText(`3/${TOTAL_PROJECT_PERMISSIONS} permissions`)).toBeInTheDocument();
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
		it('should show "View and edit role" when user has role:manage and role is custom', () => {
			vi.mocked(hasPermission).mockReturnValue(true);

			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			expect(getByText('View and edit role')).toBeInTheDocument();
		});

		it('should show "View role" when user lacks role:manage', () => {
			vi.mocked(hasPermission).mockReturnValue(false);

			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			expect(getByText('View role')).toBeInTheDocument();
		});

		it('should disable the button when user lacks role:manage', () => {
			vi.mocked(hasPermission).mockReturnValue(false);

			const { getByRole } = renderComponent({
				props: { role: mockCustomRole },
			});

			expect(getByRole('button', { name: /view role/i })).toBeDisabled();
		});

		it('should not disable the button when user has role:manage', () => {
			vi.mocked(hasPermission).mockReturnValue(true);

			const { getByRole } = renderComponent({
				props: { role: mockCustomRole },
			});

			expect(getByRole('button', { name: /view and edit role/i })).not.toBeDisabled();
		});

		it('should show "View role" for system role even when user has role:manage', () => {
			vi.mocked(hasPermission).mockReturnValue(true);

			const { getByText } = renderComponent({
				props: { role: mockSystemRole },
			});

			expect(getByText('View role')).toBeInTheDocument();
		});
	});

	describe('Button click behavior', () => {
		it('should navigate to role settings when user has role:manage and role is custom', async () => {
			vi.mocked(hasPermission).mockReturnValue(true);

			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			await userEvent.click(getByText('View and edit role'));

			expect(mockPush).toHaveBeenCalledWith({
				name: 'ProjectRoleSettingsView',
				params: { roleSlug: 'project:custom-role' },
				query: { from: VIEWS.PROJECT_SETTINGS },
			});
		});

		it('should not navigate when user lacks role:manage because the button is disabled', async () => {
			vi.mocked(hasPermission).mockReturnValue(false);

			const { getByRole } = renderComponent({
				props: { role: mockCustomRole },
			});

			const button = getByRole('button', { name: /view role/i });
			expect(button).toBeDisabled();

			await userEvent.click(button);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should navigate to view route for system role even when user has role:manage', async () => {
			vi.mocked(hasPermission).mockReturnValue(true);

			const { getByText } = renderComponent({
				props: { role: mockSystemRole },
			});

			await userEvent.click(getByText('View role'));

			expect(mockPush).toHaveBeenCalledWith({
				name: 'ProjectRoleViewView',
				params: { roleSlug: 'project:admin' },
				query: { from: VIEWS.PROJECT_SETTINGS },
			});
		});
	});

	describe('Upgrade modal (no enterprise license)', () => {
		beforeEach(() => {
			settingsStore.isCustomRolesFeatureEnabled = false;
			vi.mocked(hasPermission).mockReturnValue(true);
		});

		it('should show upgrade modal instead of navigating when clicking on a custom role', async () => {
			const { getByText } = renderComponent({
				props: { role: mockCustomRole },
			});

			await userEvent.click(getByText('View and edit role'));

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should show upgrade modal instead of navigating when clicking "view role details" on a system role', async () => {
			const { getByText } = renderComponent({
				props: { role: mockSystemRole },
			});

			await userEvent.click(getByText('View role'));

			expect(mockPush).not.toHaveBeenCalled();
		});
	});
});
