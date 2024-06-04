import { useRootStore } from '@/stores/n8nRoot.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { IStartRunData, IWorkflowData } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';
import { ExpressionError, type IPinData, type IRunData, type Workflow } from 'n8n-workflow';
import type * as router from 'vue-router';

vi.mock('@/stores/n8nRoot.store', () => ({
	useRootStore: vi.fn().mockReturnValue({ pushConnectionActive: true }),
}));

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue({
		runWorkflow: vi.fn(),
		subWorkflowExecutionError: null,
		getWorkflowRunData: null,
		setWorkflowExecutionData: vi.fn(),
		activeExecutionId: null,
		nodesIssuesExist: false,
		executionWaitingForWebhook: false,
		getCurrentWorkflow: vi.fn().mockReturnValue({ id: '123' }),
		getNodeByName: vi.fn(),
	}),
}));

vi.mock('@/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({
		isActionActive: vi.fn().mockReturnValue(false),
		addActiveAction: vi.fn(),
		removeActiveAction: vi.fn(),
	}),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

vi.mock('@/composables/useI18n', () => ({
	useI18n: vi.fn().mockReturnValue({ baseText: vi.fn().mockImplementation((key) => key) }),
}));

vi.mock('@/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({
		run: vi.fn(),
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		clearAllStickyNotifications: vi.fn(),
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		getCurrentWorkflow: vi.fn(),
		checkReadyForExecution: vi.fn(),
		saveCurrentWorkflow: vi.fn(),
		getWorkflowDataToSave: vi.fn(),
	}),
}));

vi.mock('@/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn().mockReturnValue({
		updateNodesExecutionIssues: vi.fn(),
	}),
}));

vi.mock('@/composables/useTitleChange', () => ({
	useTitleChange: vi.fn().mockReturnValue({ titleSet: vi.fn() }),
}));

vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRouter: vi.fn().mockReturnValue({
			push: vi.fn(),
		}),
	};
});

