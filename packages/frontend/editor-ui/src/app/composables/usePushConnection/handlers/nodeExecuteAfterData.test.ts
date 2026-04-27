import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nodeExecuteAfterData } from './nodeExecuteAfterData';
import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useExecutionDataStore } from '@/app/stores/executionData.store';
import { mock } from 'vitest-mock-extended';

describe('nodeExecuteAfterData', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: true,
		});
		setActivePinia(pinia);
	});

	it('should update node execution data with incoming payload', async () => {
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId('test-workflow'),
		);
		const executionDataStore = useExecutionDataStore('exec-1');
		vi.spyOn(executionDataStore, 'updateNodeExecutionRunData');
		const workflowState = mock<WorkflowState>({
			getCurrentWorkflowDocumentStore: vi.fn(() => workflowDocumentStore),
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

		await nodeExecuteAfterData(event, { workflowState });

		expect(executionDataStore.updateNodeExecutionRunData).toHaveBeenCalledTimes(1);
		expect(executionDataStore.updateNodeExecutionRunData).toHaveBeenCalledWith(event.data);
	});
});
