import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nodeExecuteAfterData } from './nodeExecuteAfterData';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import type { IExecutionResponse } from '@/Interface';
import { createTestWorkflow } from '@/__tests__/mocks';

describe('nodeExecuteAfterData', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: true,
		});
		setActivePinia(pinia);
	});

	it('should call clearNodeExecutionData if data has trimmed items', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);

		workflowsStore.workflowExecutionData = {
			id: 'exec-1',
			status: 'waiting',
			startedAt: '2023-01-01T00:00:00Z',
			createdAt: '2023-01-01T00:00:00Z',
			workflowData: createTestWorkflow(),
			finished: false,
			mode: 'manual',
			data: {
				resultData: {
					runData: {
						'Test Node': [
							{
								executionTime: 0,
								startTime: 0,
								executionIndex: 0,
								source: [],
								data: {
									main: [[{ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }]],
								},
							},
						],
					},
				},
			},
		} as IExecutionResponse;

		const event: NodeExecuteAfterData = {
			type: 'nodeExecuteAfterData',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
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
		} as NodeExecuteAfterData;

		await nodeExecuteAfterData(event);

		expect(workflowsStore.clearNodeExecutionData).toHaveBeenCalledTimes(1);
		expect(workflowsStore.clearNodeExecutionData).toHaveBeenCalledWith('Test Node');
		expect(workflowsStore.updateNodeExecutionData).toHaveBeenCalledTimes(1);
		expect(workflowsStore.updateNodeExecutionData).toHaveBeenCalledWith(event.data);
	});

	it('should update node execution data with incoming payload', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);

		const event: NodeExecuteAfterData = {
			type: 'nodeExecuteAfterData',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
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
		} as NodeExecuteAfterData;

		await nodeExecuteAfterData(event);

		expect(workflowsStore.updateNodeExecutionData).toHaveBeenCalledTimes(1);
		expect(workflowsStore.updateNodeExecutionData).toHaveBeenCalledWith(event.data);
	});
});