describe('useRunWorkflow({ router })', () => {
	let rootStore: ReturnType<typeof useRootStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let router: ReturnType<typeof useRouter>;
	let workflowHelpers: ReturnType<typeof useWorkflowHelpers>;

	beforeAll(() => {
		const pinia = createTestingPinia();

		setActivePinia(pinia);

		rootStore = useRootStore();
		uiStore = useUIStore();
		workflowsStore = useWorkflowsStore();

		router = useRouter();
		workflowHelpers = useWorkflowHelpers({ router });
	});

	describe('runWorkflowApi()', () => {
		it('should throw an error if push connection is not active', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });
			rootStore.pushConnectionActive = false;

			await expect(runWorkflowApi({} as IStartRunData)).rejects.toThrow(
				'workflowRun.noActiveConnectionToTheServer',
			);
		});

		it('should successfully run a workflow', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });
			rootStore.pushConnectionActive = true;

			const mockResponse = { executionId: '123', waitingForWebhook: false };
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockResponse);

			const response = await runWorkflowApi({} as IStartRunData);

			expect(response).toEqual(mockResponse);
			expect(workflowsStore.activeExecutionId).toBe('123');
			expect(workflowsStore.executionWaitingForWebhook).toBe(false);
			expect(uiStore.addActiveAction).toHaveBeenCalledWith('workflowRunning');
		});

		it('should handle workflow run failure', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });

			rootStore.pushConnectionActive = true;
			vi.mocked(workflowsStore).runWorkflow.mockRejectedValue(new Error('Failed to run workflow'));

			await expect(runWorkflowApi({} as IStartRunData)).rejects.toThrow('Failed to run workflow');
			expect(uiStore.removeActiveAction).toHaveBeenCalledWith('workflowRunning');
		});

		it('should set waitingForWebhook if response indicates waiting', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });

			rootStore.pushConnectionActive = true;
			const mockResponse = { executionId: '123', waitingForWebhook: true };
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockResponse);

			const response = await runWorkflowApi({} as IStartRunData);

			expect(response).toEqual(mockResponse);
			expect(workflowsStore.executionWaitingForWebhook).toBe(true);
		});
	});

	describe('runWorkflow()', () => {
		it('should return undefined if UI action "workflowRunning" is active', async () => {
			const { runWorkflow } = useRunWorkflow({ router });
			vi.mocked(uiStore).isActionActive.mockReturnValue(true);
			const result = await runWorkflow({});
			expect(result).toBeUndefined();
		});

		it('should execute workflow even if it has issues', async () => {
			const mockExecutionResponse = { executionId: '123' };
			const { runWorkflow } = useRunWorkflow({ router });

			vi.mocked(uiStore).isActionActive.mockReturnValue(false);
			vi.mocked(workflowHelpers).getCurrentWorkflow.mockReturnValue({
				name: 'Test Workflow',
			} as unknown as Workflow);
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = true;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as IWorkflowData);
			vi.mocked(workflowsStore).getWorkflowRunData = {
				NodeName: [],
			};

			const result = await runWorkflow({});
			expect(result).toEqual(mockExecutionResponse);
		});

		it('should execute workflow successfully', async () => {
			const mockExecutionResponse = { executionId: '123' };
			const { runWorkflow } = useRunWorkflow({ router });

			vi.mocked(rootStore).pushConnectionActive = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = false;
			vi.mocked(workflowHelpers).getCurrentWorkflow.mockReturnValue({
				name: 'Test Workflow',
			} as Workflow);
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as IWorkflowData);
			vi.mocked(workflowsStore).getWorkflowRunData = {
				NodeName: [],
			};

			const result = await runWorkflow({});
			expect(result).toEqual(mockExecutionResponse);
		});
	});

	describe('consolidateRunDataAndStartNodes()', () => {
		it('should return empty runData and startNodeNames if runData is null', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const workflowMock = {
				getParentNodes: vi.fn(),
				nodes: {},
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes([], null, undefined, workflowMock);
			expect(result).toEqual({ runData: undefined, startNodeNames: [] });
		});

		it('should return correct startNodeNames and newRunData for given directParentNodes and runData', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const directParentNodes = ['node1', 'node2'];
			const runData = {
				node2: [{ data: { main: [[{ json: { value: 'data2' } }]] } }],
				node3: [{ data: { main: [[{ json: { value: 'data3' } }]] } }],
			} as unknown as IRunData;
			const pinData: IPinData = {
				node2: [{ json: { value: 'data2' } }],
			};
			const workflowMock = {
				getParentNodes: vi.fn().mockImplementation((node) => {
					if (node === 'node1') return ['node3'];
					return [];
				}),
				nodes: {
					node1: { disabled: false },
					node2: { disabled: false },
					node3: { disabled: true },
				},
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				pinData,
				workflowMock,
			);

			expect(result.startNodeNames).toContain('node1');
			expect(result.startNodeNames).not.toContain('node3');
			expect(result.runData).toEqual(runData);
		});

		it('should include directParentNode in startNodeNames if it has no runData or pinData', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const directParentNodes = ['node1'];
			const runData = {
				node2: [
					{
						data: {
							main: [[{ json: { value: 'data2' } }]],
						},
					},
				],
			} as unknown as IRunData;
			const workflowMock = {
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: { node1: { disabled: false } },
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				undefined,
				workflowMock,
			);

			expect(result.startNodeNames).toContain('node1');
			expect(result.runData).toBeUndefined();
		});

		it('should rerun failed parent nodes, adding them to the returned list of start nodes and not adding their result to runData', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const directParentNodes = ['node1'];
			const runData = {
				node1: [
					{
						error: new ExpressionError('error'),
					},
				],
			} as unknown as IRunData;
			const workflowMock = {
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: {
					node1: { disabled: false },
					node2: { disabled: false },
				},
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				undefined,
				workflowMock,
			);

			expect(result.startNodeNames).toContain('node1');
			expect(result.runData).toEqual(undefined);
		});
	});
});
