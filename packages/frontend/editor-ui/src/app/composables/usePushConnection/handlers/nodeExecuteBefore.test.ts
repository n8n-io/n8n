import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { mock } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';

import { nodeExecuteBefore } from './nodeExecuteBefore';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';

describe('nodeExecuteBefore', () => {
	let mockOptions: { workflowState: Mocked<WorkflowState> };

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		mockOptions = {
			workflowState: mock<WorkflowState>({
				executingNode: {
					addExecutingNode: vi.fn(),
				},
			}),
		};
	});

	it('writes started node data to the matching execution data store', async () => {
		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		executionDataStore.setExecution(
			createTestWorkflowExecutionResponse({
				id: 'exec-1',
				workflowData: createTestWorkflow({
					nodes: [createTestNode({ name: 'Test Node' })],
				}),
			}),
		);
		const event: NodeExecuteBefore = {
			type: 'nodeExecuteBefore',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				data: { startTime: 1, executionIndex: 0, source: [] },
			},
		};

		await nodeExecuteBefore(event, mockOptions);

		expect(mockOptions.workflowState.executingNode.addExecutingNode).toHaveBeenCalledWith(
			'Test Node',
		);
		expect(executionDataStore.executionStartedData).toEqual([
			'exec-1',
			{ 'Test Node': [{ startTime: 1, executionIndex: 0, source: [] }] },
		]);
	});
});
