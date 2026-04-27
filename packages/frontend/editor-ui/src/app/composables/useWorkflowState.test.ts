import * as workflowsApi from '@/app/api/workflows';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import {
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { createRunExecutionData } from 'n8n-workflow';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useExecutionDataStore } from '@/app/stores/executionData.store';
import { useWorkflowExecutionSessionStore } from '@/app/stores/workflowExecutionSession.store';
import { VIEWS } from '@/app/constants';

const sourceControlStore = vi.hoisted(() => ({
	preferences: {
		branchReadOnly: false,
	},
}));

vi.mock('@/app/api/workflows', () => ({
	getLastSuccessfulExecution: vi.fn(),
	getNewWorkflow: vi.fn(),
}));

vi.mock('@/features/integrations/sourceControl.ee/sourceControl.store', () => ({
	useSourceControlStore: vi.fn(() => sourceControlStore),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' },
	})),
}));

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let workflowExecutionSessionStore: ReturnType<typeof useWorkflowExecutionSessionStore>;
	let executionDataStore: ReturnType<typeof useExecutionDataStore>;
	let workflowState: WorkflowState;
	let uiStore: ReturnType<typeof useUIStore>;
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowsListStore = useWorkflowsListStore();
		workflowsStore.workflow = createTestWorkflow({
			id: 'test-workflow',
			scopes: ['workflow:update'],
		});
		workflowsListStore.addWorkflow(workflowsStore.workflow);
		workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflow.id),
		);
		workflowDocumentStore.setScopes(['workflow:update']);
		workflowExecutionSessionStore = useWorkflowExecutionSessionStore(workflowsStore.workflow.id);
		workflowExecutionSessionStore.setActiveExecutionId('test-execution');
		executionDataStore = useExecutionDataStore('test-execution');
		uiStore = useUIStore();
		uiStore.currentView = VIEWS.WORKFLOW.toString();
		sourceControlStore.preferences.branchReadOnly = false;
		workflowState = useWorkflowState();
	});

	describe('markExecutionAsStopped', () => {
		beforeEach(() => {
			executionDataStore.setExecution(
				createTestWorkflowExecutionResponse({
					id: 'test-execution',
					status: 'running',
					startedAt: new Date('2023-01-01T09:00:00Z'),
					stoppedAt: undefined,
					data: createRunExecutionData({
						resultData: {
							runData: {
								node1: [
									createTestTaskData({ executionStatus: 'success' }),
									createTestTaskData({ executionStatus: 'error' }),
									createTestTaskData({ executionStatus: 'running' }),
								],
								node2: [
									createTestTaskData({ executionStatus: 'success' }),
									createTestTaskData({ executionStatus: 'waiting' }),
								],
							},
						},
					}),
				}),
			);
		});

		it('should remove non successful node runs', () => {
			workflowState.markExecutionAsStopped();

			const runData = executionDataStore.execution?.data?.resultData?.runData;
			expect(runData?.node1).toHaveLength(1);
			expect(runData?.node1[0].executionStatus).toBe('success');
			expect(runData?.node2).toHaveLength(1);
			expect(runData?.node2[0].executionStatus).toBe('success');
		});

		it('should update execution status, startedAt and stoppedAt when data is provided', () => {
			workflowState.markExecutionAsStopped({
				status: 'canceled',
				startedAt: new Date('2023-01-01T10:00:00Z'),
				stoppedAt: new Date('2023-01-01T10:05:00Z'),
				mode: 'manual',
			});

			expect(executionDataStore.execution?.status).toBe('canceled');
			expect(executionDataStore.execution?.startedAt).toEqual(new Date('2023-01-01T10:00:00Z'));
			expect(executionDataStore.execution?.stoppedAt).toEqual(new Date('2023-01-01T10:05:00Z'));
		});

		it('should not update execution data when stopData is not provided', () => {
			workflowState.markExecutionAsStopped();

			expect(executionDataStore.execution?.status).toBe('running');
			expect(executionDataStore.execution?.startedAt).toEqual(new Date('2023-01-01T09:00:00Z'));
			expect(executionDataStore.execution?.stoppedAt).toBeUndefined();
		});
	});

	describe('fetchLastSuccessfulExecution', () => {
		it('stores the fetched execution in the execution data store', async () => {
			const execution = createTestWorkflowExecutionResponse({
				id: 'last-successful-execution',
				status: 'success',
			});
			vi.mocked(workflowsApi.getLastSuccessfulExecution).mockResolvedValue(execution);

			await workflowState.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: 'push-ref',
				}),
				'test-workflow',
			);
			expect(workflowExecutionSessionStore.lastSuccessfulExecutionId).toBe(execution.id);
			expect(useExecutionDataStore(execution.id).execution).toEqual(execution);
		});

		it('stores null when the API returns no previous successful execution', async () => {
			workflowExecutionSessionStore.setLastSuccessfulExecution(
				createTestWorkflowExecutionResponse({ id: 'stale-execution', status: 'success' }),
			);
			vi.mocked(workflowsApi.getLastSuccessfulExecution).mockResolvedValue(null);

			await workflowState.fetchLastSuccessfulExecution();

			expect(workflowExecutionSessionStore.lastSuccessfulExecutionId).toBeNull();
		});

		it('skips fetching when the current workflow is archived', async () => {
			workflowDocumentStore.setIsArchived(true);

			await workflowState.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('skips fetching when the current view is read-only', async () => {
			uiStore.currentView = 'execution';

			await workflowState.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('swallows API errors and preserves the current execution snapshot', async () => {
			const execution = createTestWorkflowExecutionResponse({
				id: 'existing-execution',
				status: 'success',
			});
			workflowExecutionSessionStore.setLastSuccessfulExecution(execution);
			vi.mocked(workflowsApi.getLastSuccessfulExecution).mockRejectedValue(new Error('boom'));

			await expect(workflowState.fetchLastSuccessfulExecution()).resolves.toBeUndefined();

			expect(workflowExecutionSessionStore.lastSuccessfulExecutionId).toBe(execution.id);
			expect(useExecutionDataStore(execution.id).execution).toEqual(execution);
		});
	});
});
