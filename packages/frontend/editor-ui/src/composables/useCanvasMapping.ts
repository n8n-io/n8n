/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { Ref } from 'vue';
import { computed } from 'vue';
import type {
	BoundingBox,
	CanvasConnection,
	CanvasConnectionData,
	CanvasConnectionPort,
	CanvasNode,
	CanvasNodeAddNodesRender,
	CanvasNodeAIPromptRender,
	CanvasNodeData,
	CanvasNodeDefaultRender,
	CanvasNodeDefaultRenderLabelSize,
	CanvasNodeStickyNoteRender,
	ExecutionOutputMap,
} from '@/types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import {
	checkOverlap,
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtils';
import type {
	ExecutionStatus,
	ExecutionSummary,
	IConnections,
	INodeExecutionData,
	INodeTypeDescription,
	ITaskData,
	Workflow,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	NodeHelpers,
	SEND_AND_WAIT_OPERATION,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	CUSTOM_API_CALL_KEY,
	FORM_NODE_TYPE,
	SIMULATE_NODE_TYPE,
	SIMULATE_TRIGGER_NODE_TYPE,
	STICKY_NODE_TYPE,
	WAIT_NODE_TYPE,
} from '@/constants';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { MarkerType } from '@vue-flow/core';
import { useNodeHelpers } from './useNodeHelpers';
import { getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { getNodeIconSource } from '../utils/nodeIcon';
import * as workflowUtils from 'n8n-workflow/common';

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
	const { dirtinessByName } = useNodeDirtiness();

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
	function createAIPromptRenderType(): CanvasNodeAIPromptRender {
		return {
			type: CanvasNodeRenderType.AIPrompt,
			options: {},
		};
	}

	function createDefaultNodeRenderType(node: INodeUi): CanvasNodeDefaultRender {
		const nodeType = nodeTypeDescriptionByNodeId.value[node.id];
		const icon = getNodeIconSource(
			simulatedNodeTypeDescriptionByNodeId.value[node.id]
				? simulatedNodeTypeDescriptionByNodeId.value[node.id]
				: nodeType,
		);

		return {
			type: CanvasNodeRenderType.Default,
			options: {
				trigger: isTriggerNodeById.value[node.id],
				configuration: nodeTypesStore.isConfigNode(workflowObject.value, node, node.type),
				configurable: nodeTypesStore.isConfigurableNode(workflowObject.value, node, node.type),
				inputs: {
					labelSize: nodeInputLabelSizeById.value[node.id],
				},
				outputs: {
					labelSize: nodeOutputLabelSizeById.value[node.id],
				},
				tooltip: nodeTooltipById.value[node.id],
				dirtiness: dirtinessByName.value[node.name],
				icon,
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
					case `${CanvasNodeRenderType.AIPrompt}`:
						acc[node.id] = createAIPromptRenderType();
						break;
					default:
						acc[node.id] = createDefaultNodeRenderType(node);
				}

				return acc;
			}, {}) ?? {},
	);

	const nodeTypeDescriptionByNodeId = computed(() =>
		nodes.value.reduce<Record<string, INodeTypeDescription | null>>((acc, node) => {
			acc[node.id] = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			return acc;
		}, {}),
	);

	const isTriggerNodeById = computed(() =>
		nodes.value.reduce<Record<string, boolean>>((acc, node) => {
			acc[node.id] = nodeTypesStore.isTriggerNode(node.type);
			return acc;
		}, {}),
	);

	const nodeSubtitleById = computed(() => {
		return nodes.value.reduce<Record<string, string>>((acc, node) => {
			try {
				const nodeTypeDescription = nodeTypeDescriptionByNodeId.value[node.id];
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
			const nodeTypeDescription = nodeTypeDescriptionByNodeId.value[node.id];
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
				if (input.type === NodeConnectionTypes.Main) {
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
			const nodeTypeDescription = nodeTypeDescriptionByNodeId.value[node.id];
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

	const nodeTooltipById = computed(() => {
		if (!workflowsStore.isWorkflowRunning) {
			return {};
		}

		const activeTriggerNodeCount = nodes.value.filter(
			(node) => isTriggerNodeById.value[node.id] && !node.disabled,
		).length;
		const triggerNodeName = workflowsStore.getWorkflowExecution?.triggerNode;

		// For workflows with multiple active trigger nodes, we show a tooltip only when
		// trigger node name is known
		if (triggerNodeName === undefined && activeTriggerNodeCount !== 1) {
			return {};
		}

		return nodes.value.reduce<Record<string, string | undefined>>((acc, node) => {
			const nodeTypeDescription = nodeTypeDescriptionByNodeId.value[node.id];
			if (nodeTypeDescription && isTriggerNodeById.value[node.id]) {
				if (
					!!node.disabled ||
					(triggerNodeName !== undefined && triggerNodeName !== node.name) ||
					!['new', 'unknown', 'waiting'].includes(nodeExecutionStatusById.value[node.id])
				) {
					return acc;
				}

				if ('eventTriggerDescription' in nodeTypeDescription) {
					const nodeName = i18n.shortNodeType(nodeTypeDescription.name);
					const { eventTriggerDescription } = nodeTypeDescription;
					acc[node.id] = i18n
						.nodeText(nodeTypeDescription.name)
						.eventTriggerDescription(nodeName, eventTriggerDescription ?? '');
				} else {
					acc[node.id] = i18n.baseText('node.waitingForYouToCreateAnEventIn', {
						interpolate: {
							nodeType: nodeTypeDescription ? getTriggerNodeServiceName(nodeTypeDescription) : '',
						},
					});
				}
			}

			return acc;
		}, {});
	});

	const nodeExecutionRunningById = computed(() =>
		nodes.value.reduce<Record<string, boolean>>((acc, node) => {
			acc[node.id] = workflowsStore.isNodeExecuting(node.name);
			return acc;
		}, {}),
	);

	const nodeExecutionWaitingForNextById = computed(() =>
		nodes.value.reduce<Record<string, boolean>>((acc, node) => {
			acc[node.id] =
				node.name === workflowsStore.lastAddedExecutingNode &&
				workflowsStore.executingNode.length === 0 &&
				workflowsStore.isWorkflowRunning;

			return acc;
		}, {}),
	);

	const nodeExecutionStatusById = computed(() =>
		nodes.value.reduce<Record<string, ExecutionStatus>>((acc, node) => {
			const tasks = workflowsStore.getWorkflowRunData?.[node.name] ?? [];

			acc[node.id] = tasks.at(-1)?.executionStatus ?? 'new';
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
				issues.push(...nodeHelpers.nodeIssuesToString(node.issues, node));
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
			} else if (node.issues && nodeHelpers.nodeIssuesToString(node.issues, node).length) {
				acc[node.id] = true;
			} else {
				const tasks = workflowsStore.getWorkflowRunData?.[node.name] ?? [];

				acc[node.id] = Boolean(tasks.at(-1)?.error);
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
					workflowExecution?.waitTill &&
					!workflowExecution?.finished
				) {
					if (
						node &&
						node.type === WAIT_NODE_TYPE &&
						['webhook', 'form'].includes(node.parameters.resume as string)
					) {
						acc[node.id] =
							node.parameters.resume === 'webhook'
								? i18n.baseText('node.theNodeIsWaitingWebhookCall')
								: i18n.baseText('node.theNodeIsWaitingFormCall');
						return acc;
					}

					if (node?.parameters.operation === SEND_AND_WAIT_OPERATION) {
						acc[node.id] = i18n.baseText('node.theNodeIsWaitingUserInput');
						return acc;
					}

					if (node?.type === FORM_NODE_TYPE) {
						acc[node.id] = i18n.baseText('node.theNodeIsWaitingFormCall');
						return acc;
					}

					const waitDate = new Date(workflowExecution.waitTill);

					if (waitDate.getTime() === WAIT_INDEFINITELY.getTime()) {
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
		type StickyNoteBoundingBox = BoundingBox & {
			id: string;
			area: number;
			zIndex: number;
		};

		const stickyNodeBaseZIndex = -100;

		const stickyNodeBoundingBoxes = nodes.value.reduce<StickyNoteBoundingBox[]>((acc, node) => {
			if (node.type === STICKY_NODE_TYPE) {
				const x = node.position[0];
				const y = node.position[1];
				const width = node.parameters.width as number;
				const height = node.parameters.height as number;

				acc.push({
					id: node.id,
					x,
					y,
					width,
					height,
					area: width * height,
					zIndex: stickyNodeBaseZIndex,
				});
			}

			return acc;
		}, []);

		const sortedStickyNodeBoundingBoxes = stickyNodeBoundingBoxes.sort((a, b) => b.area - a.area);
		sortedStickyNodeBoundingBoxes.forEach((node, index) => {
			node.zIndex = stickyNodeBaseZIndex + index;
		});

		for (let i = 0; i < sortedStickyNodeBoundingBoxes.length; i++) {
			const node1 = sortedStickyNodeBoundingBoxes[i];
			for (let j = i + 1; j < sortedStickyNodeBoundingBoxes.length; j++) {
				const node2 = sortedStickyNodeBoundingBoxes[j];
				if (checkOverlap(node1, node2)) {
					if (node1.area < node2.area && node1.zIndex <= node2.zIndex) {
						// Ensure node1 (smaller area) has a higher zIndex than node2 (larger area)
						node1.zIndex = node2.zIndex + 1;
					} else if (node2.area < node1.area && node2.zIndex <= node1.zIndex) {
						// Ensure node2 (smaller area) has a higher zIndex than node1 (larger area)
						node2.zIndex = node1.zIndex + 1;
					}
				}
			}
		}

		return sortedStickyNodeBoundingBoxes.reduce<Record<string, Partial<CanvasNode>>>(
			(acc, node) => {
				acc[node.id] = {
					style: {
						zIndex: node.zIndex,
					},
				};

				return acc;
			},
			{},
		);
	});

	const simulatedNodeTypeDescriptionByNodeId = computed(() => {
		return nodes.value.reduce<Record<string, INodeTypeDescription | null>>((acc, node) => {
			if ([SIMULATE_NODE_TYPE, SIMULATE_TRIGGER_NODE_TYPE].includes(node.type)) {
				const icon = node.parameters?.icon as string;
				const iconValue = workflowObject.value.expression.getSimpleParameterValue(
					node,
					icon,
					'internal',
					{},
				);

				if (iconValue && typeof iconValue === 'string') {
					acc[node.id] = nodeTypesStore.getNodeType(iconValue);
				}
			}

			return acc;
		}, {});
	});

	const mappedNodes = computed<CanvasNode[]>(() => {
		const connectionsBySourceNode = connections.value;
		const connectionsByDestinationNode =
			workflowUtils.mapConnectionsByDestination(connectionsBySourceNode);

		return [
			...nodes.value.map<CanvasNode>((node) => {
				const outputConnections = connectionsBySourceNode[node.name] ?? {};
				const inputConnections = connectionsByDestinationNode[node.name] ?? {};

				// console.log(node.name, nodeInputsById.value[node.id]);

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
						waitingForNext: nodeExecutionWaitingForNextById.value[node.id],
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
					draggable: node.draggable ?? true,
				};
			}),
		];
	});

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
					markerEnd: MarkerType.ArrowClosed,
				};
			},
		);
	});

	function getConnectionData(connection: CanvasConnection): CanvasConnectionData {
		const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);
		const runDataTotal =
			nodeExecutionRunDataOutputMapById.value[connection.source]?.[type]?.[index]?.total ?? 0;

		let status: CanvasConnectionData['status'];
		if (nodeExecutionRunningById.value[connection.source]) {
			status = 'running';
		} else if (
			nodePinnedDataById.value[connection.source] &&
			nodeExecutionRunDataById.value[connection.source]
		) {
			status = 'pinned';
		} else if (nodeHasIssuesById.value[connection.source]) {
			status = 'error';
		} else if (runDataTotal > 0) {
			status = 'success';
		}

		const maxConnections = [
			...nodeInputsById.value[connection.source],
			...nodeInputsById.value[connection.target],
		]
			.filter((port) => port.type === type)
			.reduce<number | undefined>((acc, port) => {
				if (port.maxConnections === undefined) {
					return acc;
				}

				return Math.min(acc ?? Infinity, port.maxConnections);
			}, undefined);

		return {
			...(connection.data as CanvasConnectionData),
			...(maxConnections ? { maxConnections } : {}),
			status,
		};
	}

	function getConnectionType(_: CanvasConnection): string {
		return 'canvas-edge';
	}

	function getConnectionLabel(connection: CanvasConnection): string {
		const fromNode = nodes.value.find((node) => node.name === connection.data?.source.node);
		if (!fromNode) {
			return '';
		}

		if (nodePinnedDataById.value[fromNode.id]) {
			const pinnedDataCount = nodePinnedDataById.value[fromNode.id]?.length ?? 0;
			return pinnedDataCount > 0
				? i18n.baseText('ndv.output.items', {
						adjustToNumber: pinnedDataCount,
						interpolate: { count: String(pinnedDataCount) },
					})
				: '';
		} else if (nodeExecutionRunDataById.value[fromNode.id]) {
			const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);
			const runDataTotal =
				nodeExecutionRunDataOutputMapById.value[fromNode.id]?.[type]?.[index]?.total ?? 0;

			return runDataTotal > 0
				? i18n.baseText('ndv.output.items', {
						adjustToNumber: runDataTotal,
						interpolate: { count: String(runDataTotal) },
					})
				: '';
		}

		return '';
	}

	return {
		additionalNodePropertiesById,
		nodeExecutionRunDataOutputMapById,
		nodeExecutionWaitingForNextById,
		nodeIssuesById,
		nodeHasIssuesById,
		connections: mappedConnections,
		nodes: mappedNodes,
	};
}
