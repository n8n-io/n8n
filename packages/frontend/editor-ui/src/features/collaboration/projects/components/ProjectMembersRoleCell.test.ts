import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import type { AllRolesMap, ProjectRole } from '@n8n/permissions';
import ProjectMembersRoleCell from './ProjectMembersRoleCell.vue';
import type { ProjectMemberData } from '../projects.types';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
	};
});

const mockMemberData: ProjectMemberData = {
	id: '123',
	firstName: 'John',
	lastName: 'Doe',
	email: 'john@example.com',
	role: 'project:editor',
};

const mockPersonalOwnerData: ProjectMemberData = {
	id: '456',
	firstName: 'Jane',
	lastName: 'Smith',
	email: 'jane@example.com',
	role: 'project:personalOwner',
};

const mockRoles = [
	{
		slug: 'project:admin',
		displayName: 'Admin',
		description: 'Can manage project settings and members',
		systemRole: true,
		licensed: true,
		roleType: 'project',
		scopes: [],
	},
	{
		slug: 'project:editor',
		displayName: 'Editor',
		description: 'Can edit workflows and credentials',
		systemRole: true,
		licensed: true,
		roleType: 'project',
		scopes: [],
	},
	{
		slug: 'project:viewer',
		displayName: 'Viewer',
		description: 'Can view workflows and executions',
		systemRole: true,
		licensed: true,
		roleType: 'project',
		scopes: [],
	},
	{
		slug: 'project:personalOwner',
		displayName: 'Personal Owner',
		description: null,
		systemRole: true,
		licensed: true,
		roleType: 'project',
		scopes: [],
	},
] as AllRolesMap['project'];

const mockRolesWithCustom = [
	...mockRoles,
	{
		slug: 'project:customDeveloper',
		displayName: 'Developer',
		description: 'A custom developer role',
		systemRole: false,
		licensed: true,
		roleType: 'project',
		scopes: [],
	},
] as AllRolesMap['project'];

const renderComponent = createComponentRenderer(ProjectMembersRoleCell, {
	props: {
		data: mockMemberData,
		roles: mockRoles,
	},
});

describe('ProjectMembersRoleCell', () => {
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let usersStore: MockedStore<typeof useUsersStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);

		vi.spyOn(settingsStore, 'isCustomRolesFeatureEnabled', 'get').mockReturnValue(true);
		vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);
		vi.spyOn(usersStore, 'isAdmin', 'get').mockReturnValue(false);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render dropdown for editable roles', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('project-member-role-dropdown')).toBeInTheDocument();
		});

		it('should render static text for non-editable roles (personalOwner)', () => {
			const { queryByTestId, getByText } = renderComponent({
				props: {
					data: mockPersonalOwnerData,
					roles: mockRoles,
				},
			});

			expect(queryByTestId('project-member-role-dropdown')).not.toBeInTheDocument();
			expect(getByText('Personal Owner')).toBeInTheDocument();
		});

		it('should display the correct role label', () => {
			const { getByText } = renderComponent();

			expect(getByText('Editor')).toBeInTheDocument();
		});
	});

	describe('Props Handling', () => {
		it('should handle data prop correctly', () => {
			const customData = {
				id: '789',
				firstName: 'Alice',
				lastName: 'Johnson',
				email: 'alice@example.com',
				role: 'project:admin' as ProjectRole,
			};

			const { getByText } = renderComponent({
				props: {
					data: customData,
					roles: mockRoles,
				},
			});

			expect(getByText('Admin')).toBeInTheDocument();
		});

		it('should handle roles prop correctly', () => {
			const customRoles = [
				...mockRoles,
				{
					slug: 'project:wooooooooo',
					displayName: 'Super Admin',
					description: 'Ultimate power',
					systemRole: false,
					licensed: true,
					roleType: 'project',
					scopes: [],
				},
			] as AllRolesMap['project'];

			const { getByText } = renderComponent({
				props: {
					data: { ...mockMemberData, role: 'project:wooooooooo' as ProjectRole },
					roles: customRoles,
				},
			});

			expect(getByText('Super Admin')).toBeInTheDocument();
		});
	});

	describe('Role Restrictions', () => {
		it('should compute isEditable as false for personalOwner role', () => {
			const { queryByTestId, getByText } = renderComponent({
				props: {
					data: mockPersonalOwnerData,
					roles: mockRoles,
				},
			});

			// Should render static text instead of dropdown
			expect(queryByTestId('project-member-role-dropdown')).not.toBeInTheDocument();
			expect(getByText('Personal Owner')).toBeInTheDocument();
		});

		it('should compute isEditable as true for non-personalOwner roles', () => {
			const roles: ProjectRole[] = ['project:admin', 'project:editor', 'project:viewer'];

			roles.forEach((role) => {
				const { getByTestId, unmount } = renderComponent({
					props: {
						data: { ...mockMemberData, role },
						roles: mockRoles,
					},
				});

				expect(getByTestId('project-member-role-dropdown')).toBeInTheDocument();
				unmount();
			});
		});
	});

	describe('Accessibility', () => {
		it('should have proper test-id attribute', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('project-member-role-dropdown')).toBeInTheDocument();
		});
	});

	describe('Custom roles section visibility', () => {
		it('should not show "Custom roles" section label when license is enabled and there are no custom roles', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderComponent();

			// isCustomRolesFeatureEnabled is already true from beforeEach
			await user.click(getByTestId('project-member-role-dropdown'));

			expect(screen.getByText('System roles')).toBeInTheDocument();
			expect(screen.queryByText('Custom roles')).not.toBeInTheDocument();
		});

		it('should show "Custom roles" section label when license is disabled and there are no custom roles', async () => {
			vi.spyOn(settingsStore, 'isCustomRolesFeatureEnabled', 'get').mockReturnValue(false);

			const user = userEvent.setup();
			const { getByTestId } = renderComponent();

			await user.click(getByTestId('project-member-role-dropdown'));

			expect(screen.getByText('System roles')).toBeInTheDocument();
			expect(screen.getByText('Custom roles')).toBeInTheDocument();
		});

		it('should show "Custom roles" section label when custom roles exist regardless of license', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderComponent({
				props: {
					data: mockMemberData,
					roles: mockRolesWithCustom,
				},
			});

			await user.click(getByTestId('project-member-role-dropdown'));

			expect(screen.getByText('System roles')).toBeInTheDocument();
			expect(screen.getByText('Custom roles')).toBeInTheDocument();
		});
	});
});
