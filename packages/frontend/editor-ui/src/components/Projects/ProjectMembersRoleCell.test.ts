import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { ProjectRole } from '@n8n/permissions';
import type { ActionDropdownItem } from '@n8n/design-system';
import ProjectMembersRoleCell from '@/components/Projects/ProjectMembersRoleCell.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { ProjectMemberData } from '@/types/projects.types';

// Mock N8nActionDropdown and other design system components
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionDropdown: {
			name: 'N8nActionDropdown',
			props: {
				items: { type: Array, required: true },
				placement: { type: String },
			},
			emits: ['select'],
			template: `
				<div data-test-id="action-dropdown">
					<div data-test-id="activator">
						<slot name="activator" />
					</div>
					<ul data-test-id="dropdown-menu">
						<li v-for="item in items" :key="item.id">
							<button 
								:data-test-id="'action-' + item.id" 
								:disabled="item.disabled"
								@click="$emit('select', item.id)"
							>
								<slot name="menuItem" v-bind="item" />
							</button>
						</li>
					</ul>
				</div>
			`,
		},
		N8nText: {
			name: 'N8nText',
			props: {
				color: { type: String },
				size: { type: String },
			},
			template: '<span><slot /></span>',
		},
		N8nIcon: {
			name: 'N8nIcon',
			props: {
				icon: { type: String, required: true },
				size: { type: String },
				color: { type: String },
			},
			template: '<i :data-icon="icon"></i>',
		},
	};
});

