import { waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowDiffModal from '@/features/workflows/workflowDiff/WorkflowDiffModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { reactive, ref } from 'vue';
import { createTestWorkflow } from '@/__tests__/mocks';

const eventBus = createEventBus();

const mockRoute = reactive({
	name: '',
	params: {},
	fullPath: '',
	query: {},
});

const mockRouterBack = vi.fn();
const mockRouterReplace = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: mockShowError,
	})),
}));

vi.mock('vue-router', () => ({
	useRoute: () => mockRoute,
	RouterLink: vi.fn(),
	useRouter: () => ({
		back: mockRouterBack,
		replace: mockRouterReplace,
	}),
}));

vi.mock('@/features/workflows/workflowDiff/useViewportSync', () => ({
	useProvideViewportSync: () => ({
		selectedDetailId: ref(undefined),
		onNodeClick: vi.fn(),
	}),
	useInjectViewportSync: () => ({
		triggerViewportChange: vi.fn(),
		onViewportChange: vi.fn(),
		selectedDetailId: ref(undefined),
		triggerNodeClick: vi.fn(),
	}),
}));

vi.mock('@/features/workflows/workflowDiff/useWorkflowDiff', () => ({
	useWorkflowDiff: () => ({
		source: { nodes: [], connections: [] },
		target: { nodes: [], connections: [] },
		nodesDiff: ref(new Map()),
		connectionsDiff: ref(new Map()),
	}),
	NodeDiffStatus: {
		Added: 'added',
		Deleted: 'deleted',
		Modified: 'modified',
		Eq: 'equal',
	} as const,
}));

const mockWorkflow = createTestWorkflow({
	id: 'test-workflow-id',
	name: 'Test Workflow',
	nodes: [
		{
			id: 'node1',
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		},
		{
			id: 'node2',
			name: 'End',
			type: 'n8n-nodes-base.end',
			typeVersion: 1,
			position: [450, 300],
			parameters: {},
		},
	],
	connections: {},
	active: true,
	settings: {
		executionOrder: 'v1' as const,
	},
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-02T00:00:00.000Z',
	versionId: 'version-1',
});

const renderModal = createComponentRenderer(WorkflowDiffModal, {
	global: {
		stubs: {
			Modal: {
				template: `
					<div>
						<slot name="header" v-bind="{ closeDialog: () => {} }" />
						<slot name="content" />
					</div>
				`,
			},
		},
	},
});

