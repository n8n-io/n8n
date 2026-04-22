import { VIEWS } from '@/app/constants';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from './useWorkflowInitialization';

const {
	mockRoute,
	mockRouter,
	mockToast,
	mockWorkflowsStore,
	mockWorkflowsListStore,
	mockUiStore,
	mockProjectsStore,
	mockHistoryStore,
	mockCanvasOperations,
} = vi.hoisted(() => ({
	mockRoute: {
		params: { name: 'wf-1' },
		query: {},
		name: '',
		meta: { nodeView: true },
	},
	mockRouter: {
		replace: vi.fn(),
		push: vi.fn(),
	},
	mockToast: {
		showError: vi.fn(),
	},
	mockWorkflowsStore: {
		workflowId: '',
		isInDebugMode: false,
		fetchLastSuccessfulExecution: vi.fn(),
	},
	mockWorkflowsListStore: {
		fetchWorkflow: vi.fn(),
		fetchActiveWorkflows: vi.fn(),
		checkWorkflowExists: vi.fn(),
		updateWorkflowInCache: vi.fn(),
	},
	mockUiStore: {
		nodeViewInitialized: false,
		isBlankRedirect: false,
	},
	mockProjectsStore: {
		currentProjectId: 'project-1',
		currentProject: null,
		personalProject: null,
		refreshCurrentProject: vi.fn(),
		setProjectNavActiveIdByWorkflowHomeProject: vi.fn(),
	},
	mockHistoryStore: {
		reset: vi.fn(),
	},
	mockCanvasOperations: {
		resetWorkspace: vi.fn(),
		initializeWorkspace: vi.fn(),
		fitView: vi.fn(),
		openWorkflowTemplate: vi.fn(),
		openWorkflowTemplateFromJSON: vi.fn(),
	},
}));

vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => mockRoute),
	useRouter: vi.fn(() => mockRouter),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: vi.fn((key: string) => key),
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => mockToast),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({
		setDocumentTitle: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({
		run: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn(() => mockCanvasOperations),
}));

vi.mock('@/features/core/folders/composables/useParentFolder', () => ({
	useParentFolder: vi.fn(() => ({
		fetchParentFolder: vi.fn(),
	})),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => mockWorkflowsStore),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => mockWorkflowsListStore),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(() => mockUiStore),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		allNodeTypes: [],
		getNodeTypes: vi.fn(),
		fetchCommunityNodePreviews: vi.fn(),
	})),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: vi.fn(() => ({
		fetchAllCredentialsForWorkflow: vi.fn(),
		fetchCredentialTypes: vi.fn(),
	})),
}));

vi.mock('@/features/settings/environments.ee/environments.store', () => ({
	useEnvironmentsStore: vi.fn(() => ({
		fetchAllVariables: vi.fn(),
	})),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		isPreviewMode: false,
		isEnterpriseFeatureEnabled: {},
	})),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: vi.fn(() => mockProjectsStore),
}));

vi.mock('@/app/stores/history.store', () => ({
	useHistoryStore: vi.fn(() => mockHistoryStore),
}));

vi.mock('@/features/ai/assistant/builder.store', () => ({
	useBuilderStore: vi.fn(() => ({
		streaming: false,
	})),
}));

vi.mock('@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store', () => ({
	useAITemplatesStarterCollectionStore: vi.fn(() => ({
		trackUserOpenedWorkflow: vi.fn(),
	})),
}));

vi.mock('@/experiments/readyToRunWorkflows/stores/readyToRunWorkflows.store', () => ({
	useReadyToRunWorkflowsStore: vi.fn(() => ({
		trackOpenWorkflow: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

vi.mock('@/features/execution/executions/composables/useExecutionDebugging', () => ({
	useExecutionDebugging: vi.fn(() => ({
		applyExecutionData: vi.fn(),
	})),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(),
	createWorkflowDocumentId: vi.fn((id: string, version?: string) => `${id}@${version ?? 'latest'}`),
	disposeWorkflowDocumentStore: vi.fn(),
}));

describe('useWorkflowInitialization', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockRoute.params = { name: 'wf-1' };
		mockRoute.query = {};
		mockRoute.name = VIEWS.WORKFLOW;
		mockRoute.meta = { nodeView: true };

		mockUiStore.nodeViewInitialized = false;
		mockUiStore.isBlankRedirect = false;
		mockWorkflowsStore.workflowId = '';
		mockWorkflowsStore.isInDebugMode = false;
	});

	it('does not redirect to a new workflow when opening an existing workflow fails', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockRejectedValue(new Error('boom'));

		const { initializeWorkflow, initializedWorkflowId } = useWorkflowInitialization(
			{} as WorkflowState,
		);

		await initializeWorkflow();

		expect(mockToast.showError).toHaveBeenCalledWith(
			expect.any(Error),
			'openWorkflow.workflowNotFoundError',
		);
		expect(mockRouter.push).not.toHaveBeenCalled();
		expect(mockRouter.replace).not.toHaveBeenCalled();
		expect(mockUiStore.nodeViewInitialized).toBe(true);
		expect(initializedWorkflowId.value).toBeUndefined();
	});

	it('returns to the last opened workflow when another workflow fails to open', async () => {
		mockRoute.params = { name: 'wf-2' };
		mockWorkflowsListStore.fetchWorkflow.mockRejectedValue(new Error('boom'));

		const { initializeWorkflow, initializedWorkflowId } = useWorkflowInitialization(
			{} as WorkflowState,
		);
		initializedWorkflowId.value = 'wf-1';
		await initializeWorkflow();

		expect(mockToast.showError).toHaveBeenCalledWith(
			expect.any(Error),
			'openWorkflow.workflowNotFoundError',
		);
		expect(mockRouter.replace).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { name: 'wf-1' },
		});
		expect(initializedWorkflowId.value).toBe('wf-1');
	});

	it('keeps redirecting to the not-found view on a 404 error', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockRejectedValue({ httpStatusCode: 404 });

		const { initializeWorkflow, initializedWorkflowId } = useWorkflowInitialization(
			{} as WorkflowState,
		);

		await initializeWorkflow();

		expect(mockRouter.replace).toHaveBeenCalledWith({
			name: VIEWS.ENTITY_NOT_FOUND,
			params: { entityType: 'workflow' },
		});
		expect(mockToast.showError).not.toHaveBeenCalled();
		expect(initializedWorkflowId.value).toBeUndefined();
	});

	it('ignores stale workflow-open failures after navigating away', async () => {
		mockRoute.params = { name: 'wf-2' };
		mockWorkflowsListStore.fetchWorkflow.mockRejectedValue(new Error('boom'));

		const { initializeWorkspaceForExistingWorkflow, initializedWorkflowId } =
			useWorkflowInitialization({} as WorkflowState);
		initializedWorkflowId.value = 'wf-1';

		await initializeWorkspaceForExistingWorkflow('wf-1');

		expect(mockToast.showError).not.toHaveBeenCalled();
		expect(mockRouter.replace).not.toHaveBeenCalled();
		expect(initializedWorkflowId.value).toBe('wf-1');
	});
});
