import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nodeExecuteAfterData } from './nodeExecuteAfterData';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';

describe('nodeExecuteAfterData', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: true,
		});
		setActivePinia(pinia);
	});

	it('should update node execution data with incoming payload', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);

		const event: NodeExecuteAfterData = {
			type: 'nodeExecuteAfterData',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				itemCount: 1,
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

		expect(workflowsStore.updateNodeExecutionData).toHaveBeenCalledTimes(1);
		expect(workflowsStore.updateNodeExecutionData).toHaveBeenCalledWith(event.data);
	});
});
