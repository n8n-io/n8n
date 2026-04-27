import { describe, expect, it } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import { createRunExecutionData, type ExecutionSummary, type ITaskData } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/app/constants';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { getPairedItemId } from '@/app/utils/pairedItemUtils';
import {
	useWorkflowDocumentExecution,
	type WorkflowDocumentExecutionDeps,
} from './useWorkflowDocumentExecution';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({
		id: overrides.id ?? crypto.randomUUID(),
		name: overrides.name ?? 'Test Node',
		type: overrides.type ?? MANUAL_TRIGGER_NODE_TYPE,
		typeVersion: overrides.typeVersion ?? 1,
		disabled: overrides.disabled ?? false,
		...overrides,
	}) as INodeUi;
}

function createExecutionSummary(overrides: Partial<ExecutionSummary> = {}): ExecutionSummary {
	return {
		id: 'execution-1',
		mode: 'manual',
		createdAt: new Date('2026-04-01T00:00:00.000Z'),
		startedAt: new Date('2026-04-01T00:00:00.000Z'),
		workflowId: 'wf-1',
		status: 'running',
		...overrides,
	};
}

function createExecution(
	runData: Record<string, ITaskData[]> = {},
	extra: Partial<ReturnType<typeof createTestWorkflowExecutionResponse>> = {},
) {
	return createTestWorkflowExecutionResponse({
		workflowData: createTestWorkflow({ id: 'wf-1', nodes: [] }),
		finished: false,
		status: 'running',
		data: createRunExecutionData({
			resultData: {
				runData,
				pinData: {},
			},
		}),
		...extra,
	});
}

function createComposable(
	overrides: Partial<
		WorkflowDocumentExecutionDeps & {
			triggerNodes: INodeUi[];
			nodesById: Map<string, INodeUi>;
		}
	> = {},
) {
	const triggerNodes = ref(overrides.triggerNodes ?? []);
	const nodesById = overrides.nodesById ?? new Map<string, INodeUi>();
	const deps: WorkflowDocumentExecutionDeps = {
		workflowId: overrides.workflowId ?? 'wf-1',
		workflowTriggerNodes: computed(() => triggerNodes.value),
		getNodeById: (id: string) => nodesById.get(id),
		getNodeType: () => null,
	};

	return {
		triggerNodes,
		nodesById,
		...useWorkflowDocumentExecution({
			...deps,
			...overrides,
			workflowTriggerNodes: computed(() => triggerNodes.value),
			getNodeById: (id: string) => nodesById.get(id),
		}),
	};
}

