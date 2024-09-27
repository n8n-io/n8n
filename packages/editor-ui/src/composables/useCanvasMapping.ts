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
	CanvasNodeDefaultRenderLabelSize,
	CanvasNodeStickyNoteRender,
	ExecutionOutputMap,
} from '@/types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import {
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtilsV2';
import type {
	ExecutionStatus,
	ExecutionSummary,
	IConnections,
	INodeExecutionData,
	ITaskData,
	Workflow,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { CUSTOM_API_CALL_KEY, STICKY_NODE_TYPE, WAIT_TIME_UNLIMITED } from '@/constants';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { MarkerType } from '@vue-flow/core';
import { useNodeHelpers } from './useNodeHelpers';

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
	const nodeHelpers = useNodeHelpers();

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
				inputs: {
					labelSize: nodeInputLabelSizeById.value[node.id],
				},
				outputs: {
					labelSize: nodeOutputLabelSizeById.value[node.id],
				},
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

	const nodeSubtitleById = computed(() => {
		return nodes.value.reduce<Record<string, string>>((acc, node) => {
			try {
				const nodeTypeDescription = nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (!nodeTypeDescription) {
					return acc;
				}

				const nodeSubtitle =
					nodeHelpers.getNodeSubtitle(node, nodeTypeDescription, workflowObject.value) ?? '';
				if (nodeSubtitle.includes(CUSTOM_API_CALL_KEY)) {
					return acc;
				}

				acc[node.id] = nodeSubtitle;
			} catch (e) {}

			return acc;
		}, {});
	});

	const nodeInputsById = computed(() =>
		nodes.value.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			const workflowObjectNode = workflowObject.value.getNode(node.name);

			acc[node.id] =
				workflowObjectNode && nodeTypeDescription
					? mapLegacyEndpointsToCanvasConnectionPort(
							NodeHelpers.getNodeInputs(
								workflowObject.value,
								workflowObjectNode,
								nodeTypeDescription,
							),
							nodeTypeDescription.inputNames ?? [],
						)
					: [];

			return acc;
		}, {}),
	);

	function getLabelSize(label: string = ''): number {
		if (label.length <= 2) {
			return 0;
		} else if (label.length <= 6) {
			return 1;
		} else {
			return 2;
		}
	}

	function getMaxNodePortsLabelSize(
		ports: CanvasConnectionPort[],
	): CanvasNodeDefaultRenderLabelSize {
		const labelSizes: CanvasNodeDefaultRenderLabelSize[] = ['small', 'medium', 'large'];
		const labelSizeIndexes = ports.reduce<number[]>(
			(sizeAcc, input) => {
				if (input.type === NodeConnectionType.Main) {
					sizeAcc.push(getLabelSize(input.label ?? ''));
				}

				return sizeAcc;
			},
			[0],
		);

		return labelSizes[Math.max(...labelSizeIndexes)];
	}

	const nodeInputLabelSizeById = computed(() =>
		nodes.value.reduce<Record<string, CanvasNodeDefaultRenderLabelSize>>((acc, node) => {
			acc[node.id] = getMaxNodePortsLabelSize(nodeInputsById.value[node.id]);
			return acc;
		}, {}),
	);

	const nodeOutputLabelSizeById = computed(() =>
		nodes.value.reduce<Record<string, CanvasNodeDefaultRenderLabelSize>>((acc, node) => {
			acc[node.id] = getMaxNodePortsLabelSize(nodeOutputsById.value[node.id]);
			return acc;
		}, {}),
	);

	const nodeOutputsById = computed(() =>
		nodes.value.reduce<Record<string, CanvasConnectionPort[]>>((acc, node) => {
			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			const workflowObjectNode = workflowObject.value.getNode(node.name);

			acc[node.id] =
				workflowObjectNode && nodeTypeDescription
					? mapLegacyEndpointsToCanvasConnectionPort(
							NodeHelpers.getNodeOutputs(
								workflowObject.value,
								workflowObjectNode,
								nodeTypeDescription,
							),
							nodeTypeDescription.outputNames ?? [],
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

	const nodeExecutionRunDataOutputMapById = computed(() =>
		Object.keys(nodeExecutionRunDataById.value).reduce<Record<string, ExecutionOutputMap>>(
			(acc, nodeId) => {
				acc[nodeId] = {};

				const outputData = { iterations: 0, total: 0 };
				for (const runIteration of nodeExecutionRunDataById.value[nodeId] ?? []) {
					const data = runIteration.data ?? {};

					for (const connectionType of Object.keys(data)) {
						const connectionTypeData = data[connectionType] ?? {};
						acc[nodeId][connectionType] = acc[nodeId][connectionType] ?? {};

						for (const outputIndex of Object.keys(connectionTypeData)) {
							const parsedOutputIndex = parseInt(outputIndex, 10);
							const connectionTypeOutputIndexData = connectionTypeData[parsedOutputIndex] ?? [];

							acc[nodeId][connectionType][outputIndex] = acc[nodeId][connectionType][
								outputIndex
							] ?? { ...outputData };
							acc[nodeId][connectionType][outputIndex].iterations += 1;
							acc[nodeId][connectionType][outputIndex].total +=
								connectionTypeOutputIndexData.length;
						}
					}
				}

				return acc;
			},
			{},
		),
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
				subtitle: nodeSubtitleById.value[node.id] ?? '',
				type: node.type,
				typeVersion: node.typeVersion,
				disabled: node.disabled,
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
					outputMap: nodeExecutionRunDataOutputMapById.value[node.id],
					iterations: nodeExecutionRunDataById.value[node.id]?.length ?? 0,
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
					markerEnd: MarkerType.ArrowClosed,
				};
			},
		);
	});

	function getConnectionData(connection: CanvasConnection): CanvasConnectionData {
		const fromNode = nodes.value.find((node) => node.name === connection.data?.fromNodeName);

		let status: CanvasConnectionData['status'];
		if (fromNode) {
			const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);
			const runDataTotal =
				nodeExecutionRunDataOutputMapById.value[fromNode.id]?.[type]?.[index]?.total ?? 0;

			if (nodeExecutionRunningById.value[fromNode.id]) {
				status = 'running';
			} else if (
				nodePinnedDataById.value[fromNode.id] &&
				nodeExecutionRunDataById.value[fromNode.id]
			) {
				status = 'pinned';
			} else if (nodeHasIssuesById.value[fromNode.id]) {
				status = 'error';
			} else if (runDataTotal > 0) {
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
			const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);
			const runDataTotal =
				nodeExecutionRunDataOutputMapById.value[fromNode.id]?.[type]?.[index]?.total ?? 0;

			return i18n.baseText('ndv.output.items', {
				adjustToNumber: runDataTotal,
				interpolate: { count: String(runDataTotal) },
			});
		}

		return '';
	}

	return {
		nodeExecutionRunDataOutputMapById,
		connections: mappedConnections,
		nodes: mappedNodes,
	};
}
