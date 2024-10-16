import { defineStore } from 'pinia';
import {
	AI_NODE_CREATOR_VIEW,
	NODE_CREATOR_OPEN_SOURCES,
	REGULAR_NODE_CREATOR_VIEW,
	STORES,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/constants';
import type {
	NodeFilterType,
	NodeCreatorOpenSource,
	SimplifiedNodeType,
	ActionsRecord,
	ToggleNodeCreatorOptions,
} from '@/Interface';

import { computed, ref } from 'vue';
import { transformNodeType } from '@/components/Node/NodeCreator/utils';
import type { INodeInputConfiguration } from 'n8n-workflow';
import { NodeConnectionType, nodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useViewStacks } from '@/components/Node/NodeCreator/composables/useViewStacks';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import {
	createCanvasConnectionHandleString,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtilsV2';
import type { Connection } from '@vue-flow/core';
import { CanvasConnectionMode } from '@/types';
import { isVueFlowConnection } from '@/utils/typeGuards';
import type { PartialBy } from '@/utils/typeHelpers';

export const useNodeCreatorStore = defineStore(STORES.NODE_CREATOR, () => {
	const workflowsStore = useWorkflowsStore();
	const ndvStore = useNDVStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();

	const externalHooks = useExternalHooks();
	const telemetry = useTelemetry();

	const selectedView = ref<NodeFilterType>(TRIGGER_NODE_CREATOR_VIEW);
	const mergedNodes = ref<SimplifiedNodeType[]>([]);
	const actions = ref<ActionsRecord<typeof mergedNodes.value>>({});

	const showScrim = ref(false);
	const openSource = ref<NodeCreatorOpenSource>('');

	const allNodeCreatorNodes = computed(() =>
		Object.values(mergedNodes.value).map((i) => transformNodeType(i)),
	);

	function setMergeNodes(nodes: SimplifiedNodeType[]) {
		mergedNodes.value = nodes;
	}

	function setActions(nodes: ActionsRecord<typeof mergedNodes.value>) {
		actions.value = nodes;
	}

	function setShowScrim(isVisible: boolean) {
		showScrim.value = isVisible;
	}

	function setSelectedView(view: NodeFilterType) {
		selectedView.value = view;
	}

	function setOpenSource(view: NodeCreatorOpenSource) {
		openSource.value = view;
	}

	function openSelectiveNodeCreator({
		connectionType,
		node,
		creatorView,
	}: {
		connectionType: NodeConnectionType;
		node: string;
		creatorView?: NodeFilterType;
	}) {
		const nodeName = node ?? ndvStore.activeNodeName;
		const nodeData = nodeName ? workflowsStore.getNodeByName(nodeName) : null;

		ndvStore.activeNodeName = null;

		setTimeout(() => {
			if (creatorView) {
				setNodeCreatorState({
					createNodeActive: true,
					nodeCreatorView: creatorView,
				});
			} else if (connectionType && nodeData) {
				openNodeCreatorForConnectingNode({
					connection: {
						source: nodeData.id,
						sourceHandle: createCanvasConnectionHandleString({
							mode: 'inputs',
							type: connectionType,
							index: 0,
						}),
					},
					eventSource: NODE_CREATOR_OPEN_SOURCES.NOTICE_ERROR_MESSAGE,
				});
			}
		});
	}

	function setNodeCreatorState({
		source,
		createNodeActive,
		nodeCreatorView,
	}: ToggleNodeCreatorOptions) {
		if (createNodeActive === uiStore.isCreateNodeActive) {
			return;
		}

		if (!nodeCreatorView) {
			nodeCreatorView =
				workflowsStore.workflowTriggerNodes.length > 0
					? REGULAR_NODE_CREATOR_VIEW
					: TRIGGER_NODE_CREATOR_VIEW;
		}
		// Default to the trigger tab in node creator if there's no trigger node yet
		setSelectedView(nodeCreatorView);

		let mode;
		switch (selectedView.value) {
			case AI_NODE_CREATOR_VIEW:
				mode = 'ai';
				break;
			case REGULAR_NODE_CREATOR_VIEW:
				mode = 'regular';
				break;
			default:
				mode = 'regular';
		}

		uiStore.isCreateNodeActive = createNodeActive;
		if (createNodeActive && source) {
			setOpenSource(source);
		}

		void externalHooks.run('nodeView.createNodeActiveChanged', {
			source,
			mode,
			createNodeActive,
		});

		trackNodesPanelActiveChanged({
			source,
			mode,
			createNodeActive,
			workflowId: workflowsStore.workflowId,
		});
	}

	function trackNodesPanelActiveChanged({
		source,
		mode,
		createNodeActive,
		workflowId,
	}: {
		source?: string;
		mode?: string;
		createNodeActive?: boolean;
		workflowId?: string;
	}) {
		telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', {
			source,
			mode,
			createNodeActive,
			workflow_id: workflowId,
		});
	}

	function openNodeCreatorForConnectingNode({
		connection,
		eventSource,
		nodeCreatorView,
	}: {
		connection: PartialBy<Connection, 'target' | 'targetHandle'>;
		eventSource?: NodeCreatorOpenSource;
		nodeCreatorView?: NodeFilterType;
	}) {
		// Get the node and set it as active that new nodes
		// which get created get automatically connected
		// to it.
		const sourceNode = workflowsStore.getNodeById(connection.source);
		if (!sourceNode) {
			return;
		}

		const { type, index, mode } = parseCanvasConnectionHandleString(connection.sourceHandle);

		uiStore.lastSelectedNode = sourceNode.name;
		uiStore.lastSelectedNodeEndpointUuid = connection.sourceHandle ?? null;
		uiStore.lastSelectedNodeOutputIndex = index;

		if (isVueFlowConnection(connection)) {
			uiStore.lastInteractedWithNodeConnection = connection;
		}
		uiStore.lastInteractedWithNodeHandle = connection.sourceHandle ?? null;
		uiStore.lastInteractedWithNodeId = sourceNode.id;

		setNodeCreatorState({
			source: eventSource,
			createNodeActive: true,
			nodeCreatorView,
		});

		// TODO: The animation is a bit glitchy because we're updating view stack immediately
		// after the node creator is opened
		const isOutput = mode === CanvasConnectionMode.Output;
		const isScopedConnection =
			type !== NodeConnectionType.Main && nodeConnectionTypes.includes(type);

		if (isScopedConnection) {
			useViewStacks()
				.gotoCompatibleConnectionView(type, isOutput, getNodeCreatorFilter(sourceNode.name, type))
				.catch(() => {});
		}
	}

	function openNodeCreatorForTriggerNodes(source: NodeCreatorOpenSource) {
		ndvStore.activeNodeName = null;
		setSelectedView(TRIGGER_NODE_CREATOR_VIEW);
		setShowScrim(true);
		setNodeCreatorState({
			source,
			createNodeActive: true,
			nodeCreatorView: TRIGGER_NODE_CREATOR_VIEW,
		});
	}

	function getNodeCreatorFilter(nodeName: string, outputType?: NodeConnectionType) {
		let filter;
		const workflow = workflowsStore.getCurrentWorkflow();
		const workflowNode = workflow.getNode(nodeName);
		if (!workflowNode) return { nodes: [] };

		const nodeType = nodeTypesStore.getNodeType(workflowNode?.type, workflowNode.typeVersion);
		if (nodeType) {
			const inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, nodeType);

			const filterFound = inputs.filter((input) => {
				if (typeof input === 'string' || input.type !== outputType || !input.filter) {
					// No filters defined or wrong connection type
					return false;
				}

				return true;
			}) as INodeInputConfiguration[];

			if (filterFound.length) {
				filter = filterFound[0].filter;
			}
		}

		return filter;
	}

	return {
		openSource,
		selectedView,
		showScrim,
		mergedNodes,
		actions,
		setShowScrim,
		setSelectedView,
		setOpenSource,
		setActions,
		setMergeNodes,
		setNodeCreatorState,
		openSelectiveNodeCreator,
		openNodeCreatorForConnectingNode,
		openNodeCreatorForTriggerNodes,
		allNodeCreatorNodes,
	};
});