describe('useWorkflowDocumentExecution', () => {
	it('tracks the active execution id state machine', () => {
		const execution = createComposable();

		expect(execution.activeExecutionId.value).toBeUndefined();
		expect(execution.previousExecutionId.value).toBeUndefined();
		expect(execution.isWorkflowRunning.value).toBe(false);

		execution.setActiveExecutionId('execution-1');
		expect(execution.activeExecutionId.value).toBe('execution-1');
		expect(execution.previousExecutionId.value).toBeUndefined();

		execution.setActiveExecutionId('execution-2');
		expect(execution.activeExecutionId.value).toBe('execution-2');
		expect(execution.previousExecutionId.value).toBe('execution-1');

		execution.setActiveExecutionId(null);
		expect(execution.activeExecutionId.value).toBeNull();
		expect(execution.previousExecutionId.value).toBe('execution-1');
		expect(execution.isWorkflowRunning.value).toBe(true);

		execution.setActiveExecutionId(undefined);
		expect(execution.activeExecutionId.value).toBeUndefined();
		expect(execution.isWorkflowRunning.value).toBe(false);
	});

	it('stores execution data and paired item mappings', () => {
		const execution = createComposable();
		const sourceTask: ITaskData = {
			startTime: 1,
			executionIndex: 0,
			executionTime: 0,
			source: [],
			executionStatus: 'success',
			data: {
				main: [[{ json: { source: true }, pairedItem: { item: 0 } }]],
			},
		};
		const downstreamTask: ITaskData = {
			startTime: 2,
			executionIndex: 1,
			executionTime: 1,
			source: [{ previousNode: 'Source' }],
			executionStatus: 'success',
			data: {
				main: [[{ json: { downstream: true }, pairedItem: { item: 0 } }]],
			},
		};

		execution.setExecution(
			createExecution({
				Source: [sourceTask],
				Downstream: [downstreamTask],
			}),
		);

		expect(execution.executionRunData.value).toEqual({
			Source: [sourceTask],
			Downstream: [downstreamTask],
		});
		expect(execution.getExecutionRunDataByNodeName('Downstream')).toEqual([downstreamTask]);
		const sourceItemId = getPairedItemId('Source', 0, 0, 0);
		const downstreamItemId = getPairedItemId('Downstream', 0, 0, 0);

		expect(
			execution.executionPairedItemMappings.value[sourceItemId]?.has(downstreamItemId) ??
				execution.executionPairedItemMappings.value[downstreamItemId]?.has(sourceItemId),
		).toBe(true);
		expect(execution.executionResultDataLastUpdate.value).toBeTypeOf('number');
	});

	it('tracks started data and applies live node execution updates', () => {
		const execution = createComposable();

		execution.setExecution(createExecution());
		execution.addNodeExecutionStartedData({
			executionId: 'execution-1',
			nodeName: 'Live Node',
			data: {
				executionIndex: 0,
				startTime: 100,
				source: [],
			},
		});
		execution.addNodeExecutionStartedData({
			executionId: 'execution-1',
			nodeName: 'Live Node',
			data: {
				executionIndex: 1,
				startTime: 200,
				source: [],
			},
		});

		expect(execution.executionStartedData.value?.[0]).toBe('execution-1');
		expect(execution.executionStartedData.value?.[1]['Live Node']).toHaveLength(2);

		execution.updateNodeExecutionStatus({
			executionId: 'execution-1',
			nodeName: 'Live Node',
			itemCountByConnectionType: { main: [1] },
			data: createTestTaskData({
				executionStatus: 'waiting',
				startTime: 100,
			}),
		});

		expect(execution.getExecutionRunDataByNodeName('Live Node')?.[0].executionStatus).toBe(
			'waiting',
		);

		execution.updateNodeExecutionStatus({
			executionId: 'execution-1',
			nodeName: 'Live Node',
			itemCountByConnectionType: { main: [1] },
			data: createTestTaskData({
				executionStatus: 'success',
				startTime: 100,
			}),
		});

		execution.updateNodeExecutionRunData({
			executionId: 'execution-1',
			nodeName: 'Live Node',
			itemCountByConnectionType: { main: [2] },
			data: createTestTaskData({
				executionStatus: 'success',
				data: {
					main: [[{ json: { value: 1 } }, { json: { value: 2 } }]],
				},
			}),
		});

		expect(execution.execution.value?.data?.resultData.lastNodeExecuted).toBe('Live Node');
		expect(execution.getExecutionRunDataByNodeName('Live Node')?.[0].data?.main[0]).toHaveLength(2);
	});

	it('renames and clears node execution data', () => {
		const oldNode = createNode({
			id: 'node-old',
			name: 'Old Name',
			type: 'n8n-nodes-base.set',
		});
		const targetNode = createNode({ id: 'node-target', name: 'Target Node' });
		const oldTrigger = createNode({
			id: 'node-trigger',
			name: 'Old Trigger',
			type: FORM_TRIGGER_NODE_TYPE,
		});
		const execution = createComposable({
			nodesById: new Map([
				[oldNode.id, oldNode],
				[targetNode.id, targetNode],
				[oldTrigger.id, oldTrigger],
			]),
		});

		execution.setExecution(
			createExecution(
				{
					'Old Name': [
						createTestTaskData({
							data: { main: [[{ json: { old: true } }]] },
						}),
					],
					'Target Node': [
						createTestTaskData({
							source: [
								{
									previousNode: 'Old Name',
									previousNodeRun: 0,
									previousNodeOutput: 0,
								},
							],
							data: { main: [[{ json: { target: true } }]] },
						}),
					],
				},
				{
					executedNode: 'Old Name',
					triggerNode: 'Old Trigger',
					workflowData: createTestWorkflow({
						id: 'wf-1',
						nodes: [oldTrigger, oldNode, targetNode],
						pinData: {
							'Old Name': [{ json: { workflowPin: true } }],
						},
						connections: {
							'Old Name': {
								main: [[{ node: 'Target Node', index: 0, type: 'main' }]],
							},
							'Old Trigger': {
								main: [[{ node: 'Old Name', index: 0, type: 'main' }]],
							},
						},
					}),
					data: createRunExecutionData({
						resultData: {
							lastNodeExecuted: 'Old Name',
							runData: {
								'Old Name': [
									createTestTaskData({
										data: { main: [[{ json: { old: true } }]] },
									}),
								],
								'Target Node': [
									createTestTaskData({
										source: [
											{
												previousNode: 'Old Name',
												previousNodeRun: 0,
												previousNodeOutput: 0,
											},
										],
										data: { main: [[{ json: { target: true } }]] },
									}),
								],
							},
							pinData: {
								'Old Name': [{ json: { pinned: true } }],
								'Target Node': [
									{
										json: { paired: true },
										pairedItem: {
											item: 0,
											sourceOverwrite: {
												previousNode: 'Old Name',
												previousNodeOutput: 0,
											},
										},
									},
								],
							},
						},
					}),
				},
			),
		);
		execution.executionStartedData.value = [
			'execution-1',
			{
				'Old Name': [
					{
						executionIndex: 0,
						startTime: 123,
						source: [],
					},
				],
			},
		];
		execution.setChatPartialExecutionDestinationNode('Old Name');
		execution.setSelectedTriggerNodeName('Old Trigger');
		execution.setLastSuccessfulExecution(
			createExecution(
				{
					'Old Name': [createTestTaskData()],
				},
				{
					workflowData: createTestWorkflow({
						id: 'wf-1',
						nodes: [oldTrigger, oldNode, targetNode],
						connections: {
							'Old Name': {
								main: [[{ node: 'Target Node', index: 0, type: 'main' }]],
							},
						},
					}),
				},
			),
		);

		execution.renameExecutionDataNode('Old Name', 'New Name');
		execution.renameExecutionDataNode('Old Trigger', 'New Trigger');

		expect(execution.execution.value?.data?.resultData.runData['Old Name']).toBeUndefined();
		expect(execution.execution.value?.data?.resultData.runData['New Name']).toBeDefined();
		expect(execution.execution.value?.data?.resultData.pinData?.['New Name']).toEqual([
			{ json: { pinned: true } },
		]);
		expect(
			execution.execution.value?.data?.resultData.runData['Target Node']?.[0].source?.[0]
				?.previousNode,
		).toBe('New Name');
		expect(execution.execution.value?.data?.resultData.lastNodeExecuted).toBe('New Name');
		expect(execution.execution.value?.executedNode).toBe('New Name');
		expect(execution.execution.value?.triggerNode).toBe('New Trigger');
		expect(
			execution.execution.value?.workflowData.nodes.find((node) => node.id === oldNode.id)?.name,
		).toBe('New Name');
		expect(
			execution.execution.value?.workflowData.nodes.find((node) => node.id === oldTrigger.id)?.name,
		).toBe('New Trigger');
		expect(execution.execution.value?.workflowData.connections['New Name']).toBeDefined();
		expect(execution.execution.value?.workflowData.connections['Old Name']).toBeUndefined();
		expect(
			execution.execution.value?.workflowData.connections['New Trigger']?.main?.[0]?.[0]?.node,
		).toBe('New Name');
		expect(execution.execution.value?.workflowData.pinData?.['New Name']).toEqual([
			{ json: { workflowPin: true } },
		]);
		expect(execution.executionStartedData.value?.[1]['New Name']).toHaveLength(1);
		expect(execution.executionStartedData.value?.[1]['Old Name']).toBeUndefined();
		expect(execution.chatPartialExecutionDestinationNode.value).toBe('New Name');
		expect(execution.selectedTriggerNodeName.value).toBe('New Trigger');
		expect(
			execution.lastSuccessfulExecution.value?.data?.resultData.runData['New Name'],
		).toBeDefined();

		execution.clearNodeExecutionData('New Name');
		execution.removeNodeExecutionDataById(targetNode.id);

		expect(execution.execution.value?.data?.resultData.runData['New Name']).toBeUndefined();
		expect(execution.execution.value?.data?.resultData.runData['Target Node']).toBeUndefined();
	});

	it('auto-selects trigger nodes and prioritizes the running trigger node', async () => {
		const manualTrigger = createNode({
			id: 'manual-trigger',
			name: 'Manual Trigger',
			type: MANUAL_TRIGGER_NODE_TYPE,
		});
		const formTrigger = createNode({
			id: 'form-trigger',
			name: 'Form Trigger',
			type: FORM_TRIGGER_NODE_TYPE,
		});
		const execution = createComposable({
			triggerNodes: [manualTrigger, formTrigger],
		});

		await nextTick();
		expect(execution.selectedTriggerNodeName.value).toBe('Form Trigger');

		execution.setExecution(
			createExecution({}, { triggerNode: 'Manual Trigger', finished: false, status: 'running' }),
		);
		execution.setActiveExecutionId('execution-1');

		await nextTick();
		expect(execution.executionTriggerNodeName.value).toBe('Manual Trigger');
		expect(execution.selectedTriggerNodeName.value).toBe('Manual Trigger');
	});

	it('manages execution flags, chat state, current executions, and reset', () => {
		const execution = createComposable();
		const runningExecution = createExecutionSummary({ id: 'execution-1' });
		const finishedExecution = createExecutionSummary({
			id: 'execution-2',
			status: 'success',
			finished: true,
			stoppedAt: new Date('2026-04-01T00:01:00.000Z'),
		});

		execution.setExecutionWaitingForWebhook(true);
		execution.setDebugMode(true);
		execution.appendChatMessage('first');
		execution.appendChatMessage('second');
		execution.setChatPartialExecutionDestinationNode('Chat Node');
		execution.setSelectedTriggerNodeName('Manual Trigger');
		execution.setLastSuccessfulExecution(
			createTestWorkflowExecutionResponse({ id: 'last-successful', status: 'success' }),
		);
		execution.addToCurrentExecutions([
			runningExecution,
			createExecutionSummary({ id: 'ignored', workflowId: 'other-workflow' }),
		]);
		execution.addToCurrentExecutions([runningExecution, finishedExecution]);

		expect(execution.executionWaitingForWebhook.value).toBe(true);
		expect(execution.isInDebugMode.value).toBe(true);
		expect(execution.getPastChatMessages.value).toEqual(['first', 'second']);
		expect(execution.chatPartialExecutionDestinationNode.value).toBe('Chat Node');
		expect(execution.currentWorkflowExecutions.value).toEqual([
			runningExecution,
			finishedExecution,
		]);
		expect(execution.getAllLoadedFinishedExecutions.value).toEqual([finishedExecution]);
		expect(execution.lastSuccessfulExecution.value?.id).toBe('last-successful');

		execution.deleteExecution(runningExecution);
		execution.resetChatMessages();
		execution.resetExecutionState();

		expect(execution.currentWorkflowExecutions.value).toEqual([]);
		expect(execution.chatMessages.value).toEqual([]);
		expect(execution.execution.value).toBeNull();
		expect(execution.selectedTriggerNodeName.value).toBeUndefined();
		expect(execution.lastSuccessfulExecution.value).toBeNull();
	});
});
