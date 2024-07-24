/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { useI18n } from '@/composables/useI18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { Ref } from 'vue';
import { computed } from 'vue';
import type {
	CanvasConnection,
	CanvasConnectionData,
	CanvasConnectionPort,
	CanvasNode,
	CanvasNodeAddNodesRender,
	CanvasNodeData,
	CanvasNodeDefaultRender,
	CanvasNodeStickyNoteRender,
} from '@/types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import {
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
} from '@/utils/canvasUtilsV2';
import type {
	ExecutionStatus,
	ExecutionSummary,
	IConnections,
	INodeExecutionData,
	ITaskData,
	Workflow,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { STICKY_NODE_TYPE, WAIT_TIME_UNLIMITED } from '@/constants';
import { sanitizeHtml } from '@/utils/htmlUtils';

export function useCanvasMapping({
	nodes,
	connections,
	workflowObject,
}: {
	nodes: Ref<INodeUi[]>;
	connections: Ref<IConnections>;
	workflowObject: Ref<Workflow>;
}) {
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	function createStickyNoteRenderType(node: INodeUi): CanvasNodeStickyNoteRender {
		return {
			type: CanvasNodeRenderType.StickyNote,
			options: {
				width: node.parameters.width as number,
				height: node.parameters.height as number,
				color: node.parameters.color as number,
				content: node.parameters.content as string,
			},
		};
	}

	function createAddNodesRenderType(): CanvasNodeAddNodesRender {
		return {
			type: CanvasNodeRenderType.AddNodes,
			options: {},
		};
	}

	function createDefaultNodeRenderType(node: INodeUi): CanvasNodeDefaultRender {
		return {
			type: CanvasNodeRenderType.Default,
			options: {
				trigger: nodeTypesStore.isTriggerNode(node.type),
				configuration: nodeTypesStore.isConfigNode(workflowObject.value, node, node.type),
				configurable: nodeTypesStore.isConfigurableNode(workflowObject.value, node, node.type),
			},
		};
	}

	const renderTypeByNodeId = computed(
		() =>
			nodes.value.reduce<Record<string, CanvasNodeData['render']>>((acc, node) => {
				switch (node.type) {
					case `${CanvasNodeRenderType.StickyNote}`:
						acc[node.id] = createStickyNoteRenderType(node);
						break;
					case `${CanvasNodeRenderType.AddNodes}`:
						acc[node.id] = createAddNodesRenderType();
						break;
					default:
						acc[node.id] = createDefaultNodeRenderType(node);
				}

				return acc;
			}, {}) ?? {},
	);

	const nodeInputsById = computed(() =>
		nodes.value.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
			const workflowObjectNode = workflowObject.value.getNode(node.name);

			acc[node.id] =
				workflowObjectNode && nodeTypeDescription
					? mapLegacyEndpointsToCanvasConnectionPort(
							NodeHelpers.getNodeInputs(
								workflowObject.value,
								workflowObjectNode,
								nodeTypeDescription,
							),
						)
					: [];

			return acc;
		}, {}),
	);

	const nodeOutputsById = computed(() =>
		nodes.value.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
			const workflowObjectNode = workflowObject.value.getNode(node.name);

			acc[node.id] =
				workflowObjectNode && nodeTypeDescription
					? mapLegacyEndpointsToCanvasConnectionPort(
							NodeHelpers.getNodeOutputs(
								workflowObject.value,
								workflowObjectNode,
								nodeTypeDescription,
							),
						)
					: [];

			return acc;
		}, {}),
	);

	const nodePinnedDataById = computed(() =>
		nodes.value.reduce<Record<string, INodeExecutionData[] | undefined>>((acc, node) => {
			acc[node.id] = workflowsStore.pinDataByNodeName(node.name);
			return acc;
		}, {}),
	);

	const nodeExecutionRunningById = computed(() =>
		nodes.value.reduce<Record<string, boolean>>((acc, node) => {
			acc[node.id] = workflowsStore.isNodeExecuting(node.name);
			return acc;
		}, {}),
	);

	const nodeExecutionStatusById = computed(() =>
		nodes.value.reduce<Record<string, ExecutionStatus>>((acc, node) => {
			acc[node.id] =
				workflowsStore.getWorkflowRunData?.[node.name]?.filter(Boolean)[0].executionStatus ?? 'new';
			return acc;
		}, {}),
	);

	const nodeExecutionRunDataById = computed(() =>
		nodes.value.reduce<Record<string, ITaskData[] | null>>((acc, node) => {
			acc[node.id] = workflowsStore.getWorkflowResultDataByNodeName(node.name);
			return acc;
		}, {}),
	);

	const nodeIssuesById = computed(() =>
		nodes.value.reduce<Record<string, string[]>>((acc, node) => {
			const issues: string[] = [];
			const nodeExecutionRunData = workflowsStore.getWorkflowRunData?.[node.name];
			if (nodeExecutionRunData) {
				nodeExecutionRunData.forEach((executionRunData) => {
					if (executionRunData?.error) {
						const { message, description } = executionRunData.error;
						const issue = `${message}${description ? ` (${description})` : ''}`;
						issues.push(sanitizeHtml(issue));
					}
				});
			}

			if (node?.issues !== undefined) {
				issues.push(...NodeHelpers.nodeIssuesToString(node.issues, node));
			}

			acc[node.id] = issues;

			return acc;
		}, {}),
	);

	const nodeHasIssuesById = computed(() =>
		nodes.value.reduce<Record<string, boolean>>((acc, node) => {
			if (['crashed', 'error'].includes(nodeExecutionStatusById.value[node.id])) {
				acc[node.id] = true;
			} else if (nodePinnedDataById.value[node.id]) {
				acc[node.id] = false;
			} else {
				acc[node.id] = Object.keys(node?.issues ?? {}).length > 0;
			}

			return acc;
		}, {}),
	);

	const nodeExecutionWaitingById = computed(() =>
		nodes.value.reduce<Record<string, string | undefined>>((acc, node) => {
			const isExecutionSummary = (execution: object): execution is ExecutionSummary =>
				'waitTill' in execution;

			const workflowExecution = workflowsStore.getWorkflowExecution;
			const lastNodeExecuted = workflowExecution?.data?.resultData?.lastNodeExecuted;

			if (workflowExecution && lastNodeExecuted && isExecutionSummary(workflowExecution)) {
				if (
					node.name === workflowExecution.data?.resultData?.lastNodeExecuted &&
					workflowExecution.waitTill
				) {
					const waitDate = new Date(workflowExecution.waitTill);

					if (waitDate.toISOString() === WAIT_TIME_UNLIMITED) {
						acc[node.id] = i18n.baseText(
							'node.theNodeIsWaitingIndefinitelyForAnIncomingWebhookCall',
						);
					}

					acc[node.id] = i18n.baseText('node.nodeIsWaitingTill', {
						interpolate: {
							date: waitDate.toLocaleDateString(),
							time: waitDate.toLocaleTimeString(),
						},
					});
				}
			}

			return acc;
		}, {}),
	);

	const additionalNodePropertiesById = computed(() => {
		return nodes.value.reduce<Record<string, Partial<CanvasNode>>>((acc, node) => {
			if (node.type === STICKY_NODE_TYPE) {
				acc[node.id] = {
					style: {
						zIndex: -1,
					},
				};
			}

			return acc;
		}, {});
	});

	const mappedNodes = computed<CanvasNode[]>(() => [
		...nodes.value.map<CanvasNode>((node) => {
			const inputConnections = workflowObject.value.connectionsByDestinationNode[node.name] ?? {};
			const outputConnections = workflowObject.value.connectionsBySourceNode[node.name] ?? {};

			const data: CanvasNodeData = {
				id: node.id,
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
				disabled: !!node.disabled,
				inputs: nodeInputsById.value[node.id] ?? [],
				outputs: nodeOutputsById.value[node.id] ?? [],
				connections: {
					[CanvasConnectionMode.Input]: inputConnections,
					[CanvasConnectionMode.Output]: outputConnections,
				},
				issues: {
					items: nodeIssuesById.value[node.id],
					visible: nodeHasIssuesById.value[node.id],
				},
				pinnedData: {
					count: nodePinnedDataById.value[node.id]?.length ?? 0,
					visible: !!nodePinnedDataById.value[node.id],
				},
				execution: {
					status: nodeExecutionStatusById.value[node.id],
					waiting: nodeExecutionWaitingById.value[node.id],
					running: nodeExecutionRunningById.value[node.id],
				},
				runData: {
					count: nodeExecutionRunDataById.value[node.id]?.length ?? 0,
					visible: !!nodeExecutionRunDataById.value[node.id],
				},
				render: renderTypeByNodeId.value[node.id] ?? { type: 'default', options: {} },
			};

			return {
				id: node.id,
				label: node.name,
				type: 'canvas-node',
				position: { x: node.position[0], y: node.position[1] },
				data,
				...additionalNodePropertiesById.value[node.id],
			};
		}),
	]);

	const mappedConnections = computed<CanvasConnection[]>(() => {
		return mapLegacyConnectionsToCanvasConnections(connections.value ?? [], nodes.value ?? []).map(
			(connection) => {
				const type = getConnectionType(connection);
				const label = getConnectionLabel(connection);
				const data = getConnectionData(connection);

				return {
					...connection,
					data,
					type,
					label,
					animated: data.status === 'running',
				};
			},
		);
	});

	function getConnectionData(connection: CanvasConnection): CanvasConnectionData {
		const fromNode = nodes.value.find((node) => node.name === connection.data?.fromNodeName);

		let status: CanvasConnectionData['status'];
		if (fromNode) {
			if (nodeExecutionRunningById.value[fromNode.id]) {
				status = 'running';
			} else if (
				nodePinnedDataById.value[fromNode.id] &&
				nodeExecutionRunDataById.value[fromNode.id]
			) {
				status = 'pinned';
			} else if (nodeHasIssuesById.value[fromNode.id]) {
				status = 'error';
			} else if (nodeExecutionRunDataById.value[fromNode.id]) {
				status = 'success';
			}
		}

		return {
			...(connection.data as CanvasConnectionData),
			status,
		};
	}

	function getConnectionType(_: CanvasConnection): string {
		return 'canvas-edge';
	}

	function getConnectionLabel(connection: CanvasConnection): string {
		const fromNode = nodes.value.find((node) => node.name === connection.data?.fromNodeName);

		if (!fromNode) {
			return '';
		}

		if (nodePinnedDataById.value[fromNode.id]) {
			const pinnedDataCount = nodePinnedDataById.value[fromNode.id]?.length ?? 0;
			return i18n.baseText('ndv.output.items', {
				adjustToNumber: pinnedDataCount,
				interpolate: { count: String(pinnedDataCount) },
			});
		} else if (nodeExecutionRunDataById.value[fromNode.id]) {
			const runDataCount = nodeExecutionRunDataById.value[fromNode.id]?.length ?? 0;
			return i18n.baseText('ndv.output.items', {
				adjustToNumber: runDataCount,
				interpolate: { count: String(runDataCount) },
			});
		}

		return '';
	}

	return {
		connections: mappedConnections,
		nodes: mappedNodes,
	};
}