// Mock element-plus components
vi.mock('element-plus', async (importOriginal) => {
	const actual = await importOriginal<object>();
	return {
		...actual,
		ElRadio: {
			name: 'ElRadio',
			props: {
				modelValue: {},
				label: {},
				disabled: { type: Boolean },
			},
			emits: ['update:model-value'],
			template: `
				<label>
					<input 
						type="radio" 
						:value="label" 
						:checked="modelValue === label"
						:disabled="disabled"
						@change="$emit('update:model-value', label)"
					/>
					<slot />
				</label>
			`,
		},
		ElTooltip: {
			name: 'ElTooltip',
			template: '<div><slot /></div>',
		},
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

const mockRoles: Record<ProjectRole, { label: string; desc: string }> = {
	'project:admin': {
		label: 'Admin',
		desc: 'Can manage project settings and members',
	},
	'project:editor': {
		label: 'Editor',
		desc: 'Can edit workflows and credentials',
	},
	'project:viewer': {
		label: 'Viewer',
		desc: 'Can view workflows and executions',
	},
	'project:personalOwner': {
		label: 'Personal Owner',
		desc: '',
	},
};

const mockActions: Array<ActionDropdownItem<string>> = [
	{ id: 'project:admin', label: 'Admin' },
	{ id: 'project:editor', label: 'Editor' },
	{ id: 'project:viewer', label: 'Viewer', disabled: true },
	{ id: 'remove', label: 'Remove User', divided: true },
];

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('ProjectMembersRoleCell', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(ProjectMembersRoleCell, {
			props: {
				data: mockMemberData,
				roles: mockRoles,
				actions: mockActions,
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render dropdown for editable roles', () => {
			renderComponent();

			expect(screen.getByTestId('project-member-role-dropdown')).toBeInTheDocument();
			expect(screen.getByTestId('activator')).toBeInTheDocument();
			expect(screen.getAllByText('Editor')).toHaveLength(2); // One in activator, one in dropdown
		});

		it('should render static text for non-editable roles (personalOwner)', () => {
			renderComponent({
				props: {
					data: mockPersonalOwnerData,
				},
			});

			expect(screen.queryByTestId('project-member-role-dropdown')).not.toBeInTheDocument();
			expect(screen.getByText('Personal Owner')).toBeInTheDocument();
		});

		it('should display the correct role label', () => {
			renderComponent();

			expect(screen.getAllByText('Editor')).toHaveLength(2); // Shown in activator and dropdown option
		});

		it('should render chevron down icon in activator button', () => {
			renderComponent();

			const activatorButton = screen.getByTestId('activator').querySelector('button');
			expect(activatorButton).toBeInTheDocument();
			const icon = document.querySelector('i[data-icon="chevron-down"]');
			expect(icon).toBeInTheDocument();
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

			renderComponent({
				props: {
					data: customData,
				},
			});

			expect(screen.getAllByText('Admin')).toHaveLength(2); // Shown in activator and dropdown option
		});

		it('should handle roles prop correctly', () => {
			const customRoles: Record<ProjectRole, { label: string; desc: string }> = {
				...mockRoles,
				'project:admin': { label: 'Super Admin', desc: 'Ultimate power' },
			};

			renderComponent({
				props: {
					data: { ...mockMemberData, role: 'project:admin' },
					roles: customRoles,
				},
			});

			expect(screen.getAllByText('Super Admin')).toHaveLength(1); // Only shown in activator, not in dropdown (different role)
		});

		it('should pass actions to dropdown component', () => {
			renderComponent();

			// Check that all action items are rendered
			expect(screen.getByTestId('action-project:admin')).toBeInTheDocument();
			expect(screen.getByTestId('action-project:editor')).toBeInTheDocument();
			expect(screen.getByTestId('action-project:viewer')).toBeInTheDocument();
			expect(screen.getByTestId('action-remove')).toBeInTheDocument();
		});
	});

	describe('Event Emissions', () => {
		it('should emit update:role when role is selected', async () => {
			const { emitted } = renderComponent();
			const user = userEvent.setup();

			await user.click(screen.getByTestId('action-project:admin'));

			expect(emitted()).toHaveProperty('update:role');
			expect(emitted()['update:role'][0]).toEqual([
				{
					role: 'project:admin',
					userId: '123',
				},
			]);
		});

		it('should emit update:role when remove action is selected', async () => {
			const { emitted } = renderComponent();
			const user = userEvent.setup();

			await user.click(screen.getByTestId('action-remove'));

			expect(emitted()).toHaveProperty('update:role');
			expect(emitted()['update:role'][0]).toEqual([
				{
					role: 'remove',
					userId: '123',
				},
			]);
		});

		it('should emit with correct userId from data prop', async () => {
			const customData = { ...mockMemberData, id: 'custom-user-id' };
			const { emitted } = renderComponent({
				props: {
					data: customData,
				},
			});
			const user = userEvent.setup();

			await user.click(screen.getByTestId('action-project:admin'));

			expect(emitted()['update:role'][0]).toEqual([
				{
					role: 'project:admin',
					userId: 'custom-user-id',
				},
			]);
		});
	});

	describe('Role Restrictions', () => {
		it('should compute isEditable as false for personalOwner role', () => {
			renderComponent({
				props: {
					data: mockPersonalOwnerData,
				},
			});

			// Should render static text instead of dropdown
			expect(screen.queryByTestId('project-member-role-dropdown')).not.toBeInTheDocument();
			expect(screen.getByText('Personal Owner')).toBeInTheDocument();
		});

		it('should compute isEditable as true for non-personalOwner roles', () => {
			const roles: ProjectRole[] = ['project:admin', 'project:editor', 'project:viewer'];

			roles.forEach((role) => {
				const { unmount } = renderComponent({
					props: {
						data: { ...mockMemberData, role },
					},
				});

				expect(screen.getByTestId('project-member-role-dropdown')).toBeInTheDocument();
				unmount();
			});
		});
	});

	describe('Role Selection UI', () => {
		it('should render radio buttons for role selection', () => {
			renderComponent();

			// Radio buttons should be present for role actions (not remove)
			const radioInputs = screen.getAllByRole('radio');
			expect(radioInputs).toHaveLength(3); // admin, editor, viewer (remove is not a radio)
		});

		it('should render remove option without radio button', () => {
			renderComponent();

			expect(screen.getByTestId('action-remove')).toBeInTheDocument();
			expect(screen.getByText('Remove User')).toBeInTheDocument();
		});

		it('should handle disabled actions correctly', () => {
			renderComponent();

			const viewerButton = screen.getByTestId('action-project:viewer');
			expect(viewerButton).toBeDisabled();
		});

		it('should show role descriptions in radio labels', () => {
			renderComponent();

			expect(screen.getByText('Can manage project settings and members')).toBeInTheDocument();
			expect(screen.getByText('Can edit workflows and credentials')).toBeInTheDocument();
		});

		it('should update selectedRole when radio button is changed', async () => {
			renderComponent();
			const user = userEvent.setup();

			const adminRadio = screen.getByRole('radio', { name: /Admin/i });
			await user.click(adminRadio);

			expect(adminRadio).toBeChecked();
		});
	});

	describe('Computed Properties', () => {
		it('should compute roleLabel correctly for known roles', () => {
			renderComponent();

			expect(screen.getAllByText('Editor')).toHaveLength(2); // Shown in activator and dropdown option
		});

		it('should fallback to role string for unknown roles', () => {
			const customRoles = { ...mockRoles };
			delete (customRoles as Record<string, unknown>)['project:editor'];

			renderComponent({
				props: {
					roles: customRoles,
				},
			});

			expect(screen.getAllByText('project:editor')).toHaveLength(1); // Only shown in activator when role not found
		});
	});

	describe('Accessibility', () => {
		it('should have proper test-id attribute', () => {
			renderComponent();

			expect(screen.getByTestId('project-member-role-dropdown')).toBeInTheDocument();
		});

		it('should render activator button as a button element', () => {
			renderComponent();

			const activatorButton = screen.getByTestId('activator').querySelector('button');
			expect(activatorButton).toBeInTheDocument();
			expect(activatorButton).toHaveAttribute('type', 'button');
		});

		it('should provide proper radio button labels', () => {
			renderComponent();

			expect(screen.getByLabelText(/Admin/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Editor/i)).toBeInTheDocument();
		});
	});
});
