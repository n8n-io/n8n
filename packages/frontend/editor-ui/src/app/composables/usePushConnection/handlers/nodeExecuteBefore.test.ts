import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import { nodeExecuteBefore } from './nodeExecuteBefore';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useSubworkflowProgressStore } from '@/app/stores/subworkflowProgress.store';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { PushHandlerOptions } from './types';

describe('nodeExecuteBefore', () => {
	const documentId = createWorkflowDocumentId('test-wf');
	let options: PushHandlerOptions;
	let workflowExecutionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

	function makeEvent(executionId = 'exec-1', sequenceNumber = 0): NodeExecuteBefore {
		return {
			type: 'nodeExecuteBefore',
			data: {
				executionId,
				nodeName: 'Test Node',
				sequenceNumber,
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

	it('adds the executing node with its sequence number when the execution id matches', async () => {
		await nodeExecuteBefore(makeEvent('exec-1', 4), options);

		expect(workflowExecutionStateStore.executingNode.addExecutingNode).toHaveBeenCalledWith(
			'Test Node',
			4,
		);
	});

	it('skips when the execution id does not match the active execution', async () => {
		await nodeExecuteBefore(makeEvent('other-exec'), options);

		expect(workflowExecutionStateStore.executingNode.addExecutingNode).not.toHaveBeenCalled();
	});

	it("clears the node's sub-workflow progress so a new run starts clean", async () => {
		const progressStore = useSubworkflowProgressStore();
		const progress = { executionId: 'child-1', currentNodeIndex: 3, totalNodes: 5 };
		progressStore.updateProgress({
			parentExecutionId: 'exec-1',
			parentNodeName: 'Test Node',
			currentNodeName: 'Last',
			...progress,
		});
		progressStore.updateProgress({
			parentExecutionId: 'exec-1',
			parentNodeName: 'Other Node',
			currentNodeName: 'Last',
			...progress,
		});

		await nodeExecuteBefore(makeEvent('exec-1'), options);

		expect(progressStore.getFor('exec-1', 'Test Node')).toBeUndefined();
		expect(progressStore.getFor('exec-1', 'Other Node')).toBeDefined();
	});
});
