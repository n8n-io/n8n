import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, shallowRef, defineComponent, h } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';

import { useWorkflowInitialization } from './useWorkflowInitialization';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import type { IWorkflowDb } from '@/Interface';

const mockSetDocumentTitle = vi.hoisted(() => vi.fn());
const mockResetDocumentTitle = vi.hoisted(() => vi.fn());
const mockSetTitle = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({
		set: mockSetTitle,
		reset: mockResetDocumentTitle,
		setDocumentTitle: mockSetDocumentTitle,
		getDocumentState: vi.fn(),
	})),
}));

const mockResetWorkspace = vi.hoisted(() => vi.fn());
const mockInitializeWorkspace = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		workflowDocumentStore: { workflowId: 'wf-1', workflowVersion: 1 },
	}),
);
const mockOpenWorkflowTemplate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockOpenWorkflowTemplateFromJSON = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFitView = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn(() => ({
		resetWorkspace: mockResetWorkspace,
		initializeWorkspace: mockInitializeWorkspace,
		fitView: mockFitView,
		openWorkflowTemplate: mockOpenWorkflowTemplate,
		openWorkflowTemplateFromJSON: mockOpenWorkflowTemplateFromJSON,
	})),
}));

vi.mock('@/features/execution/executions/composables/useExecutionDebugging', () => ({
	useExecutionDebugging: vi.fn(() => ({
		applyExecutionData: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({
		run: vi.fn().mockResolvedValue(undefined),
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: (key: string) => key,
	})),
}));

const mockBuilderStore = vi.hoisted(() => ({ streaming: false }));
vi.mock('@/features/ai/assistant/builder.store', () => ({
	useBuilderStore: vi.fn(() => mockBuilderStore),
}));

vi.mock('@/features/core/folders/composables/useParentFolder', () => ({
	useParentFolder: vi.fn(() => ({
		fetchParentFolder: vi.fn().mockResolvedValue(null),
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useWorkflowId', () => ({
	useWorkflowId: vi.fn(() => ref('wf-1')),
}));

const mockNDVStore = vi.hoisted(() => ({}));
vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: vi.fn(() => mockNDVStore),
	injectNDVStore: vi.fn(() => ({ value: mockNDVStore })),
	disposeNDVStore: vi.fn(),
}));

const mockWorkflowDocumentStore = vi.hoisted(() => ({
	workflowId: 'wf-1',
	workflowVersion: 1,
	name: 'New Workflow',
	setName: vi.fn(),
	setHomeProject: vi.fn(),
	setScopes: vi.fn(),
	setParentFolder: vi.fn(),
	onNameChange: vi.fn(),
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(() => mockWorkflowDocumentStore),
	createWorkflowDocumentId: vi.fn((id: string) => id),
	disposeWorkflowDocumentStore: vi.fn(),
}));

const mockRoute = vi.hoisted(() => ({
	name: 'workflow' as string | symbol,
	params: {} as Record<string, unknown>,
	query: {} as Record<string, unknown>,
	meta: {} as Record<string, unknown>,
}));
vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: vi.fn(() => mockRoute),
		useRouter: vi.fn(() => ({
			replace: vi.fn().mockResolvedValue(undefined),
			push: vi.fn().mockResolvedValue(undefined),
		})),
	};
});

function createWorkflowState(): WorkflowState {
	return {
		getNewWorkflowData: vi.fn().mockResolvedValue({ name: 'New Workflow', settings: {} }),
	} as unknown as WorkflowState;
}

function renderWithComposable(
	callback: (init: ReturnType<typeof useWorkflowInitialization>) => void,
) {
	const TestComponent = defineComponent({
		setup() {
			const init = useWorkflowInitialization(createWorkflowState());
			callback(init);
			return () => h('div');
		},
	});

	return render(TestComponent, {
		global: {
			provide: {
				[WorkflowDocumentStoreKey as symbol]: shallowRef(mockWorkflowDocumentStore),
			},
		},
	});
}

describe('useWorkflowInitialization', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		mockBuilderStore.streaming = false;
		mockRoute.name = 'workflow';
		mockRoute.params = {};
		mockRoute.query = {};
		mockRoute.meta = {};
	});

	describe('document title', () => {
		it('sets the title to the workflow name when an existing workflow is opened', async () => {
			let openWorkflow!: (data: IWorkflowDb) => Promise<void>;
			renderWithComposable((init) => {
				openWorkflow = init.openWorkflow;
			});

			await openWorkflow({ id: 'wf-1', name: 'My Test Workflow' } as IWorkflowDb);

			expect(mockSetDocumentTitle).toHaveBeenCalledWith('My Test Workflow', 'IDLE');
			expect(mockResetDocumentTitle).not.toHaveBeenCalled();
		});

		it('sets the AI_BUILDING title when builder is streaming', async () => {
			mockBuilderStore.streaming = true;

			let openWorkflow!: (data: IWorkflowDb) => Promise<void>;
			renderWithComposable((init) => {
				openWorkflow = init.openWorkflow;
			});

			await openWorkflow({ id: 'wf-1', name: 'My Test Workflow' } as IWorkflowDb);

			expect(mockSetDocumentTitle).toHaveBeenCalledWith('My Test Workflow', 'AI_BUILDING');
		});

		it('sets the title to the new workflow name on a fresh editor', async () => {
			let initializeWorkspaceForNewWorkflow!: () => Promise<void>;
			renderWithComposable((init) => {
				initializeWorkspaceForNewWorkflow = init.initializeWorkspaceForNewWorkflow;
			});

			await initializeWorkspaceForNewWorkflow();

			expect(mockSetDocumentTitle).toHaveBeenCalledWith('New Workflow', 'IDLE');
		});
	});
});
