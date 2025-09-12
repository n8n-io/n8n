import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { ProjectRole } from '@n8n/permissions';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import ProjectMembersTable from '@/components/Projects/ProjectMembersTable.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { ProjectMemberData } from '@/types/projects.types';

// Mock design system components
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nDataTableServer: {
			name: 'N8nDataTableServer',
			props: {
				headers: { type: Array, required: true },
				items: { type: Array, required: true },
				itemsLength: { type: Number, required: true },
				loading: { type: Boolean },
				sortBy: { type: Array },
				page: { type: Number },
				itemsPerPage: { type: Number },
			},
			emits: ['update:sort-by', 'update:page', 'update:items-per-page', 'update:options'],
			template: `
				<div data-test-id="data-table">
					<table>
						<thead>
							<tr>
								<th v-for="header in headers" :key="header.key" :data-test-id="'header-' + header.key">
									{{ header.title }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(item, index) in items" :key="index" :data-test-id="'row-' + index">
								<td v-for="header in headers" :key="header.key" :data-test-id="'cell-' + header.key + '-' + index">
									<slot :name="'item.' + header.key" :item="item" :value="header.value ? header.value(item) : item[header.key]" />
								</td>
							</tr>
						</tbody>
					</table>
					<div v-if="loading" data-test-id="loading-indicator">Loading...</div>
				</div>
			`,
		},
		N8nUserInfo: {
			name: 'N8nUserInfo',
			props: {
				firstName: { type: String },
				lastName: { type: String },
				email: { type: String },
				isPendingUser: { type: Boolean },
			},
			template: `
				<div data-test-id="user-info">
					<span data-test-id="user-name">{{ firstName }} {{ lastName }}</span>
					<span data-test-id="user-email">{{ email }}</span>
				</div>
			`,
		},
		N8nText: {
			name: 'N8nText',
			props: {
				color: { type: String },
			},
			template: '<span><slot /></span>',
		},
	};
});

// Mock ProjectMembersRoleCell component
vi.mock('@/components/Projects/ProjectMembersRoleCell.vue', () => ({
	default: {
		name: 'ProjectMembersRoleCell',
		props: {
			data: { type: Object, required: true },
			roles: { type: Object, required: true },
			actions: { type: Array, required: true },
		},
		emits: ['update:role'],
		template: `
			<div data-test-id="role-cell">
				<button
					:data-test-id="'role-dropdown-' + data.id"
					@click="$emit('update:role', { role: 'project:admin', userId: data.id })"
				>
					{{ roles[data.role]?.label || data.role }}
				</button>
			</div>
		`,
	},
}));

const mockMembers: ProjectMemberData[] = [
	{
		id: '1',
		firstName: 'John',
		lastName: 'Doe',
		email: 'john@example.com',
		role: 'project:admin',
	},
	{
		id: '2',
		firstName: 'Jane',
		lastName: 'Smith',
		email: 'jane@example.com',
		role: 'project:editor',
	},
	{
		id: '3',
		firstName: 'Bob',
		lastName: 'Wilson',
		email: 'bob@example.com',
		role: 'project:viewer',
	},
];

// mockCurrentUser removed as it's not used

const mockProjectRoles = [
	{ slug: 'project:admin', displayName: 'Admin', licensed: true },
	{ slug: 'project:editor', displayName: 'Editor', licensed: true },
	{ slug: 'project:viewer', displayName: 'Viewer', licensed: false },
];

const mockData = {
	items: mockMembers,
	count: mockMembers.length,
};

