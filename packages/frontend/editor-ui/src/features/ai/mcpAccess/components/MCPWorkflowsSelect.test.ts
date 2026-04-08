import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import MCPWorkflowsSelect from '@/features/ai/mcpAccess/components/MCPWorkflowsSelect.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { createWorkflow } from '@/features/ai/mcpAccess/mcp.test.utils';
import type { WorkflowListItem } from '@/Interface';

vi.mock('@/app/router', () => ({
	default: {
		resolve: vi.fn(({ name, params }) => {
			if (name === 'NodeViewExisting') {
				return { fullPath: `/workflows/${params.name}` };
			}
			if (name === 'ProjectsWorkflows') {
				return { fullPath: `/projects/${params.projectId}` };
			}
			return { fullPath: '/' };
		}),
	},
}));

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;

const createComponent = createComponentRenderer(MCPWorkflowsSelect);

describe('MCPWorkflowsSelect', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
			count: 0,
			data: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initial rendering', () => {
		it('should render the select component', async () => {
			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			expect(getByTestId('mcp-workflows-select')).toBeInTheDocument();
		});

		it('should render with placeholder prop', async () => {
			const { getByTestId } = createComponent({
				pinia,
				props: {
					placeholder: 'Search workflows...',
				},
			});
			await nextTick();

			const select = getByTestId('mcp-workflows-select');
			const input = select.querySelector('input');
			expect(input).toHaveAttribute('placeholder', 'Search workflows...');
		});

		it('should render as disabled when disabled prop is true', async () => {
			const { container } = createComponent({
				pinia,
				props: {
					disabled: true,
				},
			});
			await nextTick();

			// The disabled class is applied to the inner el-select element
			const elSelect = container.querySelector('.el-select');
			expect(elSelect).toHaveClass('el-select--disabled');
		});

		it('should render search icon in prepend slot', async () => {
			const { container } = createComponent({ pinia });
			await nextTick();

			const searchIcon = container.querySelector('[data-icon="search"]');
			expect(searchIcon).toBeInTheDocument();
		});
	});

	describe('Fetching workflows on mount', () => {
		it('should fetch workflows on mount', async () => {
			createComponent({ pinia });
			await nextTick();

			expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalledWith({
				take: 10,
				query: undefined,
			});
		});

		it('should handle async workflow fetching', async () => {
			// Create a promise that doesn't resolve immediately
			let resolvePromise: (value: { count: number; data: WorkflowListItem[] }) => void;
			mcpStore.getMcpEligibleWorkflows.mockImplementation(
				async () =>
					await new Promise((resolve) => {
						resolvePromise = resolve;
					}),
			);

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// The component should be rendered while loading
			expect(getByTestId('mcp-workflows-select')).toBeInTheDocument();

			// Resolve the promise with workflows
			const workflows = [createWorkflow({ id: 'wf-1', name: 'Test Workflow' })];
			resolvePromise!({ count: 1, data: workflows });

			await nextTick();

			// Verify the API was called
			expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
		});
	});

	describe('Workflow options rendering', () => {
		it('should render workflow options after fetching', async () => {
			const workflows = [
				createWorkflow({ id: 'wf-1', name: 'Workflow One' }),
				createWorkflow({ id: 'wf-2', name: 'Workflow Two' }),
			];

			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 2,
				data: workflows,
			});

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// Wait for loading to complete
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const options = document.querySelectorAll('.el-select-dropdown__item');
				expect(options.length).toBe(2);
			});
		});

		it('should show empty state when no workflows are returned', async () => {
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 0,
				data: [],
			});

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// Wait for the fetch to complete
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const emptyText = document.querySelector('.el-select-dropdown__empty');
				expect(emptyText).toBeInTheDocument();
			});
		});
	});

	describe('Remote search', () => {
		it('should search workflows when user types in input', async () => {
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 0,
				data: [],
			});

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// Wait for initial fetch
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			// Clear mocks to track new calls
			mcpStore.getMcpEligibleWorkflows.mockClear();
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: [createWorkflow({ id: 'wf-1', name: 'Searched Workflow' })],
			});

			const select = getByTestId('mcp-workflows-select');
			const input = select.querySelector('input');

			if (input) {
				await userEvent.type(input, 'test');
			}

			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalledWith({
					take: 10,
					query: 'test',
				});
			});
		});
	});

	describe('v-model binding', () => {
		it('should update modelValue when an option is selected', async () => {
			const workflows = [createWorkflow({ id: 'wf-1', name: 'Selectable Workflow' })];
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			const { getByTestId, emitted } = createComponent({ pinia });
			await nextTick();

			// Wait for fetch to complete
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const options = document.querySelectorAll('.el-select-dropdown__item');
				expect(options.length).toBe(1);
			});

			const option = document.querySelector('.el-select-dropdown__item');
			if (option) {
				await userEvent.click(option);
			}

			await waitFor(() => {
				expect(emitted('update:modelValue')).toBeTruthy();
				expect(emitted('update:modelValue')[0]).toEqual(['wf-1']);
			});
		});
	});

	describe('WorkflowLocation rendering in options', () => {
		it('should render workflow location with project name', async () => {
			const workflows = [
				createWorkflow({
					id: 'wf-1',
					name: 'My Workflow',
					homeProject: {
						id: 'project-1',
						type: 'team',
						name: 'Team Project',
						icon: null,
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
				}),
			];

			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// Wait for fetch to complete
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const projectName = document.querySelector(
					'[data-test-id="workflow-location-project-name"]',
				);
				expect(projectName).toBeInTheDocument();
				expect(projectName).toHaveTextContent('Team Project');
			});
		});

		it('should render workflow location with folder when parentFolder is provided', async () => {
			const workflows = [
				createWorkflow({
					id: 'wf-1',
					name: 'My Workflow',
					homeProject: {
						id: 'project-1',
						type: 'team',
						name: 'Team Project',
						icon: null,
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
					parentFolder: {
						id: 'folder-1',
						name: 'My Folder',
						parentFolderId: null,
					},
				}),
			];

			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// Wait for fetch to complete
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const folderName = document.querySelector('[data-test-id="workflow-location-folder-name"]');
				expect(folderName).toBeInTheDocument();
				expect(folderName).toHaveTextContent('My Folder');
			});
		});

		it('should render Personal for personal project type', async () => {
			const workflows = [
				createWorkflow({
					id: 'wf-1',
					name: 'My Workflow',
					homeProject: {
						id: 'personal-project',
						type: 'personal',
						name: 'User<user@n8n.io>',
						icon: null,
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
				}),
			];

			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			const { getByTestId } = createComponent({ pinia });
			await nextTick();

			// Wait for fetch to complete
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const projectName = document.querySelector(
					'[data-test-id="workflow-location-project-name"]',
				);
				expect(projectName).toBeInTheDocument();
				expect(projectName).toHaveTextContent('Personal');
			});
		});
	});
});
