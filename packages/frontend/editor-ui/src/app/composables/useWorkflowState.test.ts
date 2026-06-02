import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowState: WorkflowState;
	let workflowExecutionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('test-wf');
		workflowState = useWorkflowState();

		workflowExecutionStateStore = useWorkflowExecutionStateStore(
			createWorkflowDocumentId('test-wf'),
		);
	});

	describe('resetState', () => {
		it('disposes every executionData store this workflow ever bound, including rolled-out ids', () => {
			// Three sequential runs — exec-1 rolls out of previousExecutionId after run 3.
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-1' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-2');
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-2' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-3');
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-3' }),
			);

			workflowState.resetState();

			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('clears displayedExecutionId so workflowExecutionData reads as null', () => {
			workflowExecutionStateStore.setActiveExecutionId('exec-A');
			useExecutionDataStore(createExecutionDataId('exec-A')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-A', finished: true, status: 'success' }),
			);
			// Simulate post-finish: active cleared, displayed preserved (the deliberate UX behavior).
			workflowExecutionStateStore.setActiveExecutionId(undefined);
			expect(workflowExecutionStateStore.displayedExecutionId).toBe('exec-A');
			expect(workflowsStore.workflowExecutionData?.id).toBe('exec-A');

			workflowState.resetState();

			const fresh = useWorkflowExecutionStateStore(createWorkflowDocumentId('test-wf'));
			expect(fresh.displayedExecutionId).toBeUndefined();
			expect(fresh.activeExecutionId).toBeUndefined();
			expect(fresh.pendingExecution).toBeNull();
			expect(workflowsStore.workflowExecutionData).toBeNull();
		});

		it('disposes the IN_PROGRESS placeholder store along with the pending scaffold', () => {
			workflowExecutionStateStore.setPendingExecution(
				createTestWorkflowExecutionResponse({
					id: IN_PROGRESS_EXECUTION_ID,
					status: 'running',
				}),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				createTestWorkflowExecutionResponse({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			workflowState.resetState();

			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution,
			).toBeNull();
		});

		it('is a no-op (other than executingNode/builder reset) when no workflow is loaded', () => {
			workflowsStore.setWorkflowId('');

			expect(() => workflowState.resetState()).not.toThrow();
		});

		it('reopening the same workflow id after resetWorkspace order surfaces no stale state', () => {
			// Stage execution on test-wf
			workflowExecutionStateStore.setActiveExecutionId('exec-A');
			useExecutionDataStore(createExecutionDataId('exec-A')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-A', finished: true, status: 'success' }),
			);
			workflowExecutionStateStore.setActiveExecutionId(undefined);
			expect(workflowsStore.workflowExecutionData?.id).toBe('exec-A');

			// Mirror resetWorkspace ordering: resetState first (while workflowId is still set),
			// then resetWorkflow empties the id.
			workflowState.resetState();
			workflowsStore.resetWorkflow();
			expect(workflowsStore.workflowId).toBe('');

			// Reopen the same workflow id.
			workflowsStore.setWorkflowId('test-wf');

			// Fresh state — no leakage.
			const fresh = useWorkflowExecutionStateStore(createWorkflowDocumentId('test-wf'));
			expect(fresh.activeExecutionId).toBeUndefined();
			expect(fresh.displayedExecutionId).toBeUndefined();
			expect(fresh.pendingExecution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-A')).execution).toBeNull();
			expect(workflowsStore.workflowExecutionData).toBeNull();
		});
	});
});
