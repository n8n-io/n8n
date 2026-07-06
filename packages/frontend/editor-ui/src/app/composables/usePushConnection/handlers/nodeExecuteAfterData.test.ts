import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import { nodeExecuteAfterData } from './nodeExecuteAfterData';
import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import { createRunExecutionData } from 'n8n-workflow';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { PushHandlerOptions } from './types';

describe('nodeExecuteAfterData', () => {
	const documentId = createWorkflowDocumentId('test-wf');
	let options: PushHandlerOptions;
	let workflowExecutionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
	let executionDataStore: ReturnType<typeof useExecutionDataStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		options = { router: mock<Router>(), documentId };

		workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);

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

		workflowExecutionStateStore.setActiveExecutionId('exec-1');
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

		await nodeExecuteAfterData(event, options);

		// The exec store's run data for 'Test Node' should now have the real data
		const runData = executionDataStore.execution?.data?.resultData.runData;
		expect(runData?.['Test Node']).toHaveLength(1);
		expect(runData?.['Test Node'][0].data).toEqual({
			main: [[{ json: { foo: 'bar' } }]],
		});
	});

	it('should skip when the execution id does not match the active execution', async () => {
		const event: NodeExecuteAfterData = {
			type: 'nodeExecuteAfterData',
			data: {
				executionId: 'other-exec',
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

		await nodeExecuteAfterData(event, options);

		// The active execution (exec-1) keeps its placeholder data untouched.
		const runData = executionDataStore.execution?.data?.resultData.runData;
		expect(runData?.['Test Node'][0].data).toEqual({
			main: [[{ json: { placeholder: true } }]],
		});
	});
});
