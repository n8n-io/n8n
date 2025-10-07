import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { ref } from 'vue';
import WorkflowProductionChecklist from '@/components/WorkflowProductionChecklist.vue';
import { useEvaluationStore } from '@/features/evaluation.ee/evaluation.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowSettingsCache } from '@/composables/useWorkflowsCache';
import { useUIStore } from '@/stores/ui.store';
import { useMessage } from '@/composables/useMessage';
import { useTelemetry } from '@/composables/useTelemetry';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useRouter } from 'vue-router';
import type { IWorkflowDb } from '@/Interface';
import type { SourceControlPreferences } from '@/features/sourceControl.ee/sourceControl.types';
import {
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	VIEWS,
	MODAL_CONFIRM,
	ERROR_WORKFLOW_DOCS_URL,
	TIME_SAVED_DOCS_URL,
	EVALUATIONS_DOCS_URL,
} from '@/constants';
import type { INodeTypeDescription } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';

vi.mock('vue-router', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: vi.fn(),
	};
});

vi.mock('@/composables/useWorkflowsCache', () => ({
	useWorkflowSettingsCache: vi.fn(),
}));

vi.mock('@/composables/useMessage', () => ({
	useMessage: vi.fn(),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('@n8n/i18n')>();
	return {
		...actual,
		useI18n: () => ({
			baseText: (key: string) => key,
		}),
		i18n: {
			...actual.i18n,
			baseText: (key: string) => key,
		},
	};
});

const mockWorkflow: IWorkflowDb = {
	id: 'test-workflow-id',
	name: 'Test Workflow',
	active: true,
	nodes: [],
	settings: {
		executionOrder: 'v1',
	},
	connections: {},
	versionId: '1',
	createdAt: Date.now(),
	updatedAt: Date.now(),
	isArchived: false,
};

const mockAINodeType: Partial<INodeTypeDescription> = {
	codex: {
		categories: ['AI'],
	},
};

const mockNonAINodeType: Partial<INodeTypeDescription> = {
	codex: {
		categories: ['Core Nodes'],
	},
};

// eslint-disable-next-line
let mockN8nSuggestedActionsProps: Record<string, any> = {};
// eslint-disable-next-line
let mockN8nSuggestedActionsEmits: Record<string, any> = {};

const mockN8nSuggestedActions = {
	name: 'N8nSuggestedActions',
	props: ['actions', 'ignoreAllLabel', 'popoverAlignment', 'open', 'title', 'notice'],
	emits: ['action-click', 'ignore-click', 'ignore-all', 'update:open'],
	// eslint-disable-next-line
	setup(props: any, { emit }: any) {
		// Store props in the outer variable
		mockN8nSuggestedActionsProps = props;

		// Store emit functions
		mockN8nSuggestedActionsEmits = {
			'action-click': (id: string) => emit('action-click', id),
			'ignore-click': (id: string) => emit('ignore-click', id),
			'ignore-all': () => emit('ignore-all'),
			'update:open': (open: boolean) => emit('update:open', open),
		};

		return { props };
	},
	template: '<div data-test-id="n8n-suggested-actions-stub" />',
};

const renderComponent = createComponentRenderer(WorkflowProductionChecklist, {
	global: {
		stubs: {
			N8nSuggestedActions: mockN8nSuggestedActions,
		},
	},
});

describe('WorkflowProductionChecklist', () => {
	let router: ReturnType<typeof useRouter>;
	let workflowsCache: ReturnType<typeof useWorkflowSettingsCache>;
	let message: ReturnType<typeof useMessage>;
	let telemetry: ReturnType<typeof useTelemetry>;
	let evaluationStore: ReturnType<typeof useEvaluationStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;

	beforeEach(() => {
		router = {
			push: vi.fn(),
		} as unknown as ReturnType<typeof useRouter>;
		(useRouter as ReturnType<typeof vi.fn>).mockReturnValue(router);

		workflowsCache = {
			isCacheLoading: ref(false),
			getMergedWorkflowSettings: vi.fn().mockResolvedValue({
				suggestedActions: {},
			}),
			ignoreSuggestedAction: vi.fn().mockResolvedValue(undefined),
			ignoreAllSuggestedActionsForAllWorkflows: vi.fn().mockResolvedValue(undefined),
			updateFirstActivatedAt: vi.fn().mockResolvedValue(undefined),
		} as unknown as ReturnType<typeof useWorkflowSettingsCache>;
		(useWorkflowSettingsCache as ReturnType<typeof vi.fn>).mockReturnValue(workflowsCache);

		message = {
			confirm: vi.fn().mockResolvedValue(MODAL_CONFIRM),
		} as unknown as ReturnType<typeof useMessage>;
		(useMessage as ReturnType<typeof vi.fn>).mockReturnValue(message);

		telemetry = {
			track: vi.fn(),
		} as unknown as ReturnType<typeof useTelemetry>;
		(useTelemetry as ReturnType<typeof vi.fn>).mockReturnValue(telemetry);
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockN8nSuggestedActionsProps = {};
		mockN8nSuggestedActionsEmits = {};
	});

	describe('Action visibility', () => {
		it('should not render when workflow is inactive', () => {
			const { container } = renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						active: false,
					},
				},
				pinia: createTestingPinia(),
			});

			expect(
				container.querySelector('[data-test-id="n8n-suggested-actions-stub"]'),
			).not.toBeInTheDocument();
		});

		it('should not render when cache is loading', () => {
			workflowsCache.isCacheLoading.value = true;

			const { container } = renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia: createTestingPinia(),
			});

			expect(
				container.querySelector('[data-test-id="n8n-suggested-actions-stub"]'),
			).not.toBeInTheDocument();
		});

		it('should show evaluations action when AI node exists and evaluations are enabled', async () => {
			const pinia = createTestingPinia();
			evaluationStore = useEvaluationStore(pinia);
			nodeTypesStore = useNodeTypesStore(pinia);

			vi.spyOn(evaluationStore, 'isEvaluationEnabled', 'get').mockReturnValue(true);
			vi.spyOn(evaluationStore, 'evaluationSetOutputsNodeExist', 'get').mockReturnValue(false);
			// @ts-expect-error - mocking readonly property
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(mockAINodeType as INodeTypeDescription);

			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						nodes: [createTestNode({ type: 'ai-node', typeVersion: 1 })],
					},
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toEqual([
					{
						id: 'errorWorkflow',
						title: 'workflowProductionChecklist.errorWorkflow.title',
						description: 'workflowProductionChecklist.errorWorkflow.description',
						moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
						completed: false,
					},
					{
						id: 'evaluations',
						title: 'workflowProductionChecklist.evaluations.title',
						description: 'workflowProductionChecklist.evaluations.description',
						moreInfoLink: EVALUATIONS_DOCS_URL,
						completed: false,
					},
					{
						id: 'timeSaved',
						title: 'workflowProductionChecklist.timeSaved.title',
						description: 'workflowProductionChecklist.timeSaved.description',
						moreInfoLink: TIME_SAVED_DOCS_URL,
						completed: false,
					},
				]);
			});
		});

		it('should not show evaluations action when no AI node exists', async () => {
			const pinia = createTestingPinia();
			evaluationStore = useEvaluationStore(pinia);
			nodeTypesStore = useNodeTypesStore(pinia);

			vi.spyOn(evaluationStore, 'isEvaluationEnabled', 'get').mockReturnValue(true);
			// @ts-expect-error - mocking readonly property
			nodeTypesStore.getNodeType = vi
				.fn()
				.mockReturnValue(mockNonAINodeType as INodeTypeDescription);

			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						nodes: [createTestNode({ type: 'regular-node', typeVersion: 1 })],
					},
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toEqual([
					{
						id: 'errorWorkflow',
						title: 'workflowProductionChecklist.errorWorkflow.title',
						description: 'workflowProductionChecklist.errorWorkflow.description',
						moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
						completed: false,
					},
					{
						id: 'timeSaved',
						title: 'workflowProductionChecklist.timeSaved.title',
						description: 'workflowProductionChecklist.timeSaved.description',
						moreInfoLink: TIME_SAVED_DOCS_URL,
						completed: false,
					},
				]);
			});
		});

		it('should show error workflow action and time saved when not ignored', async () => {
			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia: createTestingPinia(),
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toEqual([
					{
						id: 'errorWorkflow',
						title: 'workflowProductionChecklist.errorWorkflow.title',
						description: 'workflowProductionChecklist.errorWorkflow.description',
						moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
						completed: false,
					},
					{
						id: 'timeSaved',
						title: 'workflowProductionChecklist.timeSaved.title',
						description: 'workflowProductionChecklist.timeSaved.description',
						moreInfoLink: TIME_SAVED_DOCS_URL,
						completed: false,
					},
				]);
				expect(mockN8nSuggestedActionsProps.popoverAlignment).toBe('end');
			});
		});

		it('should hide actions that are ignored', async () => {
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {
					errorWorkflow: { ignored: true },
					timeSaved: { ignored: true },
				},
			});

			const { container } = renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia: createTestingPinia(),
			});

			// Since all actions are ignored, the component should not render at all
			await vi.waitFor(() => {
				expect(
					container.querySelector('[data-test-id="n8n-suggested-actions-stub"]'),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('Action interactions', () => {
		it('should navigate to evaluations when evaluations action is clicked', async () => {
			const pinia = createTestingPinia();
			evaluationStore = useEvaluationStore(pinia);
			nodeTypesStore = useNodeTypesStore(pinia);

			vi.spyOn(evaluationStore, 'isEvaluationEnabled', 'get').mockReturnValue(true);
			// @ts-expect-error - mocking readonly property
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(mockAINodeType as INodeTypeDescription);

			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						nodes: [createTestNode({ type: 'ai-node', typeVersion: 1 })],
					},
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
			});

			// Simulate action click
			mockN8nSuggestedActionsEmits['action-click']('evaluations');

			await vi.waitFor(() => {
				expect(router.push).toHaveBeenCalledWith({
					name: VIEWS.EVALUATION_EDIT,
					params: { name: mockWorkflow.id },
				});
			});
		});

		it('should open workflow settings modal when error workflow action is clicked', async () => {
			const pinia = createTestingPinia();
			uiStore = useUIStore(pinia);
			const openModalSpy = vi.spyOn(uiStore, 'openModal');

			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
			});

			// Simulate action click
			mockN8nSuggestedActionsEmits['action-click']('errorWorkflow');

			await vi.waitFor(() => {
				expect(openModalSpy).toHaveBeenCalledWith(WORKFLOW_SETTINGS_MODAL_KEY);
			});
		});

		it('should open workflow settings modal when time saved action is clicked', async () => {
			const pinia = createTestingPinia();
			uiStore = useUIStore(pinia);
			const openModalSpy = vi.spyOn(uiStore, 'openModal');

			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
			});

			// Simulate action click
			mockN8nSuggestedActionsEmits['action-click']('timeSaved');

			await vi.waitFor(() => {
				expect(openModalSpy).toHaveBeenCalledWith(WORKFLOW_SETTINGS_MODAL_KEY);
			});
		});

		it('should ignore specific action when ignore is clicked', async () => {
			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia: createTestingPinia(),
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
			});

			// Simulate ignore click
			mockN8nSuggestedActionsEmits['ignore-click']('errorWorkflow');

			await vi.waitFor(() => {
				expect(workflowsCache.ignoreSuggestedAction).toHaveBeenCalledWith(
					mockWorkflow.id,
					'errorWorkflow',
				);
				expect(telemetry.track).toHaveBeenCalledWith('user clicked ignore suggested action', {
					actionId: 'errorWorkflow',
				});
			});
		});

		it('should ignore all actions after confirmation', async () => {
			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia: createTestingPinia(),
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
				expect(mockN8nSuggestedActionsProps.ignoreAllLabel).toBe(
					'workflowProductionChecklist.turnOffWorkflowSuggestions',
				);
			});

			// Simulate ignore all click
			mockN8nSuggestedActionsEmits['ignore-all']();

			await vi.waitFor(() => {
				expect(message.confirm).toHaveBeenCalled();
				expect(workflowsCache.ignoreAllSuggestedActionsForAllWorkflows).toHaveBeenCalledWith([
					'errorWorkflow',
					'timeSaved',
				]);
				expect(telemetry.track).toHaveBeenCalledWith(
					'user clicked ignore suggested actions for all workflows',
				);
			});
		});

		it('should not ignore all actions if confirmation is cancelled', async () => {
			message.confirm = vi.fn().mockResolvedValue('cancel');

			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia: createTestingPinia(),
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
			});

			// Simulate ignore all click
			mockN8nSuggestedActionsEmits['ignore-all']();

			await vi.waitFor(() => {
				expect(message.confirm).toHaveBeenCalled();
				expect(workflowsCache.ignoreAllSuggestedActionsForAllWorkflows).not.toHaveBeenCalled();
				expect(telemetry.track).not.toHaveBeenCalledWith(
					'user clicked ignore suggested actions for all workflows',
				);
			});
		});
	});

	describe('Popover behavior', () => {
		it('should track when popover is opened via update:open event', async () => {
			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia: createTestingPinia(),
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
			});

			// Simulate popover open via update:open event
			mockN8nSuggestedActionsEmits['update:open'](true);

			await vi.waitFor(() => {
				expect(telemetry.track).toHaveBeenCalledWith('user opened suggested actions checklist');
			});
		});

		it('should open popover automatically on first workflow activation', async () => {
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
				firstActivatedAt: undefined,
			});

			const { rerender } = renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						active: false,
					},
				},
				pinia: createTestingPinia(),
			});

			await rerender({
				workflow: {
					...mockWorkflow,
					active: true,
				},
			});

			await vi.waitFor(() => {
				expect(workflowsCache.updateFirstActivatedAt).toHaveBeenCalledWith(mockWorkflow.id);
			});

			// Wait for the setTimeout to execute and popover open state to be set
			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.open).toBe(true);
			});
		});

		it('should not open popover automatically if workflow was previously activated', async () => {
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
				firstActivatedAt: '2024-01-01',
			});

			const { rerender } = renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						active: false,
					},
				},
				pinia: createTestingPinia(),
			});

			await rerender({
				workflow: {
					...mockWorkflow,
					active: true,
				},
			});

			expect(workflowsCache.updateFirstActivatedAt).toHaveBeenCalledWith(mockWorkflow.id);
			expect(mockN8nSuggestedActionsProps.open).toBe(false);
		});

		it('should not open popover when activation modal is active', async () => {
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
				firstActivatedAt: undefined,
			});

			const pinia = createTestingPinia();
			uiStore = useUIStore(pinia);

			// Mock the activation modal as open via the object property
			Object.defineProperty(uiStore, 'isModalActiveById', {
				value: {
					[WORKFLOW_ACTIVE_MODAL_KEY]: true,
				},
				writable: true,
			});

			const { rerender } = renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						active: false,
					},
				},
				pinia,
			});

			await rerender({
				workflow: {
					...mockWorkflow,
					active: true,
				},
			});

			// Should still update first activated at
			await vi.waitFor(() => {
				expect(workflowsCache.updateFirstActivatedAt).toHaveBeenCalledWith(mockWorkflow.id);
			});

			// But should not open popover due to modal being active
			expect(mockN8nSuggestedActionsProps.open).toBe(false);
		});

		it('should prevent opening popover when activation modal is active', async () => {
			const pinia = createTestingPinia();
			uiStore = useUIStore(pinia);

			// Mock the activation modal as open via the object property
			Object.defineProperty(uiStore, 'isModalActiveById', {
				value: {
					[WORKFLOW_ACTIVE_MODAL_KEY]: true,
				},
				writable: true,
			});

			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
			});

			// Try to open popover by simulating user action
			mockN8nSuggestedActionsEmits['update:open'](true);

			// Should not actually open due to modal being active
			expect(mockN8nSuggestedActionsProps.open).toBe(false);
		});
	});

	describe('Completion states', () => {
		it('should mark evaluations as completed when evaluation set outputs node exists', async () => {
			const pinia = createTestingPinia();
			evaluationStore = useEvaluationStore(pinia);
			nodeTypesStore = useNodeTypesStore(pinia);

			vi.spyOn(evaluationStore, 'isEvaluationEnabled', 'get').mockReturnValue(true);
			vi.spyOn(evaluationStore, 'evaluationSetOutputsNodeExist', 'get').mockReturnValue(true);
			// @ts-expect-error - mocking readonly property
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(mockAINodeType as INodeTypeDescription);

			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						nodes: [createTestNode({ type: 'ai-node', typeVersion: 1 })],
					},
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toEqual([
					{
						id: 'errorWorkflow',
						title: 'workflowProductionChecklist.errorWorkflow.title',
						description: 'workflowProductionChecklist.errorWorkflow.description',
						moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
						completed: false,
					},
					{
						id: 'evaluations',
						title: 'workflowProductionChecklist.evaluations.title',
						description: 'workflowProductionChecklist.evaluations.description',
						moreInfoLink: EVALUATIONS_DOCS_URL,
						completed: true,
					},
					{
						id: 'timeSaved',
						title: 'workflowProductionChecklist.timeSaved.title',
						description: 'workflowProductionChecklist.timeSaved.description',
						moreInfoLink: TIME_SAVED_DOCS_URL,
						completed: false,
					},
				]);
			});
		});

		it('should mark error workflow as completed when error workflow is set', async () => {
			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						settings: {
							executionOrder: 'v1',
							errorWorkflow: 'error-workflow-id',
						},
					},
				},
				pinia: createTestingPinia(),
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toEqual([
					{
						id: 'errorWorkflow',
						title: 'workflowProductionChecklist.errorWorkflow.title',
						description: 'workflowProductionChecklist.errorWorkflow.description',
						moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
						completed: true,
					},
					{
						id: 'timeSaved',
						title: 'workflowProductionChecklist.timeSaved.title',
						description: 'workflowProductionChecklist.timeSaved.description',
						moreInfoLink: TIME_SAVED_DOCS_URL,
						completed: false,
					},
				]);
			});
		});

		it('should mark time saved as completed when time saved is set', async () => {
			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						settings: {
							executionOrder: 'v1',
							timeSavedPerExecution: 10,
						},
					},
				},
				pinia: createTestingPinia(),
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toEqual([
					{
						id: 'errorWorkflow',
						title: 'workflowProductionChecklist.errorWorkflow.title',
						description: 'workflowProductionChecklist.errorWorkflow.description',
						moreInfoLink: ERROR_WORKFLOW_DOCS_URL,
						completed: false,
					},
					{
						id: 'timeSaved',
						title: 'workflowProductionChecklist.timeSaved.title',
						description: 'workflowProductionChecklist.timeSaved.description',
						moreInfoLink: TIME_SAVED_DOCS_URL,
						completed: true,
					},
				]);
			});
		});
	});

	describe('Notice functionality', () => {
		it('should pass notice prop when source control branch is read-only', async () => {
			const pinia = createTestingPinia();
			sourceControlStore = useSourceControlStore(pinia);

			// Mock branch as read-only
			sourceControlStore.preferences = {
				branchReadOnly: true,
			} as SourceControlPreferences;

			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
				expect(mockN8nSuggestedActionsProps.notice).toBe(
					'workflowProductionChecklist.readOnlyNotice',
				);
			});
		});

		it('should not pass notice prop when source control branch is not read-only', async () => {
			const pinia = createTestingPinia();
			sourceControlStore = useSourceControlStore(pinia);

			// Mock branch as not read-only
			sourceControlStore.preferences = {
				branchReadOnly: false,
			} as SourceControlPreferences;

			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
				expect(mockN8nSuggestedActionsProps.notice).toBe('');
			});
		});

		it('should default to empty notice when source control preferences are undefined', async () => {
			const pinia = createTestingPinia();
			sourceControlStore = useSourceControlStore(pinia);

			// Mock preferences with no branchReadOnly property
			sourceControlStore.preferences = {} as SourceControlPreferences;

			renderComponent({
				props: {
					workflow: mockWorkflow,
				},
				pinia,
			});

			await vi.waitFor(() => {
				expect(mockN8nSuggestedActionsProps.actions).toBeDefined();
				expect(mockN8nSuggestedActionsProps.notice).toBe('');
			});
		});
	});
});
