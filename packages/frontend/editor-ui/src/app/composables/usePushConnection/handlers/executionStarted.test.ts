import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { executionStarted } from './executionStarted';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import type { ExecutionStarted } from '@n8n/api-types/push/execution';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { mock } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';

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
		const pinia = createTestingPinia({ stubActions: true });
		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);

		mockOptions = {
			workflowState: mock<WorkflowState>(),
		};
	});

	it('should skip when activeExecutionId is undefined', async () => {
		workflowsStore.activeExecutionId = undefined;

		await executionStarted(makeEvent(), mockOptions);

		expect(mockOptions.workflowState.setActiveExecutionId).not.toHaveBeenCalled();
		expect(mockOptions.workflowState.setWorkflowExecutionData).not.toHaveBeenCalled();
	});

	it('should accept execution when activeExecutionId is null and populate workflowData from store', async () => {
		workflowsStore.activeExecutionId = null;
		workflowsStore.workflowExecutionData = null;
		workflowsStore.workflow.id = 'wf-123';
		workflowsStore.workflow.name = 'My Workflow';

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

	it('should not reinitialize when same execution ID arrives', async () => {
		workflowsStore.activeExecutionId = 'exec-1';
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
			workflowsStore.activeExecutionId = undefined;
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
			workflowsStore.activeExecutionId = 'exec-1';
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
			workflowsStore.activeExecutionId = 'exec-1';
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
