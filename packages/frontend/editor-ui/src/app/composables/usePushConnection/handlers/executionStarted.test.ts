import { createPinia, setActivePinia } from 'pinia';
import { executionStarted } from './executionStarted';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';

describe('executionStarted', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let stateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

	function makeEvent(executionId = 'exec-1'): ExecutionStarted {
		return {
			type: 'executionStarted',
			data: { executionId } as ExecutionStarted['data'],
		};
	}

	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('wf-123');

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-123'));
		workflowDocumentStore.setName('My Workflow');

		stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('wf-123'));
	});

	it('should skip when activeExecutionId is undefined', async () => {
		// activeExecutionId defaults to undefined, no need to set it
		await executionStarted(makeEvent());

		// stateStore.activeExecutionId should remain undefined
		expect(stateStore.activeExecutionId).toBeUndefined();

		// No execution data store should have been created for exec-1
		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		expect(executionDataStore.execution).toBeNull();
	});

	it('should accept execution when activeExecutionId is null and populate workflowData from store', async () => {
		stateStore.setActiveExecutionId(null);

		await executionStarted(makeEvent('exec-1'));

		expect(stateStore.activeExecutionId).toBe('exec-1');

		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		expect(executionDataStore.execution).toMatchObject({
			id: 'exec-1',
			status: 'running',
			workflowData: expect.objectContaining({ id: 'wf-123', name: 'My Workflow' }),
		});
	});

	it('should not reinitialize when same execution ID arrives', async () => {
		// Set up an active execution with existing data
		stateStore.promotePendingExecution('exec-1');
		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		executionDataStore.setExecution({
			id: 'exec-1',
			finished: false,
			mode: 'manual',
			status: 'running',
			createdAt: new Date(),
			startedAt: new Date(),
			workflowData: { id: 'wf-123', name: 'My Workflow', nodes: [], connections: {} } as never,
			data: { resultData: { runData: {} } } as never,
		});

		const executionBefore = executionDataStore.execution;

		await executionStarted(makeEvent('exec-1'));

		// stateStore.activeExecutionId should remain 'exec-1' without change
		expect(stateStore.activeExecutionId).toBe('exec-1');

		// execution data should not have been overwritten (same reference or same id)
		expect(executionDataStore.execution?.id).toBe('exec-1');
		// status should remain the same (not reinitialised)
		expect(executionDataStore.execution?.status).toBe(executionBefore?.status);
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
			// activeExecutionId defaults to undefined; in iframe context this should still accept
			await executionStarted(makeEvent('exec-2'));

			expect(stateStore.activeExecutionId).toBe('exec-2');

			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-2'));
			expect(executionDataStore.execution).toMatchObject({
				id: 'exec-2',
				status: 'running',
			});
		});

		it('should accept new execution and reset state when re-executing in iframe', async () => {
			// Set up an existing active execution
			stateStore.promotePendingExecution('exec-1');
			const oldExecStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			oldExecStore.setExecution({
				id: 'exec-1',
				finished: false,
				mode: 'manual',
				status: 'running',
				createdAt: new Date(),
				startedAt: new Date(),
				workflowData: { id: 'wf-123', name: 'My Workflow', nodes: [], connections: {} } as never,
				data: {
					resultData: { runData: { Node1: [{ executionTime: 100 }] } },
				} as never,
			});

			await executionStarted(makeEvent('exec-2'));

			expect(stateStore.activeExecutionId).toBe('exec-2');

			const newExecStore = useExecutionDataStore(createExecutionDataId('exec-2'));
			expect(newExecStore.execution).toMatchObject({
				id: 'exec-2',
				status: 'running',
			});
		});

		it('should not reset when same execution ID arrives in iframe', async () => {
			// Set up an existing active execution with data
			stateStore.promotePendingExecution('exec-1');
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution({
				id: 'exec-1',
				finished: false,
				mode: 'manual',
				status: 'running',
				createdAt: new Date(),
				startedAt: new Date(),
				workflowData: { id: 'wf-123', name: 'My Workflow', nodes: [], connections: {} } as never,
				data: { resultData: { runData: {} } } as never,
			});

			await executionStarted(makeEvent('exec-1'));

			// Should remain exec-1 without reinitializing
			expect(stateStore.activeExecutionId).toBe('exec-1');
		});
	});
});
