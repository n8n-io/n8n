/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { CanvasRenderData } from '../canvas.utils';
import type { Ref } from 'vue';
import { ref, computed } from 'vue';
import type {
	BoundingBox,
	CanvasConnection,
	CanvasConnectionData,
	CanvasNode,
	CanvasNodeAddNodesRender,
	CanvasNodeChoicePromptRender,
	CanvasNodeData,
	CanvasNodeDefaultRender,
	CanvasNodeStickyNoteRender,
	CollapsedGroupAnchor,
	ExecutionOutputMap,
} from '../canvas.types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../canvas.types';
import {
	checkOverlap,
	createCanvasConnectionId,
	mapLegacyConnectionsToCanvasConnections,
	parseCanvasConnectionHandleString,
} from '../canvas.utils';
import type {
	ExecutionStatus,
	ExecutionSummary,
	IConnections,
	INodeExecutionData,
	INodeTypeDescription,
	ITaskData,
} from 'n8n-workflow';
import { NodeConnectionTypes, SEND_AND_WAIT_OPERATION, WAIT_INDEFINITELY } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	CANVAS_EXECUTION_DATA_THROTTLE_DURATION,
	CUSTOM_API_CALL_KEY,
	FORM_NODE_TYPE,
	SIMULATE_NODE_TYPE,
	SIMULATE_TRIGGER_NODE_TYPE,
	STICKY_NODE_TYPE,
	WAIT_NODE_TYPE,
} from '@/app/constants';
import { MarkerType } from '@vue-flow/core';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { getTriggerNodeServiceName } from '@/app/utils/nodeTypesUtils';
import { useNodeDirtiness } from '@/app/composables/useNodeDirtiness';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import * as workflowUtils from 'n8n-workflow/common';
import { throttledWatch } from '@vueuse/core';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import type { WorkflowObjectAccessors } from '@/app/types';
import type { Offset, Rect } from './computeDisplacements';

const ZERO_OFFSET: Offset = { dx: 0, dy: 0 };

export interface CollapsedGroupBox {
	id: string;
	title: string;
	rect: Rect;
	memberIds: string[];
}

export const COLLAPSED_GROUP_NODE_ID_PREFIX = 'collapsed-group:';

export function collapsedHandleId(
	side: 'in' | 'out',
	memberNodeId: string,
	originalHandle: string,
): string {
	return `collapsed:${side}:${memberNodeId}:${originalHandle}`;
}

export function parseCollapsedHandleId(
	handleId: string,
): { side: 'in' | 'out'; memberNodeId: string; originalHandle: string } | undefined {
	if (!handleId.startsWith('collapsed:')) return undefined;
	const rest = handleId.slice('collapsed:'.length);
	const firstColon = rest.indexOf(':');
	if (firstColon < 0) return undefined;
	const side = rest.slice(0, firstColon);
	if (side !== 'in' && side !== 'out') return undefined;
	const afterSide = rest.slice(firstColon + 1);
	const secondColon = afterSide.indexOf(':');
	if (secondColon < 0) return undefined;
	const memberNodeId = afterSide.slice(0, secondColon);
	const originalHandle = afterSide.slice(secondColon + 1);
	return { side, memberNodeId, originalHandle };
}

