/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { Ref } from 'vue';
import { ref, computed } from 'vue';
import type {
	BoundingBox,
	CanvasConnection,
	CanvasConnectionData,
	CanvasConnectionPort,
	CanvasNode,
	CanvasNodeAddNodesRender,
	CanvasNodeChoicePromptRender,
	CanvasNodeData,
	CanvasNodeDefaultRender,
	CanvasNodeDefaultRenderLabelSize,
	CanvasNodeStickyNoteRender,
	ExecutionOutputMap,
	NodeImportance,
} from '../canvas.types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../canvas.types';
import {
	checkOverlap,
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyEndpointsToCanvasConnectionPort,
	parseCanvasConnectionHandleString,
} from '../canvas.utils';
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
	CANVAS_EXECUTION_DATA_THROTTLE_DURATION,
	CUSTOM_API_CALL_KEY,
	FORM_NODE_TYPE,
	SIMULATE_NODE_TYPE,
	SIMULATE_TRIGGER_NODE_TYPE,
	STICKY_NODE_TYPE,
	WAIT_NODE_TYPE,
} from '@/app/constants';
import { sanitizeHtml } from '@/app/utils/htmlUtils';
import { MarkerType } from '@vue-flow/core';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { getTriggerNodeServiceName } from '@/app/utils/nodeTypesUtils';
import { useNodeDirtiness } from '@/app/composables/useNodeDirtiness';
import { getNodeIconSource, type NodeIconSource } from '@/app/utils/nodeIcon';
import * as workflowUtils from 'n8n-workflow/common';
import { throttledWatch } from '@vueuse/core';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';

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
	const workflowDocumentStore = computed(() =>
		workflowsStore.workflowId
			? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
			: undefined,
	);
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

	// LLM-based semantic groups
	type StoredSemanticGroup = { name: string; description: string; nodes: string[]; color?: string };
	const llmSemanticGroups = ref<StoredSemanticGroup[]>([]);
	const summaryMode = ref(false);
	// Groups that are visually expanded (show real nodes + frame instead of card)
	const expandedGroupIds = ref(new Set<string>());
	// Stable positions for group nodes — updated after tidy-up via dagre layout results
	const groupPositions = ref<Record<string, { x: number; y: number }>>({});

	// Set of node names that are in any semantic group
	const groupedNodeNames = computed(() => {
		const names = new Set<string>();
		for (const g of llmSemanticGroups.value) {
			for (const n of g.nodes) names.add(n);
		}
		return names;
	});

	const DEFAULT_GROUP_COLOR = 'rgb(0 90 255 / 0.08)';

	function setSemanticGroups(result: { groups: StoredSemanticGroup[]; standalone: string[] }) {
		llmSemanticGroups.value = result.groups.map((g) => ({
			...g,
			color: g.color ?? DEFAULT_GROUP_COLOR,
		}));
		summaryMode.value = result.groups.length > 0;
		expandedGroupIds.value = new Set();
		groupPositions.value = {};
	}

	/**
	 * Called after tidy-up layout is applied. Captures the dagre-calculated positions
	 * for group placeholder nodes so they don't snap back on recompute.
	 */
	function onLayoutApplied(layoutNodes: Array<{ id: string; x: number; y: number }>) {
		for (const ln of layoutNodes) {
			if (ln.id.startsWith('semantic-group-') || ln.id.startsWith('frame-')) {
				groupPositions.value[ln.id] = { x: ln.x, y: ln.y };
			}
		}
	}

	function toggleSummaryMode() {
		summaryMode.value = !summaryMode.value;
	}

	// Ungroup: remove a group entirely
	window.addEventListener('ungroup-group', ((e: CustomEvent) => {
		const groupId = e.detail?.groupId;
		if (groupId) {
			const idx = llmSemanticGroups.value.findIndex((_g, i) => `semantic-group-${i}` === groupId);
			if (idx !== -1) {
				const updated = [...llmSemanticGroups.value];
				updated.splice(idx, 1);
				llmSemanticGroups.value = updated;
			}
			window.dispatchEvent(new Event('groups-changed'));
		}
	}) as EventListener);

	// Manual group: add selected nodes to a new group
	window.addEventListener('group-nodes-manual', ((e: CustomEvent) => {
		const nodeIds: string[] = e.detail?.nodeIds ?? [];
		if (nodeIds.length === 0) return;

		const nodeNames = nodeIds
			.map((id) => nodes.value.find((n) => n.id === id)?.name)
			.filter((name): name is string => !!name);

		if (nodeNames.length === 0) return;

		// Check if any selected node is already in a group — merge into that group
		const existingIdx = llmSemanticGroups.value.findIndex((g) =>
			nodeNames.some((name) => g.nodes.includes(name)),
		);

		if (existingIdx !== -1) {
			const updated = [...llmSemanticGroups.value];
			const existing = updated[existingIdx];
			const merged = new Set([...existing.nodes, ...nodeNames]);
			updated[existingIdx] = { ...existing, nodes: [...merged] };
			llmSemanticGroups.value = updated;
		} else {
			const newGroupId = `semantic-group-${llmSemanticGroups.value.length}`;
			llmSemanticGroups.value = [
				...llmSemanticGroups.value,
				{
					name: 'Custom Group',
					description: `${nodeNames.length} nodes`,
					nodes: nodeNames,
					color: DEFAULT_GROUP_COLOR,
				},
			];

			// Start manual groups in expanded state
			const next = new Set(expandedGroupIds.value);
			next.add(newGroupId);
			expandedGroupIds.value = next;
		}
		summaryMode.value = true;
	}) as EventListener);

	// Remove a single node from its group
	window.addEventListener('remove-node-from-group', ((e: CustomEvent) => {
		const nodeName: string = e.detail?.nodeName;
		if (!nodeName) return;

		const updated = llmSemanticGroups.value
			.map((g) => ({
				...g,
				nodes: g.nodes.filter((n) => n !== nodeName),
			}))
			.filter((g) => g.nodes.length > 0); // remove empty groups

		llmSemanticGroups.value = updated;
		window.dispatchEvent(new Event('groups-changed'));
	}) as EventListener);

	// Expand group: show real nodes + frame instead of collapsed card
	window.addEventListener('expand-group', ((e: CustomEvent) => {
		const groupId = e.detail?.groupId;
		if (groupId) {
			const next = new Set(expandedGroupIds.value);
			next.add(groupId);
			expandedGroupIds.value = next;
		}
	}) as EventListener);

	// Collapse group: go back to collapsed card view
	window.addEventListener('collapse-group', ((e: CustomEvent) => {
		const groupId = e.detail?.groupId;
		if (groupId) {
			const next = new Set(expandedGroupIds.value);
			next.delete(groupId);
			expandedGroupIds.value = next;
		}
	}) as EventListener);

	// Update group name or description
	window.addEventListener('update-group-field', ((e: CustomEvent) => {
		const { groupId, field, value } = e.detail as {
			groupId: string;
			field: 'name' | 'description' | 'color';
			value: string;
		};
		const idx = llmSemanticGroups.value.findIndex((_g, i) => `semantic-group-${i}` === groupId);
		if (idx !== -1) {
			const updated = [...llmSemanticGroups.value];
			updated[idx] = { ...updated[idx], [field]: value };
			llmSemanticGroups.value = updated;
		}
	}) as EventListener);

	function getNodeImportance(node: INodeUi): NodeImportance {
		return groupedNodeNames.value.has(node.name) ? 'secondary' : 'primary';
	}

	function createDefaultNodeRenderType(node: INodeUi): CanvasNodeDefaultRender {
		const nodeType = nodeTypeDescriptionByNodeId.value[node.id];
		const source = simulatedNodeTypeDescriptionByNodeId.value[node.id] ?? nodeType ?? node.type;
		const icon = getNodeIconSource(source, node);

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
				importance: getNodeImportance(node),
				inputs: {
					labelSize: nodeInputLabelSizeById.value[node.id],
				},
				outputs: {
					labelSize: nodeOutputLabelSizeById.value[node.id],
				},
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
			acc[node.id] = workflowDocumentStore.value?.getNodePinData(node.name);
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

	const nodeExecutionErrorsById = computed(() =>
		nodes.value.reduce<Record<string, string[]>>((acc, node) => {
			const executionErrors: string[] = [];
			const nodeExecutionRunData = workflowsStore.getWorkflowRunData?.[node.name];
			if (nodeExecutionRunData) {
				nodeExecutionRunData.forEach((executionRunData) => {
					if (executionRunData?.error) {
						const { message, description } = executionRunData.error;
						const issue = `${message}${description ? ` (${description})` : ''}`;
						executionErrors.push(sanitizeHtml(issue));
					}
				});
			}

			acc[node.id] = executionErrors;

			return acc;
		}, {}),
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
			const hasExecutionErrors = nodeExecutionErrorsById.value[node.id]?.length > 0;
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

	const mappedNodes = computed<CanvasNode[]>(() => {
		const connectionsBySourceNode = connections.value;
		const connectionsByDestinationNode =
			workflowUtils.mapConnectionsByDestination(connectionsBySourceNode);

		return [
			...nodes.value.map<CanvasNode>((node) => {
				const outputConnections = connectionsBySourceNode[node.name] ?? {};
				const inputConnections = connectionsByDestinationNode[node.name] ?? {};

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
						execution: nodeExecutionErrorsById.value[node.id],
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

				return {
					id: node.id,
					label: node.name,
					type: 'canvas-node',
					position: { x: node.position[0], y: node.position[1] },
					data,
					...additionalNodePropertiesById.value[node.id],
					draggable: node.draggable,
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

	// --- Summary mode: collapse secondary nodes into placeholder groups ---

	type CollapsedGroup = {
		id: string;
		nodeNames: Set<string>;
		nodeIds: Set<string>;
		position: { x: number; y: number };
		entryEdges: { sourceId: string; sourceOutputIndex: number }[];
		exitEdges: { targetId: string; targetInputIndex: number }[];
	};

	const nodeByName = computed(() => {
		const map: Record<string, INodeUi> = {};
		for (const node of nodes.value) {
			map[node.name] = node;
		}
		return map;
	});

	// Build groups directly from LLM semantic groups
	const collapsedGroups = computed<CollapsedGroup[]>(() => {
		if (!summaryMode.value) return [];
		if (llmSemanticGroups.value.length === 0) return [];

		const conns = connections.value;
		const byName = nodeByName.value;

		return llmSemanticGroups.value.map((sg, idx) => {
			const comp = new Set(sg.nodes);
			const nodeIds = new Set<string>();
			for (const name of comp) {
				const n = byName[name];
				if (n) nodeIds.add(n.id);
			}

			// Find entry/exit edges
			const entryEdges: { sourceId: string; sourceOutputIndex: number }[] = [];
			const exitEdges: { targetId: string; targetInputIndex: number }[] = [];

			for (const [src, nodeConns] of Object.entries(conns)) {
				const mainOutputs = nodeConns?.[NodeConnectionTypes.Main];
				if (!mainOutputs) continue;
				for (const [outputIdx, group] of mainOutputs.entries()) {
					if (!group) continue;
					for (const c of group) {
						if (!comp.has(src) && comp.has(c.node)) {
							const srcNode = byName[src];
							if (srcNode) entryEdges.push({ sourceId: srcNode.id, sourceOutputIndex: outputIdx });
						}
						if (comp.has(src) && !comp.has(c.node)) {
							const tgtNode = byName[c.node];
							if (tgtNode) exitEdges.push({ targetId: tgtNode.id, targetInputIndex: c.index });
						}
					}
				}
			}

			const groupId = `semantic-group-${idx}`;

			let position = groupPositions.value[groupId];
			if (!position) {
				const memberNodes = [...comp].map((name) => byName[name]).filter((n): n is INodeUi => !!n);
				if (memberNodes.length > 0) {
					const avgX = memberNodes.reduce((s, n) => s + n.position[0], 0) / memberNodes.length;
					const avgY = memberNodes.reduce((s, n) => s + n.position[1], 0) / memberNodes.length;
					position = { x: avgX, y: avgY };
				} else {
					position = { x: 0, y: 0 };
				}
			}

			return {
				id: groupId,
				nodeNames: comp,
				nodeIds,
				position,
				entryEdges,
				exitEdges,
			};
		});
	});

	// Map groupId → description from semantic groups
	const groupNames = computed(() => {
		const map: Record<string, string> = {};
		for (let i = 0; i < llmSemanticGroups.value.length; i++) {
			map[`semantic-group-${i}`] = llmSemanticGroups.value[i].name;
		}
		return map;
	});

	const groupDescriptions = computed(() => {
		const map: Record<string, string> = {};
		for (let i = 0; i < llmSemanticGroups.value.length; i++) {
			map[`semantic-group-${i}`] = llmSemanticGroups.value[i].description;
		}
		return map;
	});

	const groupColors = computed(() => {
		const map: Record<string, string | undefined> = {};
		for (let i = 0; i < llmSemanticGroups.value.length; i++) {
			map[`semantic-group-${i}`] = llmSemanticGroups.value[i].color;
		}
		return map;
	});

	// Build a map of parent node name → config sub-node names with connection type
	const configSubNodesByParent = computed(() => {
		const map: Record<string, { name: string; connType: string }[]> = {};
		const conns = connections.value;
		for (const [srcName, nodeConns] of Object.entries(conns)) {
			for (const [connType, outputs] of Object.entries(nodeConns)) {
				if (connType === NodeConnectionTypes.Main) continue;
				if (!outputs) continue;
				for (const group of outputs) {
					if (!group) continue;
					for (const c of group) {
						if (!map[c.node]) map[c.node] = [];
						map[c.node].push({ name: srcName, connType });
					}
				}
			}
		}
		return map;
	});

	// Find agents with >1 tool sub-nodes and create collapsible tool groups
	type ToolGroup = {
		id: string;
		parentName: string;
		toolNames: string[];
		toolIds: Set<string>;
		position: { x: number; y: number };
		/** Unique connection types from direct children to parent (e.g. ai_tool, ai_document) */
		connTypes: string[];
	};

	const toolGroups = computed<ToolGroup[]>(() => {
		if (!summaryMode.value) return [];
		const byName = nodeByName.value;
		const subNodes = configSubNodesByParent.value;
		const groups: ToolGroup[] = [];
		// Track nodes already claimed by a tool group to prevent nested orphan groups
		const claimedNodes = new Set<string>();

		// Sort so top-level parents (not themselves sub-nodes) are processed first.
		// This ensures nested parents are claimed before they can create orphan groups.
		const allSubNodeNames = new Set<string>();
		for (const children of Object.values(subNodes)) {
			for (const c of children) allSubNodeNames.add(c.name);
		}
		const sortedEntries = Object.entries(subNodes).sort(([a], [b]) => {
			return (allSubNodeNames.has(a) ? 1 : 0) - (allSubNodeNames.has(b) ? 1 : 0);
		});

		for (const [parentName, children] of sortedEntries) {
			if (children.length === 0) continue;

			// Skip if parent is already hidden in a collapsed main-chain group
			const parentInCollapsedGroup = collapsedGroups.value.some((g) => g.nodeNames.has(parentName));
			if (parentInCollapsedGroup) continue;

			// Skip if parent is already collected inside another tool group
			if (claimedNodes.has(parentName)) continue;

			// Only collapse sub-nodes the LLM marked as secondary, excluding model and memory
			const NEVER_COLLAPSE_TYPES = ['model', 'languagemodel', 'memory'];
			const secondaryChildren = children.filter((c) => {
				if (NEVER_COLLAPSE_TYPES.some((t) => c.connType.toLowerCase().includes(t))) return false;
				const n = byName[c.name];
				return n && getNodeImportance(n) === 'secondary';
			});

			if (secondaryChildren.length === 0) continue;

			// Collect unique connection types from direct children to parent
			const connTypes = [...new Set(secondaryChildren.map((c) => c.connType))];

			// Collect IDs including nested sub-nodes (e.g. embeddings on a document loader)
			const toolIds = new Set<string>();
			const allToolNames: string[] = [];
			let sumX = 0;
			let sumY = 0;
			const collectRecursive = (name: string) => {
				const n = byName[name];
				if (!n || toolIds.has(n.id)) return;
				toolIds.add(n.id);
				allToolNames.push(name);
				claimedNodes.add(name);
				sumX += n.position[0];
				sumY += n.position[1];
				const nested = subNodes[name];
				if (nested) {
					for (const child of nested) collectRecursive(child.name);
				}
			};
			for (const c of secondaryChildren) collectRecursive(c.name);

			const groupId = `tool-group-${parentName}`;
			// Use dagre-calculated position if available, otherwise compute from member nodes
			let position = groupPositions.value[groupId];
			if (!position) {
				const count = toolIds.size || 1;
				position = {
					x: sumX / count,
					y: sumY / count,
				};
			}

			groups.push({
				id: groupId,
				parentName,
				toolNames: allToolNames,
				toolIds,
				position,
				connTypes,
			});
		}
		return groups;
	});

	// Only include node IDs from groups that are NOT expanded, plus their config sub-nodes
	const collapsedNodeIds = computed(() => {
		const ids = new Set<string>();
		const byName = nodeByName.value;
		const subNodes = configSubNodesByParent.value;

		for (const group of collapsedGroups.value) {
			if (expandedGroupIds.value.has(group.id)) continue; // expanded = real nodes visible
			for (const nid of group.nodeIds) ids.add(nid);
			// Also hide config sub-nodes of grouped nodes
			for (const nodeName of group.nodeNames) {
				const children = subNodes[nodeName];
				if (!children) continue;
				for (const child of children) {
					const childNode = byName[child.name];
					if (childNode) ids.add(childNode.id);
				}
			}
		}

		// Also hide tools in collapsed tool groups
		for (const tg of toolGroups.value) {
			if (expandedGroupIds.value.has(tg.id)) continue;
			for (const tid of tg.toolIds) ids.add(tid);
		}

		return ids;
	});

	/** Estimate the header height for an expanded group frame based on title + description */
	function estimateHeaderHeight(name: string, description: string, frameWidth: number): number {
		const PADDING = 24; // top padding + gap
		const TITLE_LINE_HEIGHT = 20;
		const DESC_LINE_HEIGHT = 18;
		const CHARS_PER_LINE = Math.max(1, Math.floor((frameWidth - 60) / 7)); // ~7px per char at 12px font

		let height = PADDING;
		if (name) height += TITLE_LINE_HEIGHT;

		if (description) {
			const lines = description.split('\n');
			let totalLines = 0;
			for (const line of lines) {
				totalLines += Math.max(1, Math.ceil((line.length || 1) / CHARS_PER_LINE));
			}
			height += totalLines * DESC_LINE_HEIGHT;
		}

		return Math.max(30, height);
	}

	function getGroupedIcons(nodeNames: Iterable<string>): NodeIconSource[] {
		const byName = nodeByName.value;
		const icons: NodeIconSource[] = [];
		for (const name of nodeNames) {
			const node = byName[name];
			if (!node) continue;
			const nodeType = nodeTypeDescriptionByNodeId.value[node.id];
			const source = simulatedNodeTypeDescriptionByNodeId.value[node.id] ?? nodeType ?? node.type;
			const icon = getNodeIconSource(source, node);
			if (icon) icons.push(icon);
		}
		return icons;
	}

	const finalNodes = computed<CanvasNode[]>(() => {
		if (!summaryMode.value) return mappedNodes.value;

		const hidden = collapsedNodeIds.value;
		const visible = mappedNodes.value.filter((n) => !hidden.has(n.id));

		// Add placeholder cards OR frame nodes for groups
		for (const group of collapsedGroups.value) {
			if (expandedGroupIds.value.has(group.id)) {
				// Expanded: add a frame node behind the real nodes
				const byName = nodeByName.value;
				const memberNodes = [...group.nodeNames]
					.map((name) => byName[name])
					.filter((n): n is INodeUi => !!n);
				if (memberNodes.length > 0) {
					const PADDING_X = 60;
					const PADDING_TOP = 40;
					const PADDING_BOTTOM = 80;
					const NODE_WIDTH = 100;
					const NODE_HEIGHT = 100;
					const gName = groupNames.value[group.id] ?? '';
					const gDesc = groupDescriptions.value[group.id] ?? '';
					const minX = Math.min(...memberNodes.map((n) => n.position[0]));
					const maxX = Math.max(...memberNodes.map((n) => n.position[0]));
					const minY = Math.min(...memberNodes.map((n) => n.position[1]));
					const maxY = Math.max(...memberNodes.map((n) => n.position[1]));
					const frameWidth = maxX - minX + NODE_WIDTH + PADDING_X * 2;
					const headerHeight = estimateHeaderHeight(gName, gDesc, frameWidth);
					const frameHeight =
						maxY - minY + NODE_HEIGHT + PADDING_TOP + PADDING_BOTTOM + headerHeight;

					const frameData: CanvasNodeData = {
						id: `frame-${group.id}`,
						name: '',
						subtitle: '',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						disabled: false,
						inputs: [],
						outputs: [],
						connections: { [CanvasConnectionMode.Input]: {}, [CanvasConnectionMode.Output]: {} },
						issues: { execution: [], validation: [], visible: false },
						pinnedData: { count: 0, visible: false },
						execution: { running: false },
						runData: { iterations: 0, visible: false },
						render: {
							type: CanvasNodeRenderType.GroupFrame,
							options: {
								width: frameWidth,
								height: frameHeight,
								groupId: group.id,
								name: groupNames.value[group.id] ?? '',
								description: groupDescriptions.value[group.id] ?? '',
								color: groupColors.value[group.id],
							},
						},
					};

					visible.push({
						id: `frame-${group.id}`,
						label: '',
						type: 'canvas-node',
						position: { x: minX - PADDING_X, y: minY - PADDING_TOP - headerHeight },
						zIndex: -1,
						draggable: true,
						selectable: false,
						focusable: false,
						data: frameData,
					} as CanvasNode);
				}
				continue;
			}

			const count = group.nodeNames.size;
			const placeholderData: CanvasNodeData = {
				id: group.id,
				name: `${count} nodes`,
				subtitle: '',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				disabled: false,
				inputs: [{ type: NodeConnectionTypes.Main, index: 0, label: '' }],
				outputs: [{ type: NodeConnectionTypes.Main, index: 0, label: '' }],
				connections: {
					[CanvasConnectionMode.Input]: {
						main: [
							group.entryEdges.map(() => ({ node: '', type: NodeConnectionTypes.Main, index: 0 })),
						],
					},
					[CanvasConnectionMode.Output]: {
						main: [
							group.exitEdges.map(() => ({ node: '', type: NodeConnectionTypes.Main, index: 0 })),
						],
					},
				},
				issues: { execution: [], validation: [], visible: false },
				pinnedData: { count: 0, visible: false },
				execution: { running: false },
				runData: { iterations: 0, visible: false },
				render: {
					type: CanvasNodeRenderType.Default,
					options: {
						collapsedGroup: true,
						icon: { type: 'icon', name: 'layer-group' },
						groupedIcons: getGroupedIcons(group.nodeNames),
						groupedNodeNames: [...group.nodeNames],
						groupName: groupNames.value[group.id],
						groupDescription: groupDescriptions.value[group.id],
						groupDescriptionLoading: false,
						groupColor: groupColors.value[group.id],
					},
				},
			};

			visible.push({
				id: group.id,
				label: `${count} nodes`,
				type: 'canvas-node',
				position: group.position,
				data: placeholderData,
			} as CanvasNode);
		}

		// Add placeholder cards OR frame nodes for tool groups
		for (const tg of toolGroups.value) {
			if (expandedGroupIds.value.has(tg.id)) {
				// Expanded: add a frame node behind the real nodes
				const byName = nodeByName.value;
				const memberNodes = tg.toolNames
					.map((name) => byName[name])
					.filter((n): n is INodeUi => !!n);
				if (memberNodes.length > 0) {
					const PADDING_X = 60;
					const PADDING_TOP = 40;
					const PADDING_BOTTOM = 80;
					const NODE_WIDTH = 80;
					const NODE_HEIGHT = 80;
					const gName = '';
					const gDesc = groupDescriptions.value[tg.id] ?? '';
					const minX = Math.min(...memberNodes.map((n) => n.position[0]));
					const maxX = Math.max(...memberNodes.map((n) => n.position[0]));
					const minY = Math.min(...memberNodes.map((n) => n.position[1]));
					const maxY = Math.max(...memberNodes.map((n) => n.position[1]));
					const frameWidth = maxX - minX + NODE_WIDTH + PADDING_X * 2;
					const headerHeight = estimateHeaderHeight(gName, gDesc, frameWidth);
					const frameHeight =
						maxY - minY + NODE_HEIGHT + PADDING_TOP + PADDING_BOTTOM + headerHeight;

					const frameData: CanvasNodeData = {
						id: `frame-${tg.id}`,
						name: '',
						subtitle: '',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						disabled: false,
						inputs: [],
						outputs: [],
						connections: { [CanvasConnectionMode.Input]: {}, [CanvasConnectionMode.Output]: {} },
						issues: { execution: [], validation: [], visible: false },
						pinnedData: { count: 0, visible: false },
						execution: { running: false },
						runData: { iterations: 0, visible: false },
						render: {
							type: CanvasNodeRenderType.GroupFrame,
							options: {
								width: frameWidth,
								height: frameHeight,
								groupId: tg.id,
								name: '',
								description: groupDescriptions.value[tg.id] ?? '',
							},
						},
					};

					visible.push({
						id: `frame-${tg.id}`,
						label: '',
						type: 'canvas-node',
						position: { x: minX - PADDING_X, y: minY - PADDING_TOP - headerHeight },
						zIndex: -1,
						draggable: true,
						selectable: false,
						focusable: false,
						data: frameData,
					} as CanvasNode);
				}
				continue;
			}

			const count = tg.toolNames.length;
			// Single output handle — all connections fan out from one point
			const firstType = tg.connTypes[0] ?? 'ai_tool';

			const toolPlaceholderData: CanvasNodeData = {
				id: tg.id,
				name: `${count} nodes`,
				subtitle: '',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				disabled: false,
				inputs: [],
				outputs: [{ type: firstType as never, index: 0, label: '' }],
				connections: {
					[CanvasConnectionMode.Input]: {},
					[CanvasConnectionMode.Output]: {
						[firstType]: [[{ node: '', type: firstType as never, index: 0 }]],
					},
				},
				issues: { execution: [], validation: [], visible: false },
				pinnedData: { count: 0, visible: false },
				execution: { running: false },
				runData: { iterations: 0, visible: false },
				render: {
					type: CanvasNodeRenderType.Default,
					options: {
						configuration: true,
						collapsedGroup: true,
						icon: { type: 'icon', name: 'layer-group' },
						groupedIcons: getGroupedIcons(tg.toolNames),
						groupedNodeNames: tg.toolNames,
						groupDescription: groupDescriptions.value[tg.id],
						groupDescriptionLoading: false,
					},
				},
			};

			visible.push({
				id: tg.id,
				label: `${count} tools`,
				type: 'canvas-node',
				position: tg.position,
				data: toolPlaceholderData,
			} as CanvasNode);
		}

		return visible;
	});

	const finalConnections = computed<CanvasConnection[]>(() => {
		if (!summaryMode.value) return mappedConnections.value;

		const hidden = collapsedNodeIds.value;
		// Keep connections between visible (primary) nodes
		const kept = mappedConnections.value.filter(
			(c) => !hidden.has(c.source) && !hidden.has(c.target),
		);

		// Build a lookup: hidden node ID → group placeholder ID it belongs to
		const hiddenNodeToGroup: Record<string, string> = {};
		for (const group of collapsedGroups.value) {
			if (expandedGroupIds.value.has(group.id)) continue;
			for (const nid of group.nodeIds) {
				hiddenNodeToGroup[nid] = group.id;
			}
		}
		for (const tg of toolGroups.value) {
			if (expandedGroupIds.value.has(tg.id)) continue;
			for (const tid of tg.toolIds) {
				hiddenNodeToGroup[tid] = tg.id;
			}
		}

		// Re-route connections where one or both ends are hidden inside a group
		const addedEdges = new Set<string>();
		for (const conn of mappedConnections.value) {
			const srcHidden = hidden.has(conn.source);
			const tgtHidden = hidden.has(conn.target);
			if (!srcHidden && !tgtHidden) continue; // already kept above

			const srcId = srcHidden ? hiddenNodeToGroup[conn.source] : conn.source;
			const tgtId = tgtHidden ? hiddenNodeToGroup[conn.target] : conn.target;
			if (!srcId || !tgtId || srcId === tgtId) continue; // internal to same group

			const edgeKey = `${srcId}->${tgtId}`;
			if (addedEdges.has(edgeKey)) continue; // one edge per group pair
			addedEdges.add(edgeKey);

			kept.push({
				id: edgeKey,
				source: srcId,
				target: tgtId,
				sourceHandle: `outputs/main/0`,
				targetHandle: `inputs/main/0`,
				type: 'canvas-edge',
				markerEnd: MarkerType.ArrowClosed,
				data: {
					source: { type: NodeConnectionTypes.Main, index: 0 },
					target: { type: NodeConnectionTypes.Main, index: 0 },
				},
			});
		}

		// Add connections from tool group placeholders to their parent
		// All connections share one source handle but target different parent inputs
		for (const tg of toolGroups.value) {
			if (expandedGroupIds.value.has(tg.id)) continue;
			const parentNode = nodeByName.value[tg.parentName];
			if (!parentNode) continue;
			const srcType = tg.connTypes[0] ?? 'ai_tool';
			for (const ct of tg.connTypes) {
				kept.push({
					id: `${tg.id}->${parentNode.id}/${ct}`,
					source: tg.id,
					target: parentNode.id,
					sourceHandle: `outputs/${srcType}/0`,
					targetHandle: `inputs/${ct}/0`,
					type: 'canvas-edge',
					markerEnd: MarkerType.ArrowClosed,
					data: {
						source: { type: srcType as never, index: 0 },
						target: { type: ct as never, index: 0 },
					},
				});
			}
		}

		return kept;
	});

	/** Get all visible node IDs that belong to a given group */
	function getGroupMemberNodeIds(groupId: string): string[] {
		const group = collapsedGroups.value.find((g) => g.id === groupId);
		if (group) return [...group.nodeIds];
		const tg = toolGroups.value.find((t) => t.id === groupId);
		if (tg) return [...tg.toolIds];
		return [];
	}

	return {
		additionalNodePropertiesById,
		nodeExecutionRunDataOutputMapById,
		nodeExecutionWaitingForNextById,
		nodeHasIssuesById,
		connections: finalConnections,
		nodes: finalNodes,
		setSemanticGroups,
		getGroupMemberNodeIds,
		onLayoutApplied,
		toggleSummaryMode,
		summaryMode,
	};
}
