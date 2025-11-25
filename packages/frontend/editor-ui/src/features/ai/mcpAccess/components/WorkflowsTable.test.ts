import { createComponentRenderer } from '@/__tests__/render';
import WorkflowsTable from './WorkflowsTable.vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import type { WorkflowListItem } from '@/Interface';
import router from '@/app/router';
import { VIEWS } from '@/app/constants';

const renderComponent = createComponentRenderer(WorkflowsTable);

let pinia: ReturnType<typeof createPinia>;

// Mock router
vi.mock('@/app/router', () => ({
	default: {
		resolve: vi.fn((route) => ({
			fullPath: `/mock-path/${route.params?.name || route.params?.projectId}`,
		})),
	},
}));

const mockWorkflow = (id: string, overrides?: Partial<WorkflowListItem>): WorkflowListItem => ({
	id,
	name: `Workflow ${id}`,
	active: true,
	activeVersionId: 'v1',
	isArchived: false,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-02T00:00:00.000Z',
	versionId: 'v1',
	resource: 'workflow',
	homeProject: {
		id: 'project-1',
		name: 'Test Project',
		type: 'team',
		icon: { type: 'icon', value: 'layers' },
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	},
	parentFolder: {
		id: 'folder-1',
		name: 'Test Folder',
		parentFolderId: null,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	},
	...overrides,
});