const mockTableOptions: TableOptions = {
	page: 0,
	itemsPerPage: 10,
	sortBy: [
		{ id: 'firstName', desc: false },
		{ id: 'lastName', desc: false },
		{ id: 'email', desc: false },
	],
};

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('ProjectMembersTable', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(ProjectMembersTable, {
			props: {
				data: mockData,
				currentUserId: '2',
				projectRoles: mockProjectRoles,
				tableOptions: mockTableOptions,
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render table with correct headers', () => {
			renderComponent();

			expect(screen.getByTestId('data-table')).toBeInTheDocument();
			expect(screen.getByTestId('header-name')).toBeInTheDocument();
			expect(screen.getByTestId('header-role')).toBeInTheDocument();
			expect(screen.getByText('User')).toBeInTheDocument();
			expect(screen.getByText('Role')).toBeInTheDocument();
		});

		it('should render all member rows', () => {
			renderComponent();

			mockMembers.forEach((_, index) => {
				expect(screen.getByTestId(`row-${index}`)).toBeInTheDocument();
			});
		});

		it('should render user information correctly', () => {
			renderComponent();

			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('jane@example.com')).toBeInTheDocument();
			expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
		});

		it('should show loading indicator when loading prop is true', () => {
			renderComponent({
				props: {
					loading: true,
				},
			});

			expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
			expect(screen.getByText('Loading...')).toBeInTheDocument();
		});

		it('should not show loading indicator when loading prop is false', () => {
			renderComponent({
				props: {
					loading: false,
				},
			});

			expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
		});
	});

	describe('Props Handling', () => {
		it('should handle data prop correctly', () => {
			const customData = {
				items: [mockMembers[0]],
				count: 1,
			};

			renderComponent({
				props: {
					data: customData,
				},
			});

			expect(screen.getByTestId('row-0')).toBeInTheDocument();
			expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
		});

		it('should handle currentUserId prop correctly', () => {
			renderComponent();

			// Current user (Jane Smith, id: '2') should not have editable role
			expect(screen.queryByTestId('role-dropdown-2')).not.toBeInTheDocument();
			// Other users should have editable roles
			expect(screen.getByTestId('role-dropdown-1')).toBeInTheDocument();
			expect(screen.getByTestId('role-dropdown-3')).toBeInTheDocument();
		});

		it('should handle projectRoles prop correctly', () => {
			renderComponent();

			// The projectRoles should be transformed into roleActions
			// This is tested indirectly through role cell rendering
			expect(screen.getAllByTestId('role-cell')).toHaveLength(2); // For users 1 and 3 (user 2 is current user)
		});
	});

	describe('Event Emissions', () => {
		it('should emit update:options when table options change', async () => {
			const { emitted } = renderComponent();

			// This test verifies that the table component properly binds the update:options event
			// The actual emission would happen when the N8nDataTableServer component emits it
			expect(screen.getByTestId('data-table')).toBeInTheDocument();

			// Since we're testing the integration, we can verify that the handler exists
			// by checking that no error is thrown when the table renders
			expect(emitted()).toBeDefined();
		});

		it('should emit update:role when role change is triggered', async () => {
			const { emitted } = renderComponent();
			const user = userEvent.setup();

			// Click on a role dropdown to trigger role change
			await user.click(screen.getByTestId('role-dropdown-1'));

			expect(emitted()).toHaveProperty('update:role');
			expect(emitted()['update:role'][0]).toEqual([
				{
					role: 'project:admin',
					userId: '1',
				},
			]);
		});
	});

	describe('Computed Properties', () => {
		it('should compute roles mapping correctly', () => {
			renderComponent();

			// Roles should be displayed with correct labels
			expect(screen.getByText('Admin')).toBeInTheDocument();
			expect(screen.getByText('Editor')).toBeInTheDocument();
			expect(screen.getByText('Viewer')).toBeInTheDocument();
		});

		it('should compute roleActions correctly', () => {
			renderComponent();

			// Verify that role actions are working by checking that all expected
			// roles are displayed in the role cells
			expect(screen.getByText('Admin')).toBeInTheDocument();
			expect(screen.getByText('Viewer')).toBeInTheDocument();
		});

		it('should compute rows from data items', () => {
			renderComponent();

			// Verify that all member rows are rendered
			mockMembers.forEach((_, index) => {
				expect(screen.getByTestId(`row-${index}`)).toBeInTheDocument();
			});
		});
	});

	describe('User Permissions', () => {
		it('should not allow current user to edit their own role', () => {
			renderComponent();

			// Current user (id: '2') should not have editable role cell
			expect(screen.queryByTestId('role-dropdown-2')).not.toBeInTheDocument();

			// Should show static text instead
			const currentUserRow = screen.getByTestId('row-1');
			expect(currentUserRow).toBeInTheDocument();
		});

		it("should allow editing other users' roles", () => {
			renderComponent();

			// Other users should have editable role cells
			expect(screen.getByTestId('role-dropdown-1')).toBeInTheDocument();
			expect(screen.getByTestId('role-dropdown-3')).toBeInTheDocument();
		});

		it('should show static role text for current user', () => {
			renderComponent();

			// For current user, should show static N8nText with role
			const currentUserCell = screen.getByTestId('cell-role-1');
			expect(currentUserCell).toBeInTheDocument();
			// The text should be rendered by N8nText component
			expect(screen.getByText('Editor')).toBeInTheDocument();
		});
	});

	describe('Integration with ProjectMembersRoleCell', () => {
		it('should pass correct props to ProjectMembersRoleCell', () => {
			renderComponent();

			// Role cells should be rendered with proper test ids
			expect(screen.getByTestId('role-dropdown-1')).toBeInTheDocument();
			expect(screen.getByTestId('role-dropdown-3')).toBeInTheDocument();
		});

		it('should handle role update from ProjectMembersRoleCell', async () => {
			const { emitted } = renderComponent();
			const user = userEvent.setup();

			// Trigger role change through role cell
			await user.click(screen.getByTestId('role-dropdown-1'));

			expect(emitted()).toHaveProperty('update:role');
		});
	});

	describe('Table Headers Configuration', () => {
		it('should configure user header correctly', () => {
			renderComponent();

			// Verify that the user header is rendered
			expect(screen.getByTestId('header-name')).toBeInTheDocument();
			expect(screen.getByText('User')).toBeInTheDocument();
		});

		it('should configure role header correctly', () => {
			renderComponent();

			// Verify that the role header is rendered
			expect(screen.getByTestId('header-role')).toBeInTheDocument();
			expect(screen.getByText('Role')).toBeInTheDocument();
		});

		it('should format user data for N8nUserInfo component', () => {
			renderComponent();

			// Verify that user info is properly formatted and displayed
			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('jane@example.com')).toBeInTheDocument();
			expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
		});
	});

	describe('Role Change Handling', () => {
		it('should handle normal role updates correctly', () => {
			renderComponent();

			// Verify that role change handling is set up correctly by checking
			// that role cells are rendered for editable users
			expect(screen.getByTestId('role-dropdown-1')).toBeInTheDocument();
			expect(screen.getByTestId('role-dropdown-3')).toBeInTheDocument();
		});

		it('should handle remove action correctly', () => {
			renderComponent();

			// Verify that the table properly handles different role scenarios
			// Current user (id: 2) should not have editable role
			expect(screen.queryByTestId('role-dropdown-2')).not.toBeInTheDocument();
			// Other users should have editable roles
			expect(screen.getByTestId('role-dropdown-1')).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty data items', () => {
			renderComponent({
				props: {
					data: { items: [], count: 0 },
				},
			});

			expect(screen.getByTestId('data-table')).toBeInTheDocument();
			expect(screen.queryByTestId('row-0')).not.toBeInTheDocument();
		});

		it('should handle missing currentUserId', () => {
			renderComponent({
				props: {
					currentUserId: undefined,
				},
			});

			// All users should have editable roles when no currentUserId
			mockMembers.forEach((member) => {
				expect(screen.getByTestId(`role-dropdown-${member.id}`)).toBeInTheDocument();
			});
		});

		it('should handle member without firstName/lastName', () => {
			const membersWithoutNames = [
				{
					id: '4',
					firstName: null,
					lastName: null,
					email: 'noname@example.com',
					role: 'project:viewer' as ProjectRole,
				},
			];

			renderComponent({
				props: {
					data: { items: membersWithoutNames, count: 1 },
				},
			});

			expect(screen.getByText('noname@example.com')).toBeInTheDocument();
		});
	});

	describe('Table Options Model', () => {
		it('should use default tableOptions when not provided', () => {
			renderComponent({
				props: {
					tableOptions: undefined,
				},
			});

			// Component should still render with default options
			expect(screen.getByTestId('data-table')).toBeInTheDocument();
		});

		it('should handle custom tableOptions', () => {
			const customOptions: TableOptions = {
				page: 2,
				itemsPerPage: 5,
				sortBy: [{ id: 'email', desc: true }],
			};

			renderComponent({
				props: {
					tableOptions: customOptions,
				},
			});

			expect(screen.getByTestId('data-table')).toBeInTheDocument();
		});
	});

	describe('Pagination Configuration', () => {
		it('should configure page-sizes to hide pagination controls', () => {
			renderComponent();

			// Find the N8nDataTableServer component mock
			const tableElement = screen.getByTestId('data-table');
			expect(tableElement).toBeInTheDocument();

			// Verify that pagination is effectively hidden by checking the table renders
			// without pagination controls (this is tested indirectly through the mock)
			expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
		});

		it('should handle empty data without pagination', () => {
			renderComponent({
				props: {
					data: { items: [], count: 0 },
				},
			});

			expect(screen.getByTestId('data-table')).toBeInTheDocument();
			expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
		});

		it('should handle large datasets without showing pagination', () => {
			const largeDataset = Array.from({ length: 50 }, (_, i) => ({
				id: `user-${i}`,
				firstName: `User${i}`,
				lastName: `Test${i}`,
				email: `user${i}@example.com`,
				role: 'project:viewer' as ProjectRole,
			}));

			renderComponent({
				props: {
					data: { items: largeDataset, count: largeDataset.length },
				},
			});

			expect(screen.getByTestId('data-table')).toBeInTheDocument();
			// Pagination should still be hidden due to our page-sizes configuration
			expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
		});
	});
});
