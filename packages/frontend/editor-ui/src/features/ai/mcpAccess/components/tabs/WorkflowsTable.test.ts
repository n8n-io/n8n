import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowsTable from '@/features/ai/mcpAccess/components/tabs/WorkflowsTable.vue';
import { createWorkflow } from '@/features/ai/mcpAccess/mcp.test.utils';

vi.mock('@/app/router', () => ({
	default: {
		resolve: vi.fn(({ name, params }) => ({
			fullPath:
				name === 'NodeViewExisting' ? `/workflows/${params.name}` : `/projects/${params.projectId}`,
		})),
	},
}));

const createComponent = createComponentRenderer(WorkflowsTable);

describe('WorkflowsTable', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Empty state', () => {
		it('should render empty state when workflows array is empty', () => {
			const { getByTestId } = createComponent({
				props: {
					workflows: [],
					loading: false,
				},
			});

			expect(getByTestId('mcp-workflow-table-empty-state')).toBeVisible();
		});

		it('should emit connectWorkflows event when button is clicked', async () => {
			const { getByTestId, emitted } = createComponent({
				props: {
					workflows: [],
					loading: false,
				},
			});

			const button = getByTestId('mcp-workflow-table-empty-state-button');
			await userEvent.click(button);

			expect(emitted('connectWorkflows')).toBeTruthy();
		});
	});

	describe('Loading state', () => {
		it('should render loading skeleton when loading is true', () => {
			const { container, queryByTestId } = createComponent({
				props: {
					workflows: [],
					loading: true,
				},
			});

			expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
			expect(queryByTestId('mcp-workflow-table')).not.toBeInTheDocument();
		});
	});

	describe('Workflow in project root', () => {
		it('should render workflow with project location only (no folder)', () => {
			const workflow = createWorkflow({
				name: 'Workflow In Project Root',
				homeProject: {
					id: 'project1',
					type: 'team',
					name: 'My Project',
					icon: { type: 'icon', value: 'folder' },
					createdAt: '2025-01-01',
					updatedAt: '2025-01-01',
				},
				parentFolder: undefined,
			});

			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(getByTestId('mcp-workflow-name')).toHaveTextContent('Workflow In Project Root');
			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('My Project');
			expect(queryByTestId('workflow-location-folder-name')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-location-ellipsis-separator')).not.toBeInTheDocument();
		});

		it('should render personal project name correctly', () => {
			const workflow = createWorkflow({
				homeProject: {
					id: 'personal-project',
					type: 'personal',
					name: 'User<user@n8n.io>',
					icon: { type: 'icon', value: 'user' },
					createdAt: '2025-01-01',
					updatedAt: '2025-01-01',
				},
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('Personal');
		});
	});

	describe('Workflow in folder', () => {
		it('should render workflow in folder without ellipsis (folder in project root)', () => {
			const workflow = createWorkflow({
				name: 'Workflow In Folder',
				homeProject: {
					id: 'project1',
					type: 'team',
					name: 'My Project',
					icon: { type: 'icon', value: 'folder' },
					createdAt: '2025-01-01',
					updatedAt: '2025-01-01',
				},
				parentFolder: {
					id: 'folder1',
					name: 'Parent Folder',
					parentFolderId: null,
				},
			});

			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('My Project');
			expect(getByTestId('workflow-location-folder-name')).toHaveTextContent('Parent Folder');
			// Separator between project and folder should be visible
			expect(getByTestId('workflow-location-separator')).toBeVisible();
			expect(queryByTestId('workflow-location-grandparent')).not.toBeInTheDocument();
		});

		it('should render workflow in nested folder with ellipsis', () => {
			const workflow = createWorkflow({
				name: 'Workflow In Nested Folder',
				homeProject: {
					id: 'project1',
					type: 'team',
					name: 'My Project',
					icon: { type: 'icon', value: 'folder' },
					createdAt: '2025-01-01',
					updatedAt: '2025-01-01',
				},
				parentFolder: {
					id: 'folder2',
					name: 'Child Folder',
					parentFolderId: 'folder1', // Has a grandparent folder
				},
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(getByTestId('workflow-location-project-name')).toHaveTextContent('My Project');
			expect(getByTestId('workflow-location-folder-name')).toHaveTextContent('Child Folder');
			expect(getByTestId('workflow-location-grandparent')).toBeVisible();
			// Ellipsis separator (between ellipsis and folder)
			expect(getByTestId('workflow-location-ellipsis-separator')).toBeVisible();
		});
	});

	describe('Workflow description', () => {
		it('should render workflow description when present', () => {
			const workflow = createWorkflow({
				description: 'This is a test workflow description',
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(getByTestId('mcp-workflow-description')).toHaveTextContent(
				'This is a test workflow description',
			);
		});

		it('should render warning when workflow has no description', () => {
			const workflow = createWorkflow({
				description: undefined,
			});

			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(getByTestId('mcp-workflow-description-empty')).toBeVisible();
			expect(queryByTestId('mcp-workflow-description')).not.toBeInTheDocument();
		});

		it('should render warning when workflow description is empty string', () => {
			const workflow = createWorkflow({
				description: '',
			});

			const { getByTestId, queryByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(getByTestId('mcp-workflow-description-empty')).toBeVisible();
			expect(queryByTestId('mcp-workflow-description')).not.toBeInTheDocument();
		});
	});

	describe('Actions menu', () => {
		it('should enable "Remove Access" action when user has update permissions', async () => {
			const workflow = createWorkflow({
				scopes: ['workflow:read', 'workflow:update'],
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-workflow-action-toggle');
			const toggleButton = within(actionToggle).getByRole('button');
			await userEvent.click(toggleButton);

			// Check that the action menu item is not disabled
			const menuItems = document.querySelectorAll('[data-test-id="action-removeFromMCP"]');
			expect(menuItems.length).toBe(1);
			expect(menuItems[0]).not.toHaveAttribute('disabled');
		});

		it('should disable "Remove Access" action when user lacks update permissions', async () => {
			const workflow = createWorkflow({
				scopes: ['workflow:read'], // No workflow:update scope
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-workflow-action-toggle');
			const toggleButton = within(actionToggle).getByRole('button');
			await userEvent.click(toggleButton);

			// Check that the action menu item is disabled
			const menuItems = document.querySelectorAll('[data-test-id="action-removeFromMCP"]');
			expect(menuItems.length).toBe(1);
			expect(menuItems[0]).toHaveClass('is-disabled');
		});

		it('should emit removeMcpAccess event when action is clicked', async () => {
			const workflow = createWorkflow({
				scopes: ['workflow:read', 'workflow:update'],
			});

			const { getByTestId, emitted } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-workflow-action-toggle');
			const toggleButton = within(actionToggle).getByRole('button');
			await userEvent.click(toggleButton);

			const menuItem = document.querySelector('[data-test-id="action-removeFromMCP"]');
			expect(menuItem).not.toBeNull();
			await userEvent.click(menuItem!);

			expect(emitted('removeMcpAccess')).toBeTruthy();
			expect(emitted('removeMcpAccess')[0]).toEqual([workflow]);
		});

		it('should enable "Update Description" action when user has update permissions', async () => {
			const workflow = createWorkflow({
				scopes: ['workflow:read', 'workflow:update'],
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-workflow-action-toggle');
			const toggleButton = within(actionToggle).getByRole('button');
			await userEvent.click(toggleButton);

			const menuItems = document.querySelectorAll('[data-test-id="action-updateDescription"]');
			expect(menuItems.length).toBe(1);
			expect(menuItems[0]).not.toHaveAttribute('disabled');
		});

		it('should disable "Update Description" action when user lacks update permissions', async () => {
			const workflow = createWorkflow({
				scopes: ['workflow:read'],
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-workflow-action-toggle');
			const toggleButton = within(actionToggle).getByRole('button');
			await userEvent.click(toggleButton);

			const menuItems = document.querySelectorAll('[data-test-id="action-updateDescription"]');
			expect(menuItems.length).toBe(1);
			expect(menuItems[0]).toHaveClass('is-disabled');
		});

		it('should emit updateDescription event when action is clicked', async () => {
			const workflow = createWorkflow({
				scopes: ['workflow:read', 'workflow:update'],
			});

			const { getByTestId, emitted } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-workflow-action-toggle');
			const toggleButton = within(actionToggle).getByRole('button');
			await userEvent.click(toggleButton);

			const menuItem = document.querySelector('[data-test-id="action-updateDescription"]');
			expect(menuItem).not.toBeNull();
			await userEvent.click(menuItem!);

			expect(emitted('updateDescription')).toBeTruthy();
			expect(emitted('updateDescription')[0]).toEqual([workflow]);
		});
	});

	describe('Workflow links', () => {
		it('should render workflow name as link to workflow editor', () => {
			const workflow = createWorkflow({
				id: 'workflow-123',
				name: 'My Workflow',
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const workflowLink = getByTestId('mcp-workflow-name-link');
			expect(workflowLink).toHaveAttribute('href', '/workflows/workflow-123');
		});

		it('should render project name as link to project workflows', () => {
			const workflow = createWorkflow({
				homeProject: {
					id: 'project-456',
					type: 'team',
					name: 'Team Project',
					icon: { type: 'icon', value: 'folder' },
					createdAt: '2025-01-01',
					updatedAt: '2025-01-01',
				},
			});

			const { getByTestId } = createComponent({
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const projectLink = getByTestId('workflow-location-project-link');
			expect(projectLink).toHaveAttribute('href', '/projects/project-456');
		});
	});

	describe('Multiple workflows', () => {
		it('should render multiple workflows in the table', () => {
			const workflows = [
				createWorkflow({
					id: 'workflow-1',
					name: 'First Workflow',
					description: 'First description',
					homeProject: {
						id: 'project1',
						type: 'team',
						name: 'Project A',
						icon: { type: 'icon', value: 'folder' },
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
				}),
				createWorkflow({
					id: 'workflow-2',
					name: 'Second Workflow',
					description: undefined,
					homeProject: {
						id: 'project2',
						type: 'personal',
						name: 'User<user@n8n.io>',
						icon: { type: 'icon', value: 'user' },
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
					parentFolder: {
						id: 'folder1',
						name: 'My Folder',
						parentFolderId: null,
					},
				}),
				createWorkflow({
					id: 'workflow-3',
					name: 'Third Workflow',
					description: 'Third description',
					homeProject: {
						id: 'project3',
						type: 'team',
						name: 'Project B',
						icon: { type: 'icon', value: 'folder' },
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
					parentFolder: {
						id: 'folder2',
						name: 'Nested Folder',
						parentFolderId: 'folder1',
					},
				}),
			];

			const { getAllByTestId } = createComponent({
				props: {
					workflows,
					loading: false,
				},
			});

			// Verify all workflows are rendered
			const workflowCells = getAllByTestId('mcp-workflow-cell');
			expect(workflowCells).toHaveLength(3);

			// Verify workflow names
			const workflowNames = getAllByTestId('mcp-workflow-name');
			expect(workflowNames).toHaveLength(3);
			expect(workflowNames[0]).toHaveTextContent('First Workflow');
			expect(workflowNames[1]).toHaveTextContent('Second Workflow');
			expect(workflowNames[2]).toHaveTextContent('Third Workflow');

			// Verify project names (second one should show "Personal")
			const projectNames = getAllByTestId('workflow-location-project-name');
			expect(projectNames).toHaveLength(3);
			expect(projectNames[0]).toHaveTextContent('Project A');
			expect(projectNames[1]).toHaveTextContent('Personal');
			expect(projectNames[2]).toHaveTextContent('Project B');

			// Verify descriptions (second workflow has no description, so warning should show)
			const descriptions = getAllByTestId('mcp-workflow-description');
			expect(descriptions).toHaveLength(2);
			const emptyDescriptions = getAllByTestId('mcp-workflow-description-empty');
			expect(emptyDescriptions).toHaveLength(1);

			// Verify folder names (only workflows 2 and 3 have folders)
			const folderNames = getAllByTestId('workflow-location-folder-name');
			expect(folderNames).toHaveLength(2);
			expect(folderNames[0]).toHaveTextContent('My Folder');
			expect(folderNames[1]).toHaveTextContent('Nested Folder');

			// Verify ellipsis for nested folder (only workflow 3)
			const grandparentFolders = getAllByTestId('workflow-location-grandparent');
			expect(grandparentFolders).toHaveLength(1);
		});
	});
});