describe('WorkflowsTable', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		vi.clearAllMocks();
	});

	describe('Component rendering', () => {
		it('should render loading state correctly', () => {
			const { container, getByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [],
					loading: true,
				},
			});

			const loadingElements = container.querySelectorAll('.n8n-loading');
			expect(loadingElements.length).toBeGreaterThan(0);

			expect(() => getByTestId('mcp-workflow-table')).toThrow();
			expect(() => getByTestId('empty-workflow-list-box')).toThrow();
		});

		it('should render empty state when no workflows exist', () => {
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [],
					loading: false,
				},
			});

			expect(getByTestId('empty-workflow-list-box')).toBeInTheDocument();
		});

		it('should render workflows table with correct data', () => {
			const workflows = [mockWorkflow('1'), mockWorkflow('2', { name: 'Second Workflow' })];

			const { getByTestId, getByText } = renderComponent({
				pinia,
				props: {
					workflows,
					loading: false,
				},
			});

			const table = getByTestId('mcp-workflow-table');
			expect(table).toBeInTheDocument();

			expect(getByText(`Available Workflows (${workflows.length})`)).toBeInTheDocument();

			workflows.forEach((workflow) => {
				expect(getByText(workflow.name)).toBeInTheDocument();
			});
		});

		it('should render refresh button', () => {
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [mockWorkflow('1')],
					loading: false,
				},
			});

			const refreshButton = getByTestId('mcp-workflows-refresh-button');
			expect(refreshButton).toBeInTheDocument();
		});
	});

	describe('Table data display', () => {
		it('should display workflow and folder names as links', () => {
			const workflow = mockWorkflow('1');
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const nameLink = getByTestId('mcp-workflow-name-link');
			expect(nameLink).toHaveTextContent(workflow.name);
			expect(nameLink).toHaveAttribute('href', `/mock-path/${workflow.id}`);

			const folderElement = getByTestId('mcp-workflow-folder-link');
			expect(folderElement).toHaveTextContent(workflow.parentFolder?.name ?? '');
			expect(folderElement).toHaveAttribute(
				'href',
				`/projects/${workflow.homeProject?.id}/folders/${workflow.parentFolder?.id}/workflows`,
			);
		});

		it('should render only workflow link if no parent folder', () => {
			const workflow = mockWorkflow('1', {
				parentFolder: undefined,
			});

			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			// Should render workflow link
			const nameLink = getByTestId('mcp-workflow-name-link');
			expect(nameLink).toBeInTheDocument();
			expect(nameLink).toHaveTextContent(workflow.name);

			// Should not render folder elements, separators or ellipsis
			expect(queryByTestId('mcp-workflow-folder-link')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-workflow-folder-name')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-workflow-folder-separator')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-workflow-ellipsis-separator')).not.toBeInTheDocument();
			expect(queryByTestId('mcp-workflow-grandparent-folder')).not.toBeInTheDocument();
		});

		it('should render ellipsis if parent folder has parent', () => {
			const workflow = mockWorkflow('1', {
				parentFolder: {
					id: 'folder-1',
					name: 'Child Folder',
					parentFolderId: 'parent-folder-1', // This indicates it has a parent
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
			});

			const { getByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			// Should render ellipsis for grandparent
			const grandparentElement = getByTestId('mcp-workflow-grandparent-folder');
			expect(grandparentElement).toBeInTheDocument();

			const ellipsis = grandparentElement.querySelector('.ellipsis');
			expect(ellipsis).toBeInTheDocument();
			expect(ellipsis).toHaveTextContent('...');

			// Check for separator after ellipsis
			const ellipsisSeparator = getByTestId('mcp-workflow-ellipsis-separator');
			expect(ellipsisSeparator).toBeInTheDocument();
			expect(ellipsisSeparator).toHaveTextContent('/');

			// Should still render parent folder
			const folderLink = getByTestId('mcp-workflow-folder-link');
			expect(folderLink).toBeInTheDocument();
			expect(folderLink).toHaveTextContent(workflow.parentFolder?.name ?? '');

			// Should render separator after folder
			const folderSeparator = getByTestId('mcp-workflow-folder-separator');
			expect(folderSeparator).toBeInTheDocument();
			expect(folderSeparator).toHaveTextContent('/');

			// Should render workflow link
			const nameLink = getByTestId('mcp-workflow-name-link');
			expect(nameLink).toBeInTheDocument();
			expect(nameLink).toHaveTextContent(workflow.name);
		});

		it('should not render ellipsis if parent folder has no parent', () => {
			const workflow = mockWorkflow('1', {
				parentFolder: {
					id: 'folder-1',
					name: 'Root Folder',
					parentFolderId: null, // No parent
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
			});

			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			// Should NOT render ellipsis for grandparent
			expect(queryByTestId('mcp-workflow-grandparent-folder')).not.toBeInTheDocument();

			// Should NOT render ellipsis separator
			expect(queryByTestId('mcp-workflow-ellipsis-separator')).not.toBeInTheDocument();

			// Should render parent folder
			const folderLink = getByTestId('mcp-workflow-folder-link');
			expect(folderLink).toBeInTheDocument();
			expect(folderLink).toHaveTextContent(workflow.parentFolder?.name ?? '');

			// Should render separator after folder
			const folderSeparator = getByTestId('mcp-workflow-folder-separator');
			expect(folderSeparator).toBeInTheDocument();
			expect(folderSeparator).toHaveTextContent('/');

			// Should render workflow link
			const nameLink = getByTestId('mcp-workflow-name-link');
			expect(nameLink).toBeInTheDocument();
			expect(nameLink).toHaveTextContent(workflow.name);
		});

		it('should display folder without link when homeProject does not exist', () => {
			const workflow = mockWorkflow('1', {
				homeProject: undefined,
			});

			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			expect(queryByTestId('mcp-workflow-folder-link')).not.toBeInTheDocument();
			const folderName = getByTestId('mcp-workflow-folder-name');
			expect(folderName).toHaveTextContent(workflow.parentFolder?.name ?? '');
		});

		it('should display project information correctly for team project', () => {
			const workflow = mockWorkflow('1');
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const projectLink = getByTestId('mcp-workflow-project-link');
			expect(projectLink).toBeInTheDocument();

			const projectName = getByTestId('mcp-workflow-project-name');
			expect(projectName).toHaveTextContent(workflow.homeProject?.name ?? '');

			expect(router.resolve).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: workflow.homeProject?.id ?? '' },
			});
		});

		it('should display "-" when no project exists', () => {
			const workflow = mockWorkflow('1', {
				homeProject: undefined,
			});

			const { getByTestId } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const noProject = getByTestId('mcp-workflow-no-project');
			expect(noProject).toHaveTextContent('-');
		});
	});

	describe('User interactions and events', () => {
		it('should emit refresh event when refresh button is clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					workflows: [mockWorkflow('1')],
					loading: false,
				},
			});

			const refreshButton = getByTestId('mcp-workflows-refresh-button');
			await userEvent.click(refreshButton);

			expect(emitted()).toHaveProperty('refresh');
			expect(emitted().refresh).toHaveLength(1);
		});

		it('should emit removeMcpAccess event when action is selected', async () => {
			const workflow = mockWorkflow('1');
			const { getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					workflows: [workflow],
					loading: false,
				},
			});

			const actionToggle = getByTestId('mcp-workflow-action-toggle');
			expect(actionToggle).toBeInTheDocument();

			const actionButton = actionToggle?.querySelector('[role=button]');
			if (!actionButton) {
				throw new Error('Action button not found');
			}

			await userEvent.click(actionButton);

			const actionToggleId = actionButton.getAttribute('aria-controls');
			const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
			expect(actionDropdown).toBeInTheDocument();

			const removeAction = actionDropdown.querySelector('[data-test-id="action-removeFromMCP"]');
			expect(removeAction).toBeInTheDocument();
			await userEvent.click(removeAction!);

			expect(emitted()).toHaveProperty('removeMcpAccess');
			expect(emitted().removeMcpAccess).toHaveLength(1);
			expect(emitted().removeMcpAccess[0]).toEqual([workflow]);
		});
	});
});
