import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nodeExecuteAfterData } from './nodeExecuteAfterData';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';

describe('nodeExecuteAfterData', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: false,
		});
		setActivePinia(pinia);
		vi.spyOn(useSchemaPreviewStore(), 'trackSchemaPreviewExecution').mockResolvedValue();
	});

	it('should update node execution data with incoming payload', async () => {
		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		executionDataStore.setExecution(
			createTestWorkflowExecutionResponse({
				id: 'exec-1',
				workflowData: createTestWorkflow({
					nodes: [createTestNode({ name: 'Test Node' })],
				}),
			}),
		);
		executionDataStore.updateNodeExecutionStatus({
			executionId: 'exec-1',
			nodeName: 'Test Node',
			itemCountByConnectionType: { main: [1] },
			data: createTestTaskData({ executionStatus: 'running' }),
		});

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

		expect(executionDataStore.executionRunData?.['Test Node'][0].data).toEqual({
			main: [[{ json: { foo: 'bar' } }]],
		});
	});
});
