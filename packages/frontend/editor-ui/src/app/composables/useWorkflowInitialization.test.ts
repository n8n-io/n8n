import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('vue-router', () => ({
	useRoute: () => ({
		query: {},
		params: {},
		meta: {},
		name: 'workflow',
	}),
	useRouter: () => ({
		replace: mockRouterReplace,
		push: mockRouterPush,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const mockShowError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));
vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: () => ({ run: vi.fn() }),
}));
vi.mock('@/app/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: vi.fn() }) }));
vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({
		initializeWorkspace: vi.fn().mockResolvedValue({ workflowDocumentStore: {} }),
		resetWorkspace: vi.fn(),
		fitView: vi.fn(),
		openWorkflowTemplate: vi.fn(),
		openWorkflowTemplateFromJSON: vi.fn(),
	}),
}));
vi.mock('@/features/core/folders/composables/useParentFolder', () => ({
	useParentFolder: () => ({ fetchParentFolder: vi.fn().mockResolvedValue(null) }),
}));
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({ setWorkflowId: vi.fn(), fetchLastSuccessfulExecution: vi.fn() }),
}));
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ nodeViewInitialized: false, isBlankRedirect: false }),
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({ useNodeTypesStore: () => ({}) }));
vi.mock('@/features/credentials/credentials.store', () => ({ useCredentialsStore: () => ({}) }));
vi.mock('@/features/settings/environments.ee/environments.store', () => ({
	useEnvironmentsStore: () => ({}),
}));
vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({ isEnterpriseFeatureEnabled: vi.fn().mockReturnValue(false) }),
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProjectId: null,
		currentProject: null,
		personalProject: null,
		refreshCurrentProject: vi.fn(),
		setProjectNavActiveIdByWorkflowHomeProject: vi.fn(),
	}),
}));
vi.mock('@/app/stores/history.store', () => ({ useHistoryStore: () => ({ reset: vi.fn() }) }));
vi.mock('@/features/ai/assistant/builder.store', () => ({ useBuilderStore: () => ({}) }));
vi.mock(
	'@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store',
	() => ({ useAITemplatesStarterCollectionStore: () => ({ trackUserOpenedWorkflow: vi.fn() }) }),
);
vi.mock('@/experiments/readyToRunWorkflows/stores/readyToRunWorkflows.store', () => ({
	useReadyToRunWorkflowsStore: () => ({ trackOpenWorkflow: vi.fn() }),
}));
vi.mock('@/features/execution/executions/composables/useExecutionDebugging', () => ({
	useExecutionDebugging: () => ({ handleDebugMode: vi.fn() }),
}));
vi.mock('@/features/workflows/templates/utils/workflowSamples', () => ({
	getSampleWorkflowByTemplateId: vi.fn(),
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi
		.fn()
		.mockReturnValue({
			setName: vi.fn(),
			setHomeProject: vi.fn(),
			setScopes: vi.fn(),
			setParentFolder: vi.fn(),
			onNameChange: vi.fn(),
		}),
	createWorkflowDocumentId: vi.fn().mockReturnValue('doc-id'),
	disposeWorkflowDocumentStore: vi.fn(),
}));

const mockFetchWorkflow = vi.fn();
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({
		fetchWorkflow: mockFetchWorkflow,
		checkWorkflowExists: vi.fn().mockResolvedValue(false),
		updateWorkflowInCache: vi.fn(),
	}),
}));

vi.mock('@/app/constants', () => ({
	VIEWS: {
		NEW_WORKFLOW: 'new-workflow',
		WORKFLOWS: 'workflows',
		ENTITY_NOT_FOUND: 'entity-not-found',
		ENTITY_UNAUTHORIZED: 'entity-unauthorized',
	},
	EnterpriseEditionFeature: {},
}));

import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';

const workflowStateMock = {
	getNewWorkflowData: vi.fn().mockResolvedValue({ name: 'New Workflow' }),
} as any;

describe('useWorkflowInitialization', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('initializeWorkspaceForExistingWorkflow', () => {
		it('redirects to ENTITY_NOT_FOUND when workflow returns 404', async () => {
			const error = { httpStatusCode: 404 };
			mockFetchWorkflow.mockRejectedValueOnce(error);

			const { initializeWorkspaceForExistingWorkflow } =
				useWorkflowInitialization(workflowStateMock);
			await initializeWorkspaceForExistingWorkflow('workflow-404');

			expect(mockRouterReplace).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'entity-not-found' }),
			);
			expect(mockRouterPush).not.toHaveBeenCalled();
		});

		it('redirects to ENTITY_UNAUTHORIZED when workflow returns 403', async () => {
			const error = { httpStatusCode: 403 };
			mockFetchWorkflow.mockRejectedValueOnce(error);

			const { initializeWorkspaceForExistingWorkflow } =
				useWorkflowInitialization(workflowStateMock);
			await initializeWorkspaceForExistingWorkflow('workflow-403');

			expect(mockRouterReplace).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'entity-unauthorized' }),
			);
			expect(mockRouterPush).not.toHaveBeenCalled();
		});

		it('shows error toast and redirects to WORKFLOWS (not NEW_WORKFLOW) on generic error', async () => {
			const error = new Error('Failed to parse workflow parameters');
			mockFetchWorkflow.mockRejectedValueOnce(error);
			const { initializeWorkspaceForExistingWorkflow } =
				useWorkflowInitialization(workflowStateMock);
			await initializeWorkspaceForExistingWorkflow('workflow-bad-params');
			expect(mockShowError).toHaveBeenCalledWith(error, 'openWorkflow.workflowNotFoundError');

			// Must redirect to workflows list — NOT to new workflow (which creates orphan draft)
			expect(mockRouterReplace).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'workflows' }),
			);
			expect(mockRouterPush).not.toHaveBeenCalledWith(
				expect.objectContaining({ name: 'new-workflow' }),
			);
		});
	});
});