describe('WorkflowDiffModal', () => {
	let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
	let sourceControlStore: MockedStore<typeof useSourceControlStore>;
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockShowError.mockClear();
		mockRouterBack.mockClear();
		mockRouterReplace.mockClear();

		// Mock window.history.length to simulate having navigation history
		Object.defineProperty(window.history, 'length', {
			writable: true,
			configurable: true,
			value: 2,
		});

		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		nodeTypesStore.loadNodeTypesIfNotLoaded.mockResolvedValue();
		sourceControlStore.getRemoteWorkflow.mockResolvedValue({
			content: mockWorkflow,
			type: 'workflow',
		});
		workflowsListStore.fetchWorkflow.mockResolvedValue(mockWorkflow);
		sourceControlStore.preferences.branchName = 'main';
	});

	it('should mount successfully', async () => {
		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Component should render with the basic structure
		expect(container.querySelector('.header')).toBeInTheDocument();
		expect(container.querySelector('h4')).toBeInTheDocument();
	});

	it('should initialize with correct props', () => {
		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Component should render with correct modal name and structure
		const modal = container.querySelector('[name="workflowDiff"]');
		expect(modal).toBeInTheDocument();
		expect(modal?.getAttribute('width')).toBe('100%');
		expect(modal?.getAttribute('height')).toBe('100%');
	});

	it('should display changes button', async () => {
		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		await waitFor(() => {
			expect(getByText('Changes')).toBeInTheDocument();
		});
	});

	it('should open changes dropdown when clicking Changes button', async () => {
		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		const changesButton = getByText('Changes');
		await userEvent.click(changesButton);

		await waitFor(() => {
			expect(getByText('Nodes')).toBeInTheDocument();
			expect(getByText('Connectors')).toBeInTheDocument();
			expect(getByText('Settings')).toBeInTheDocument();
		});
	});

	it('should render workflow panels', () => {
		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Component should have workflow diff panels
		const panels = container.querySelectorAll('.workflowDiffPanel');
		expect(panels).toHaveLength(2); // Source and target workflow panels
	});

	it('should render navigation buttons', () => {
		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Check that navigation buttons are rendered
		const prevButton = container.querySelector('[data-icon="chevron-left"]');
		const nextButton = container.querySelector('[data-icon="chevron-right"]');

		expect(prevButton).toBeInTheDocument();
		expect(nextButton).toBeInTheDocument();
	});

	it('should handle settings diff', () => {
		const localWorkflow = { ...mockWorkflow, settings: { executionOrder: 'v1' as const } };
		const remoteWorkflow = { ...mockWorkflow, settings: { executionOrder: 'v0' as const } };

		sourceControlStore.getRemoteWorkflow.mockResolvedValue({
			content: remoteWorkflow,
			type: 'workflow',
		});
		workflowsListStore.fetchWorkflow.mockResolvedValue(localWorkflow);

		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		expect(getByText('Changes')).toBeInTheDocument();
	});

	it('should render back button', () => {
		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		const backButton = container.querySelector('[data-icon="arrow-left"]');
		expect(backButton).toBeInTheDocument();
	});

	it('should handle different workflow directions', () => {
		const pullComponent = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'pull',
				},
			},
		});

		const pushComponent = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Both components should render successfully
		expect(pullComponent.container.querySelector('.header')).toBeInTheDocument();
		expect(pushComponent.container.querySelector('.header')).toBeInTheDocument();
	});

	it('should show empty state when no changes exist in tabs', async () => {
		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Open changes dropdown
		const changesButton = getByText('Changes');
		await userEvent.click(changesButton);

		// Wait for dropdown to open and check tabs
		await waitFor(() => {
			expect(getByText('Nodes')).toBeInTheDocument();
		});

		// Click on Nodes tab to make it active
		await userEvent.click(getByText('Nodes'));

		// Should show "No changes" when there are no node changes
		await waitFor(() => {
			expect(getByText('No changes')).toBeInTheDocument();
		});
	});

	it('should show empty state for connectors tab when no connector changes', async () => {
		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Open changes dropdown
		const changesButton = getByText('Changes');
		await userEvent.click(changesButton);

		await waitFor(() => {
			expect(getByText('Connectors')).toBeInTheDocument();
		});

		// Click on Connectors tab
		await userEvent.click(getByText('Connectors'));

		// Should show "No changes" when there are no connector changes
		await waitFor(() => {
			expect(getByText('No changes')).toBeInTheDocument();
		});
	});

	it('should show empty state for settings tab when no settings changes', async () => {
		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					workflowId: 'test-workflow-id',
					workflowStatus: 'modified',
					direction: 'push',
				},
			},
		});

		// Open changes dropdown
		const changesButton = getByText('Changes');
		await userEvent.click(changesButton);

		await waitFor(() => {
			expect(getByText('Settings')).toBeInTheDocument();
		});

		// Click on Settings tab
		await userEvent.click(getByText('Settings'));

		// Should show "No changes" when there are no settings changes
		await waitFor(() => {
			expect(getByText('No changes')).toBeInTheDocument();
		});
	});

	describe('missing workflow scenarios', () => {
		it('should handle missing source workflow without crashing', async () => {
			sourceControlStore.getRemoteWorkflow.mockResolvedValue({
				content: mockWorkflow,
				type: 'workflow',
			});
			workflowsListStore.fetchWorkflow.mockRejectedValue(new Error('Workflow not found'));

			const { getByText } = renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'new-workflow-id',
						workflowStatus: 'modified',
						direction: 'pull',
					},
				},
			});

			// Component should render successfully even with missing workflow
			await waitFor(() => {
				expect(getByText('Changes')).toBeInTheDocument();
			});
		});

		it('should handle missing target workflow without crashing', async () => {
			sourceControlStore.getRemoteWorkflow.mockRejectedValue(new Error('Workflow not found'));
			workflowsListStore.fetchWorkflow.mockResolvedValue(mockWorkflow);

			const { getByText } = renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'missing-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			// Component should render successfully even with missing workflow
			await waitFor(() => {
				expect(getByText('Changes')).toBeInTheDocument();
			});
		});

		it('should handle push direction without crashing', async () => {
			const { getByText } = renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await waitFor(() => {
				expect(getByText('Changes')).toBeInTheDocument();
			});
		});

		it('should handle pull direction without crashing', async () => {
			const { getByText } = renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'pull',
					},
				},
			});

			await waitFor(() => {
				expect(getByText('Changes')).toBeInTheDocument();
			});
		});
	});

	describe('Error Handling - Remote Workflow', () => {
		it('should show toast error and close modal when remote workflow fails to load', async () => {
			sourceControlStore.getRemoteWorkflow.mockRejectedValue(
				new Error('Remote API error') as never,
			);

			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(mockShowError).toHaveBeenCalledTimes(1);
				expect(mockRouterBack).toHaveBeenCalledTimes(1);
			});
		});

		it('should continue loading local workflow when remote fails', async () => {
			sourceControlStore.getRemoteWorkflow.mockRejectedValue(
				new Error('Remote API error') as never,
			);

			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('test-workflow-id');
			});
		});
	});

	describe('Error Handling - Local Workflow', () => {
		it('should show toast error and close modal when local workflow fails to load', async () => {
			workflowsListStore.fetchWorkflow.mockRejectedValue(new Error('Local API error') as never);

			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(mockShowError).toHaveBeenCalledTimes(1);
				expect(mockRouterBack).toHaveBeenCalledTimes(1);
			});
		});

		it('should continue loading remote workflow when local fails', async () => {
			workflowsListStore.fetchWorkflow.mockRejectedValue(new Error('Local API error') as never);

			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(sourceControlStore.getRemoteWorkflow).toHaveBeenCalledWith('test-workflow-id');
			});
		});
	});

	describe('Error Handling - Both Workflows', () => {
		it('should show both toast errors but close modal only once when both workflows fail', async () => {
			sourceControlStore.getRemoteWorkflow.mockRejectedValue(
				new Error('Remote API error') as never,
			);
			workflowsListStore.fetchWorkflow.mockRejectedValue(new Error('Local API error') as never);

			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(mockShowError).toHaveBeenCalledTimes(2);
				expect(mockRouterBack).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('Successful Loading', () => {
		it('should load both remote and local workflows successfully', async () => {
			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(sourceControlStore.getRemoteWorkflow).toHaveBeenCalledWith('test-workflow-id');
				expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('test-workflow-id');
			});
		});

		it('should load node types before fetching workflows', async () => {
			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
			});
		});

		it('should not show toast errors on successful load', async () => {
			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(sourceControlStore.getRemoteWorkflow).toHaveBeenCalled();
				expect(workflowsListStore.fetchWorkflow).toHaveBeenCalled();
			});

			expect(mockShowError).not.toHaveBeenCalled();
		});
	});

	describe('handleBeforeClose behavior', () => {
		it('should call router.back when history length > 1', async () => {
			Object.defineProperty(window.history, 'length', {
				writable: true,
				configurable: true,
				value: 2,
			});

			const { container } = renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			const backButton = container.querySelector('[data-icon="arrow-left"]');
			await userEvent.click(backButton!);

			expect(mockRouterBack).toHaveBeenCalledTimes(1);
			expect(mockRouterReplace).not.toHaveBeenCalled();
		});

		it('should call router.replace when history length = 1', async () => {
			Object.defineProperty(window.history, 'length', {
				writable: true,
				configurable: true,
				value: 1,
			});

			mockRoute.query = { diff: 'workflow-id', direction: 'push', other: 'param' };

			const { container } = renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			const backButton = container.querySelector('[data-icon="arrow-left"]');
			await userEvent.click(backButton!);

			expect(mockRouterBack).not.toHaveBeenCalled();
			expect(mockRouterReplace).toHaveBeenCalledTimes(1);
			expect(mockRouterReplace).toHaveBeenCalledWith({
				query: { other: 'param' },
			});
		});
	});

	describe('remote workflow loading', () => {
		it('should not call getRemoteWorkflow when direction is push and workflowStatus is created', async () => {
			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'created',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith('test-workflow-id');
			});

			expect(sourceControlStore.getRemoteWorkflow).not.toHaveBeenCalled();
		});

		it('should call getRemoteWorkflow when direction is push and workflowStatus is not created', async () => {
			renderModal({
				props: {
					data: {
						eventBus,
						workflowId: 'test-workflow-id',
						workflowStatus: 'modified',
						direction: 'push',
					},
				},
			});

			await vi.waitFor(() => {
				expect(sourceControlStore.getRemoteWorkflow).toHaveBeenCalledWith('test-workflow-id');
			});
		});
	});
});
