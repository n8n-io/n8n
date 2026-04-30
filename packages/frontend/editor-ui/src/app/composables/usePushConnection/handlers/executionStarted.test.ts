import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { executionStarted } from './executionStarted';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { mockedStore } from '@/__tests__/utils';
import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import { useWorkflowState, type WorkflowState } from '@/app/composables/useWorkflowState';
import { mock } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants';
import { createRunExecutionData } from 'n8n-workflow';
import { stringify } from 'flatted';
import { createTestTaskData, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';

describe('executionStarted', () => {
	let mockOptions: { workflowState: Mocked<WorkflowState> };
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	function makeEvent(executionId = 'exec-1'): ExecutionStarted {
		return {
			type: 'executionStarted',
			data: { executionId } as ExecutionStarted['data'],
		};
	}

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);

		mockOptions = {
			workflowState: mock<WorkflowState>(),
		};
	});

	it('should skip when activeExecutionId is undefined', async () => {
		await executionStarted(makeEvent(), mockOptions);

		expect(mockOptions.workflowState.setActiveExecutionId).not.toHaveBeenCalled();
		expect(mockOptions.workflowState.setWorkflowExecutionData).not.toHaveBeenCalled();
	});

	it('should accept execution when activeExecutionId is null and populate workflowData from store', async () => {
		workflowsStore.workflowExecutionData = null;
		workflowsStore.workflow.id = 'wf-123';
		useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('wf-123'),
		).setActiveExecutionId(null);
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-123'));
		workflowDocumentStore.setName('My Workflow');

		await executionStarted(makeEvent('exec-1'), mockOptions);

		expect(mockOptions.workflowState.setActiveExecutionId).toHaveBeenCalledWith('exec-1');
		expect(mockOptions.workflowState.setWorkflowExecutionData).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'exec-1',
				status: 'running',
				workflowData: expect.objectContaining({ id: 'wf-123', name: 'My Workflow' }),
			}),
		);
	});

	it('should initialize execution data in the matching execution data store', async () => {
		workflowsStore.workflow.id = 'wf-123';
		useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('wf-123'),
		).setActiveExecutionId(null);
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-123'));
		workflowDocumentStore.setName('My Workflow');
		const workflowState = useWorkflowState();

		await executionStarted(makeEvent('exec-1'), { workflowState });

		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		expect(executionDataStore.execution).toEqual(
			expect.objectContaining({
				id: 'exec-1',
				status: 'running',
				workflowData: expect.objectContaining({ id: 'wf-123', name: 'My Workflow' }),
			}),
		);
		expect(workflowsStore.workflowExecutionData).toBe(executionDataStore.execution);
	});

	it('should copy in-progress execution data to the backend execution id', async () => {
		workflowsStore.workflow.id = 'wf-123';
		useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('wf-123'),
		).setActiveExecutionId(null);
		const executionSessionStore = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId('wf-123'),
		);
		executionSessionStore.setPendingExecution(
			createTestWorkflowExecutionResponse({
				id: IN_PROGRESS_EXECUTION_ID,
				workflowId: 'wf-123',
				data: createRunExecutionData({
					resultData: {
						runData: { Existing: [createTestTaskData({ startTime: 1, executionIndex: 0 })] },
					},
				}),
			}),
		);

		await executionStarted(makeEvent('exec-1'), { workflowState: useWorkflowState() });

		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		expect(executionDataStore.execution?.id).toBe('exec-1');
		expect(executionDataStore.executionRunData?.Existing).toHaveLength(1);
		expect(executionSessionStore.pendingExecution).toBeNull();
	});

	it('should write flatted run data to the execution data store', async () => {
		useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId(workflowsStore.workflowId),
		).setActiveExecutionId(null);
		const event = makeEvent('exec-1');
		event.data.flattedRunData = stringify({
			Node1: [createTestTaskData({ startTime: 1, executionIndex: 0 })],
		});

		await executionStarted(event, { workflowState: useWorkflowState() });

		expect(
			useExecutionDataStore(createExecutionDataId('exec-1')).executionRunData?.Node1,
		).toHaveLength(1);
	});

	it('should not reinitialize when same execution ID arrives', async () => {
		useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId(workflowsStore.workflowId),
		).setActiveExecutionId('exec-1');
		workflowsStore.workflowExecutionData = {
			id: 'exec-1',
			data: { resultData: { runData: {} } },
		} as never;

		await executionStarted(makeEvent('exec-1'), mockOptions);

		expect(mockOptions.workflowState.setActiveExecutionId).not.toHaveBeenCalled();
		expect(mockOptions.workflowState.setWorkflowExecutionData).not.toHaveBeenCalled();
	});

	describe('iframe re-execution', () => {
		const originalParent = window.parent;

		beforeEach(() => {
			// Simulate iframe context: window.parent differs from window
			Object.defineProperty(window, 'parent', {
				value: { postMessage: vi.fn() },
				writable: true,
				configurable: true,
			});
		});

		afterEach(() => {
			Object.defineProperty(window, 'parent', {
				value: originalParent,
				writable: true,
				configurable: true,
			});
		});

		it('should accept execution when activeExecutionId is undefined in iframe (post-executionFinished)', async () => {
			useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			).setActiveExecutionId(undefined);
			workflowsStore.workflowExecutionData = {
				id: 'old-exec',
				data: { resultData: { runData: { Node1: [{ executionTime: 100 }] } } },
			} as never;

			await executionStarted(makeEvent('exec-2'), mockOptions);

			expect(mockOptions.workflowState.setActiveExecutionId).toHaveBeenCalledWith('exec-2');
			expect(mockOptions.workflowState.setWorkflowExecutionData).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'exec-2', status: 'running' }),
			);
		});

		it('should accept new execution and reset state when re-executing in iframe', async () => {
			useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			).setActiveExecutionId('exec-1');
			workflowsStore.workflowExecutionData = {
				id: 'exec-1',
				data: { resultData: { runData: { Node1: [{ executionTime: 100 }] } } },
			} as never;

			await executionStarted(makeEvent('exec-2'), mockOptions);

			expect(mockOptions.workflowState.setActiveExecutionId).toHaveBeenCalledWith('exec-2');
			expect(mockOptions.workflowState.setWorkflowExecutionData).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'exec-2', status: 'running' }),
			);
		});

		it('should not reset when same execution ID arrives in iframe', async () => {
			useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			).setActiveExecutionId('exec-1');
			workflowsStore.workflowExecutionData = {
				id: 'exec-1',
				data: { resultData: { runData: {} } },
			} as never;

			await executionStarted(makeEvent('exec-1'), mockOptions);

			expect(mockOptions.workflowState.setActiveExecutionId).not.toHaveBeenCalled();
			expect(mockOptions.workflowState.setWorkflowExecutionData).not.toHaveBeenCalled();
		});
	});
});
