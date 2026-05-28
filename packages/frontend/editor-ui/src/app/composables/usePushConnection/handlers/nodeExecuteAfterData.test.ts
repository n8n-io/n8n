import { createPinia, setActivePinia } from 'pinia';
import { nodeExecuteAfterData } from './nodeExecuteAfterData';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { createRunExecutionData } from 'n8n-workflow';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';

describe('nodeExecuteAfterData', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let stateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
	let executionDataStore: ReturnType<typeof useExecutionDataStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('test-wf');

		stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('test-wf'));

		executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		executionDataStore.setExecution(
			createTestWorkflowExecutionResponse({
				id: 'exec-1',
				finished: false,
				status: 'running',
				data: createRunExecutionData({
					resultData: {
						runData: {
							'Test Node': [
								{
									executionTime: 0,
									startTime: 0,
									executionIndex: 0,
									source: [],
									data: {
										main: [[{ json: { placeholder: true } }]],
									},
								},
							],
						},
					},
				}),
			}),
		);

		stateStore.setActiveExecutionId('exec-1');
	});

	it('should update node execution data with incoming payload', async () => {
		const event: NodeExecuteAfterData = {
			type: 'nodeExecuteAfterData',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				itemCountByConnectionType: { main: [1] },
				data: {
					executionTime: 0,
					startTime: 0,
					executionIndex: 0,
					source: [],
					data: {
						main: [[{ json: { foo: 'bar' } }]],
					},
				},
			},
		};

		await nodeExecuteAfterData(event);

		// The exec store's run data for 'Test Node' should now have the real data
		const runData = executionDataStore.execution?.data?.resultData.runData;
		expect(runData?.['Test Node']).toHaveLength(1);
		expect(runData?.['Test Node'][0].data).toEqual({
			main: [[{ json: { foo: 'bar' } }]],
		});
	});
});