export function useCanvasMapping({
	nodes,
	connections,
	workflowObject,
	renderData,
	getRenderedOffset,
	isNodeHidden,
	collapsedBoxes,
}: {
	nodes: Ref<INodeUi[]>;
	connections: Ref<IConnections>;
	workflowObject: Ref<WorkflowObjectAccessors>;
	renderData: Ref<CanvasRenderData>;
	getRenderedOffset?: (nodeId: string) => Offset;
	isNodeHidden?: (nodeId: string) => boolean;
	collapsedBoxes?: Ref<CollapsedGroupBox[]>;
}) {
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowState = injectWorkflowState();
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

	function createChoicePromptRenderType(): CanvasNodeChoicePromptRender {
		return {
			type: CanvasNodeRenderType.ChoicePrompt,
			options: {},
		};
	}

	function createDefaultNodeRenderType(node: INodeUi): CanvasNodeDefaultRender {
		const nodeType = nodeTypeDescriptionByNodeId.value[node.id];
		const source = simulatedNodeTypeDescriptionByNodeId.value[node.id] ?? nodeType ?? node.type;
		const icon = getNodeIconSource(
			source,
			node,
			workflowDocumentStore.value.getExpressionHandler(),
		);

		return {
			type: CanvasNodeRenderType.Default,
			options: {
				trigger: isTriggerNodeById.value[node.id],
				configuration: nodeTypesStore.isConfigNode(workflowObject.value, node, node.type),
				configurable: nodeTypesStore.isConfigurableNode(
					workflowObject.value,
					node,
					node.type,
					node.typeVersion,
				),
				tooltip: nodeTooltipById.value[node.id],
				dirtiness: dirtinessByName.value[node.name],
				icon,
				placeholder: node.placeholder,
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
					case `${CanvasNodeRenderType.ChoicePrompt}`:
						acc[node.id] = createChoicePromptRenderType();
						break;
					default:
						acc[node.id] = createDefaultNodeRenderType(node);
				}

				return acc;
			}, {}) ?? {},
	);

	const nodeTypeDescriptionByNodeId = computed(() =>
		nodes.value.reduce<Record<string, INodeTypeDescription | null>>((acc, node) => {
			acc[node.id] =
				nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
				nodeTypesStore.communityNodeType(node.type)?.nodeDescription ??
				null;
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

	const nodePinnedDataById = computed(() =>
		nodes.value.reduce<Record<string, INodeExecutionData[] | undefined>>((acc, node) => {
			acc[node.id] = workflowDocumentStore.value.getNodePinData(node.name);
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
					!['new', 'unknown', 'waiting'].includes(nodeExecutionStatusById.value[node.id]) ||
					nodePinnedDataById.value[node.id]
				) {
					return acc;
				}

				if (typeof nodeTypeDescription.eventTriggerDescription === 'string') {
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
			acc[node.id] = workflowState.executingNode.isNodeExecuting(node.name);
			return acc;
		}, {}),
	);

	const nodeExecutionWaitingForNextById = computed(() =>
		nodes.value.reduce<Record<string, boolean>>((acc, node) => {
			acc[node.id] =
				node.name === workflowState.executingNode.lastAddedExecutingNode &&
				workflowState.executingNode.executingNode.length === 0 &&
				workflowsStore.isWorkflowRunning;

			return acc;
		}, {}),
	);

	const nodeExecutionStatusById = computed(() =>
		nodes.value.reduce<Record<string, ExecutionStatus>>((acc, node) => {
			const tasks = workflowsStore.getWorkflowRunData?.[node.name] ?? [];

			let lastExecutionStatus = tasks.at(-1)?.executionStatus;
			if (tasks.length > 1 && lastExecutionStatus === 'canceled') {
				lastExecutionStatus = tasks.at(-2)?.executionStatus;
			}
			acc[node.id] = lastExecutionStatus ?? 'new';
			return acc;
		}, {}),
	);

	const nodeExecutionRunDataById = computed(() =>
		nodes.value.reduce<Record<string, ITaskData[] | null>>((acc, node) => {
			acc[node.id] = workflowsStore.getWorkflowResultDataByNodeName(node.name);
			return acc;
		}, {}),
	);

	// Create a map for O(1) node lookups by name
	const nodesByName = computed(() => new Map(nodes.value.map((n) => [n.name, n])));

	const nodeExecutionRunDataOutputMapById = ref<Record<string, ExecutionOutputMap>>({});

	throttledWatch(
		() => workflowsStore.workflowExecutionResultDataLastUpdate,
		() => {
			nodeExecutionRunDataOutputMapById.value = Object.keys(nodeExecutionRunDataById.value).reduce<
				Record<string, ExecutionOutputMap>
			>((acc, nodeId) => {
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
							] ?? {
								...outputData,
								...(connectionType !== NodeConnectionTypes.Main ? { byTarget: {} } : {}),
							};
							// For non-main connections, check if items are wrapped in a response field
							// (common for AI nodes like embeddings, tools, etc.)
							// Note: We check only the first item assuming uniform structure across all items
							let itemCount = connectionTypeOutputIndexData.length;
							if (
								connectionType !== NodeConnectionTypes.Main &&
								connectionTypeOutputIndexData.length > 0
							) {
								const firstItem = connectionTypeOutputIndexData[0];
								// AI nodes typically wrap all items uniformly in response field
								if (
									firstItem?.json &&
									typeof firstItem.json === 'object' &&
									'response' in firstItem.json &&
									Array.isArray(firstItem.json.response)
								) {
									// Use response array length for all items (assuming uniform structure)
									itemCount = firstItem.json.response.length;
								}
							}

							if (runIteration.executionStatus !== 'canceled') {
								acc[nodeId][connectionType][outputIndex].iterations += 1;
							}
							acc[nodeId][connectionType][outputIndex].total += itemCount;

							// For non-main connections, track per-target execution counts
							if (connectionType !== NodeConnectionTypes.Main) {
								const callingNodeName = runIteration.source?.[0]?.previousNode;
								if (callingNodeName) {
									const callingNode = nodesByName.value.get(callingNodeName);
									if (callingNode) {
										const targetId = callingNode.id;
										const outputEntry = acc[nodeId][connectionType][outputIndex];

										if (outputEntry.byTarget) {
											if (!outputEntry.byTarget[targetId]) {
												outputEntry.byTarget[targetId] = {
													total: 0,
													iterations: 0,
												};
											}

											if (runIteration.executionStatus !== 'canceled') {
												outputEntry.byTarget[targetId].iterations += 1;
											}
											outputEntry.byTarget[targetId].total += itemCount;
										}
									}
								}
							}
						}
					}
				}

				return acc;
			}, {});
		},
		{ throttle: CANVAS_EXECUTION_DATA_THROTTLE_DURATION, immediate: true },
	);

	const nodeValidationErrorsById = computed(() =>
		nodes.value.reduce<Record<string, string[]>>((acc, node) => {
			const validationErrors: string[] = [];

			if (node?.issues !== undefined) {
				validationErrors.push(...nodeHelpers.nodeIssuesToString(node.issues, node));
			}

			acc[node.id] = validationErrors;

			return acc;
		}, {}),
	);

	const nodeHasIssuesById = computed(() =>
		nodes.value.reduce<Record<string, boolean>>((acc, node) => {
			const hasExecutionErrors =
				(renderData.value.executionIssuesByNodeName.get(node.name)?.value?.length ?? 0) > 0;
			const hasValidationErrors = nodeValidationErrorsById.value[node.id]?.length > 0;

			if (['crashed', 'error'].includes(nodeExecutionStatusById.value[node.id])) {
				acc[node.id] = true;
			} else if (nodePinnedDataById.value[node.id]) {
				acc[node.id] = false;
			} else if (hasValidationErrors) {
				acc[node.id] = true;
			} else if (hasExecutionErrors) {
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

						return acc;
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

	function filterOutCanceled(tasks: ITaskData[] | null): ITaskData[] | null {
		if (!tasks) {
			return null;
		}

		return tasks.filter((task) => task.executionStatus !== 'canceled');
	}

	const executionOrderByNodeId = computed<Map<string, number>>(() => {
		const order = new Map<string, number>();
		const allNodes = nodes.value;
		if (allNodes.length === 0) return order;

		const incoming = workflowUtils.mapConnectionsByDestination(connections.value);
		const nodeByName = new Map(allNodes.map((n) => [n.name, n]));
		const visited = new Set<string>();
		let counter = 0;

		const roots: string[] = [];
		for (const node of allNodes) {
			const inboundMain = incoming[node.name]?.main;
			const hasIncoming = inboundMain?.some((slot) => (slot?.length ?? 0) > 0);
			if (!hasIncoming) roots.push(node.name);
		}

		const queue: string[] = [...roots];
		while (queue.length > 0) {
			const name = queue.shift() as string;
			if (visited.has(name)) continue;
			visited.add(name);
			const node = nodeByName.get(name);
			if (node) order.set(node.id, counter++);

			const out = connections.value[name];
			if (!out?.main) continue;
			for (const slot of out.main) {
				for (const conn of slot ?? []) {
					if (conn?.node && !visited.has(conn.node)) queue.push(conn.node);
				}
			}
		}

		for (const node of allNodes) {
			if (!order.has(node.id)) order.set(node.id, counter++);
		}
		return order;
	});

	const collapsedContext = computed(() => {
		const boxes = collapsedBoxes?.value ?? [];
		const anchorsByGroup = new Map<
			string,
			{ inputAnchors: CollapsedGroupAnchor[]; outputAnchors: CollapsedGroupAnchor[] }
		>();
		const memberToGroup = new Map<string, string>();
		if (boxes.length === 0) {
			return { anchorsByGroup, memberToGroup };
		}

		for (const box of boxes) {
			anchorsByGroup.set(box.id, { inputAnchors: [], outputAnchors: [] });
			for (const memberId of box.memberIds) {
				memberToGroup.set(memberId, box.id);
			}
		}

		const allCanvasConnections = mapLegacyConnectionsToCanvasConnections(
			connections.value ?? [],
			nodes.value ?? [],
		);

		const seenIn = new Map<string, Set<string>>();
		const seenOut = new Map<string, Set<string>>();
		for (const box of boxes) {
			seenIn.set(box.id, new Set());
			seenOut.set(box.id, new Set());
		}

		for (const conn of allCanvasConnections) {
			const sourceGroup = memberToGroup.get(conn.source);
			const targetGroup = memberToGroup.get(conn.target);
			if (!sourceGroup && !targetGroup) continue;
			if (sourceGroup && targetGroup && sourceGroup === targetGroup) continue;

			if (sourceGroup) {
				const memberHandle = conn.sourceHandle ?? '';
				const handle = collapsedHandleId('out', conn.source, memberHandle);
				const seen = seenOut.get(sourceGroup) as Set<string>;
				if (!seen.has(handle)) {
					seen.add(handle);
					(
						anchorsByGroup.get(sourceGroup) as { outputAnchors: CollapsedGroupAnchor[] }
					).outputAnchors.push({
						handle,
						memberNodeId: conn.source,
						memberHandle,
						connectionType: conn.data?.source?.type ?? NodeConnectionTypes.Main,
					});
				}
			}
			if (targetGroup) {
				const memberHandle = conn.targetHandle ?? '';
				const handle = collapsedHandleId('in', conn.target, memberHandle);
				const seen = seenIn.get(targetGroup) as Set<string>;
				if (!seen.has(handle)) {
					seen.add(handle);
					(
						anchorsByGroup.get(targetGroup) as { inputAnchors: CollapsedGroupAnchor[] }
					).inputAnchors.push({
						handle,
						memberNodeId: conn.target,
						memberHandle,
						connectionType: conn.data?.target?.type ?? NodeConnectionTypes.Main,
					});
				}
			}
		}

		const execOrder = executionOrderByNodeId.value;
		const sortAnchors = (a: CollapsedGroupAnchor, b: CollapsedGroupAnchor) => {
			const oa = execOrder.get(a.memberNodeId) ?? Number.POSITIVE_INFINITY;
			const ob = execOrder.get(b.memberNodeId) ?? Number.POSITIVE_INFINITY;
			if (oa !== ob) return oa - ob;
			return a.memberHandle.localeCompare(b.memberHandle);
		};

		for (const a of anchorsByGroup.values()) {
			a.inputAnchors.sort(sortAnchors);
			a.outputAnchors.sort(sortAnchors);
		}

		return { anchorsByGroup, memberToGroup };
	});

	const mappedNodes = computed<CanvasNode[]>(() => {
		const connectionsBySourceNode = connections.value;
		const connectionsByDestinationNode =
			workflowUtils.mapConnectionsByDestination(connectionsBySourceNode);

		const result: CanvasNode[] = [];
		for (const node of nodes.value) {
			if (isNodeHidden?.(node.id)) continue;

			const outputConnections = connectionsBySourceNode[node.name] ?? {};
			const inputConnections = connectionsByDestinationNode[node.name] ?? {};

			const data: CanvasNodeData = {
				id: node.id,
				name: node.name,
				subtitle: nodeSubtitleById.value[node.id] ?? '',
				type: node.type,
				typeVersion: node.typeVersion,
				disabled: node.disabled,
				connections: {
					[CanvasConnectionMode.Input]: inputConnections,
					[CanvasConnectionMode.Output]: outputConnections,
				},
				issues: {
					validation: nodeValidationErrorsById.value[node.id],
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
					iterations: filterOutCanceled(nodeExecutionRunDataById.value[node.id])?.length ?? 0,
					visible: !!nodeExecutionRunDataById.value[node.id],
				},
				render: renderTypeByNodeId.value[node.id] ?? { type: 'default', options: {} },
			};

			const offset = getRenderedOffset?.(node.id) ?? ZERO_OFFSET;
			result.push({
				id: node.id,
				label: node.name,
				type: 'canvas-node',
				position: { x: node.position[0] + offset.dx, y: node.position[1] + offset.dy },
				data,
				...additionalNodePropertiesById.value[node.id],
				draggable: node.draggable,
			});
		}

		const ctx = collapsedContext.value;
		for (const box of collapsedBoxes?.value ?? []) {
			const anchors = ctx.anchorsByGroup.get(box.id) ?? {
				inputAnchors: [],
				outputAnchors: [],
			};
			result.push({
				id: `${COLLAPSED_GROUP_NODE_ID_PREFIX}${box.id}`,
				label: box.title,
				type: 'canvas-node',
				position: { x: box.rect.x, y: box.rect.y },
				data: {
					id: `${COLLAPSED_GROUP_NODE_ID_PREFIX}${box.id}`,
					name: box.title,
					subtitle: '',
					type: '',
					typeVersion: 1,
					disabled: false,
					connections: {
						[CanvasConnectionMode.Input]: {},
						[CanvasConnectionMode.Output]: {},
					},
					issues: { validation: [], visible: false },
					pinnedData: { count: 0, visible: false },
					execution: { running: false },
					runData: { iterations: 0, visible: false },
					render: {
						type: CanvasNodeRenderType.CollapsedGroup,
						options: {
							groupId: box.id,
							title: box.title,
							width: box.rect.width,
							height: box.rect.height,
							inputAnchors: anchors.inputAnchors,
							outputAnchors: anchors.outputAnchors,
						},
					},
				},
				draggable: true,
			});
		}
		return result;
	});

	const mappedConnections = computed<CanvasConnection[]>(() => {
		const ctx = collapsedContext.value;
		const out: CanvasConnection[] = [];
		const raw = mapLegacyConnectionsToCanvasConnections(connections.value ?? [], nodes.value ?? []);
		for (const original of raw) {
			const sourceGroup = ctx.memberToGroup.get(original.source);
			const targetGroup = ctx.memberToGroup.get(original.target);
			if (sourceGroup && targetGroup && sourceGroup === targetGroup) continue;

			let rewritten: CanvasConnection = original;
			if (sourceGroup) {
				const source = `${COLLAPSED_GROUP_NODE_ID_PREFIX}${sourceGroup}`;
				const sourceHandle = collapsedHandleId('out', original.source, original.sourceHandle ?? '');
				rewritten = {
					...rewritten,
					source,
					sourceHandle,
					id: createCanvasConnectionId({
						source,
						sourceHandle,
						target: rewritten.target,
						targetHandle: rewritten.targetHandle ?? '',
					}),
				};
			}
			if (targetGroup) {
				const target = `${COLLAPSED_GROUP_NODE_ID_PREFIX}${targetGroup}`;
				const targetHandle = collapsedHandleId('in', original.target, original.targetHandle ?? '');
				rewritten = {
					...rewritten,
					target,
					targetHandle,
					id: createCanvasConnectionId({
						source: rewritten.source,
						sourceHandle: rewritten.sourceHandle ?? '',
						target,
						targetHandle,
					}),
				};
			}

			const type = getConnectionType(original);
			const label = getConnectionLabel(original);
			const data = getConnectionData(original);

			out.push({
				...rewritten,
				data,
				type,
				label,
				markerEnd: MarkerType.ArrowClosed,
			});
		}
		return out;
	});

	function getConnectionData(connection: CanvasConnection): CanvasConnectionData {
		const { type, index } = parseCanvasConnectionHandleString(connection.sourceHandle);
		const runData = nodeExecutionRunDataOutputMapById.value[connection.source]?.[type]?.[index];
		const runDataTotal = runData?.total ?? 0;

		const sourceTasks = nodeExecutionRunDataById.value[connection.source] ?? [];
		let lastSourceTask: ITaskData | undefined = sourceTasks[sourceTasks.length - 1];
		if (lastSourceTask?.executionStatus === 'canceled' && sourceTasks.length > 1) {
			lastSourceTask = sourceTasks[sourceTasks.length - 2];
		}

		let status: CanvasConnectionData['status'];
		if (nodeExecutionRunningById.value[connection.source] && runDataTotal === 0) {
			status = 'running';
		} else if (
			nodePinnedDataById.value[connection.source] &&
			nodeExecutionRunDataById.value[connection.source]
		) {
			status = 'pinned';
		} else if (nodeHasIssuesById.value[connection.source]) {
			status = 'error';
		} else if (runDataTotal > 0 && lastSourceTask?.executionStatus !== 'canceled') {
			// For non-main connections (model, memory, tool, etc.), only mark as executed
			// if the target node also executed, since these are passive connections
			const isMainConnection = type === NodeConnectionTypes.Main;
			const targetNodeHasAnyExecution = nodeExecutionRunDataById.value[connection.target];

			if (isMainConnection || targetNodeHasAnyExecution) {
				status = 'success';
			}
		}

		const sourceInputs = renderData.value.nodeInputsByNodeId.get(connection.source)?.value ?? [];
		const targetInputs = renderData.value.nodeInputsByNodeId.get(connection.target)?.value ?? [];
		const maxConnections = [...sourceInputs, ...targetInputs]
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
		const fromNode = nodesByName.value.get(connection.data?.source.node ?? '');
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
			const outputData = nodeExecutionRunDataOutputMapById.value[fromNode.id]?.[type]?.[index];

			// For non-main connections, use per-target data if available
			const isMainConnection = type === NodeConnectionTypes.Main;
			const targetHasExecutionData = nodeExecutionRunDataById.value[connection.target];

			if (!isMainConnection && outputData?.byTarget) {
				// Look up the target node to get per-connection counts
				const targetNodeId = connection.target;
				const targetData = outputData.byTarget[targetNodeId];

				if (targetData && targetData.total > 0 && targetHasExecutionData) {
					return i18n.baseText(
						targetData.iterations > 1 ? 'ndv.output.itemsTotal' : 'ndv.output.items',
						{
							adjustToNumber: targetData.total,
							interpolate: { count: String(targetData.total) },
						},
					);
				}

				// Target hasn't executed, show no label
				return '';
			}

			// For main connections, use aggregate counts
			const runDataTotal = outputData?.total ?? 0;
			const hasMultipleRunDataIterations = (outputData?.iterations ?? 1) > 1;

			return runDataTotal > 0 && (isMainConnection || targetHasExecutionData)
				? i18n.baseText(
						hasMultipleRunDataIterations ? 'ndv.output.itemsTotal' : 'ndv.output.items',
						{
							adjustToNumber: runDataTotal,
							interpolate: { count: String(runDataTotal) },
						},
					)
				: '';
		}

		return '';
	}

	return {
		additionalNodePropertiesById,
		nodeExecutionRunDataOutputMapById,
		nodeExecutionWaitingForNextById,
		nodeHasIssuesById,
		connections: mappedConnections,
		nodes: mappedNodes,
	};
}
