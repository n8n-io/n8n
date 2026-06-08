import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import { nodeExecuteBefore } from './nodeExecuteBefore';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { PushHandlerOptions } from './types';

describe('nodeExecuteBefore', () => {
	const documentId = createWorkflowDocumentId('test-wf');
	let options: PushHandlerOptions;
	let workflowExecutionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

	function makeEvent(executionId = 'exec-1'): NodeExecuteBefore {
		return {
			type: 'nodeExecuteBefore',
			data: {
				executionId,
				nodeName: 'Test Node',
				data: { startTime: 0, executionIndex: 0, source: [] },
			},
		};
	}

	beforeEach(() => {
		setActivePinia(createPinia());

		options = { router: mock<Router>(), documentId };

		workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		vi.spyOn(workflowExecutionStateStore.executingNode, 'addExecutingNode');

		useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
			createTestWorkflowExecutionResponse({ id: 'exec-1', status: 'running' }),
		);
		workflowExecutionStateStore.setActiveExecutionId('exec-1');
	});

	it('adds the executing node when the execution id matches the active execution', async () => {
		await nodeExecuteBefore(makeEvent('exec-1'), options);

		expect(workflowExecutionStateStore.executingNode.addExecutingNode).toHaveBeenCalledWith(
			'Test Node',
		);
	});

	it('skips when the execution id does not match the active execution', async () => {
		await nodeExecuteBefore(makeEvent('other-exec'), options);

		expect(workflowExecutionStateStore.executingNode.addExecutingNode).not.toHaveBeenCalled();
	});
});
