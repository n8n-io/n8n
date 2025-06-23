import { defineStore } from 'pinia';
import {
	AI_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
	AI_UNCATEGORIZED_CATEGORY,
	CUSTOM_API_CALL_KEY,
	NODE_CREATOR_OPEN_SOURCES,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type {
	NodeFilterType,
	NodeCreatorOpenSource,
	SimplifiedNodeType,
	ActionsRecord,
	ToggleNodeCreatorOptions,
	INodeCreateElement,
} from '@/Interface';

import { computed, ref } from 'vue';
import { transformNodeType } from '@/components/Node/NodeCreator/utils';
import type {
	IDataObject,
	INodeInputConfiguration,
	NodeParameterValueType,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useViewStacks } from '@/components/Node/NodeCreator/composables/useViewStacks';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import {
	createCanvasConnectionHandleString,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtils';
import type { Connection } from '@vue-flow/core';
import { CanvasConnectionMode } from '@/types';
import { isVueFlowConnection } from '@/utils/typeGuards';
import type { PartialBy } from '@/utils/typeHelpers';
import { useTelemetry } from '@/composables/useTelemetry';

export const useNodeCreatorStore = defineStore(STORES.NODE_CREATOR, () => {
	const workflowsStore = useWorkflowsStore();
	const ndvStore = useNDVStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();

	const selectedView = ref<NodeFilterType>(TRIGGER_NODE_CREATOR_VIEW);
	const mergedNodes = ref<SimplifiedNodeType[]>([]);
	const actions = ref<ActionsRecord<typeof mergedNodes.value>>({});

	const showScrim = ref(false);
	const openSource = ref<NodeCreatorOpenSource>('');

	const isCreateNodeActive = ref<boolean>(false);

	const nodePanelSessionId = ref<string>('');

	const allNodeCreatorNodes = computed(() =>
		Object.values(mergedNodes.value).map((i) => transformNodeType(i)),
	);

	function setMergeNodes(nodes: SimplifiedNodeType[]) {
		mergedNodes.value = nodes;
	}

	function removeNodeFromMergedNodes(nodeName: string) {
		mergedNodes.value = mergedNodes.value.filter((n) => n.name !== nodeName);
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
		connectionIndex = 0,
	}: {
		connectionType: NodeConnectionType;
		node: string;
		creatorView?: NodeFilterType;
		connectionIndex?: number;
	}) {
		const nodeName = node ?? ndvStore.activeNodeName;
		const nodeData = nodeName ? workflowsStore.getNodeByName(nodeName) : null;

		ndvStore.activeNodeName = null;

		setTimeout(() => {
			if (creatorView) {
				setNodeCreatorState({
					createNodeActive: true,
					nodeCreatorView: creatorView,
					connectionType,
				});
			} else if (connectionType && nodeData) {
				openNodeCreatorForConnectingNode({
					connection: {
						source: nodeData.id,
						sourceHandle: createCanvasConnectionHandleString({
							mode: 'inputs',
							type: connectionType,
							index: connectionIndex,
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
		connectionType,
	}: ToggleNodeCreatorOptions) {
		if (!nodeCreatorView) {
			nodeCreatorView =
				workflowsStore.workflowTriggerNodes.length > 0
					? REGULAR_NODE_CREATOR_VIEW
					: TRIGGER_NODE_CREATOR_VIEW;
		}
		// Default to the trigger tab in node creator if there's no trigger node yet
		setSelectedView(nodeCreatorView);

		isCreateNodeActive.value = createNodeActive;
		if (createNodeActive && source) {
			setOpenSource(source);
		}

		void externalHooks.run('nodeView.createNodeActiveChanged', {
			source,
			mode: getMode(nodeCreatorView),
			connectionType,
			createNodeActive,
		});

		if (createNodeActive) {
			onCreatorOpened({
				source,
				mode: getMode(nodeCreatorView),
				connectionType,
				workflow_id: workflowsStore.workflowId,
			});
		}
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

		const { type, mode } = parseCanvasConnectionHandleString(connection.sourceHandle);

		uiStore.lastSelectedNode = sourceNode.name;

		if (isVueFlowConnection(connection)) {
			uiStore.lastInteractedWithNodeConnection = connection;
		}
		uiStore.lastInteractedWithNodeHandle = connection.sourceHandle ?? null;
		uiStore.lastInteractedWithNodeId = sourceNode.id;

		const isOutput = mode === CanvasConnectionMode.Output;
		const isScopedConnection = type !== NodeConnectionTypes.Main;
		setNodeCreatorState({
			source: eventSource,
			createNodeActive: true,
			nodeCreatorView: isScopedConnection ? AI_UNCATEGORIZED_CATEGORY : nodeCreatorView,
			connectionType: type,
		});

		// TODO: The animation is a bit glitchy because we're updating view stack immediately
		// after the node creator is opened
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

	function openNodeCreatorForActions(node: string, eventSource?: NodeCreatorOpenSource) {
		const actionNode = allNodeCreatorNodes.value.find((i) => i.key === node);

		if (!actionNode) {
			return;
		}

		const nodeActions = actions.value[actionNode.key];

		const transformedActions = nodeActions?.map((a) =>
			transformNodeType(a, actionNode.properties.displayName, 'action'),
		);

		ndvStore.activeNodeName = null;
		setSelectedView(REGULAR_NODE_CREATOR_VIEW);
		setNodeCreatorState({
			source: eventSource,
			createNodeActive: true,
			nodeCreatorView: REGULAR_NODE_CREATOR_VIEW,
		});

		setTimeout(() => {
			useViewStacks().pushViewStack(
				{
					subcategory: '*',
					title: actionNode.properties.displayName,
					nodeIcon: {
						type: 'icon',
						name: 'check-double',
					},
					rootView: 'Regular',
					mode: 'actions',
					items: transformedActions,
				},
				{ resetStacks: true },
			);
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

	function resetNodesPanelSession() {
		nodePanelSessionId.value = `nodes_panel_session_${new Date().valueOf()}`;
	}

	function trackNodeCreatorEvent(event: string, properties: IDataObject = {}, withPostHog = false) {
		telemetry.track(
			event,
			{
				...properties,
				nodes_panel_session_id: nodePanelSessionId.value,
			},
			{
				withPostHog,
			},
		);
	}

	function onCreatorOpened({
		source,
		mode,
		connectionType,
		workflow_id,
	}: {
		source?: string;
		mode: string;
		connectionType?: NodeConnectionType;
		workflow_id?: string;
	}) {
		resetNodesPanelSession();
		trackNodeCreatorEvent('User opened nodes panel', {
			source,
			mode,
			connectionType,
			workflow_id,
		});
	}

	function onNodeFilterChanged({
		newValue,
		filteredNodes,
		filterMode,
		subcategory,
		title,
	}: {
		newValue: string;
		filteredNodes: INodeCreateElement[];
		filterMode: NodeFilterType;
		subcategory?: string;
		title?: string;
	}) {
		if (!newValue.length) {
			return;
		}

		const { results_count, trigger_count, regular_count } = filteredNodes.reduce(
			(accu, node) => {
				if (!('properties' in node)) {
					return accu;
				}
				const isCustomAction =
					'actionKey' in node.properties && node.properties.actionKey === CUSTOM_API_CALL_KEY;
				if (isCustomAction) {
					return accu;
				}
				const isTrigger = node.key.includes('Trigger');
				return {
					results_count: accu.results_count + 1,
					trigger_count: accu.trigger_count + (isTrigger ? 1 : 0),
					regular_count: accu.regular_count + (isTrigger ? 0 : 1),
				};
			},
			{
				results_count: 0,
				trigger_count: 0,
				regular_count: 0,
			},
		);

		trackNodeCreatorEvent('User entered nodes panel search term', {
			search_string: newValue,
			filter_mode: getMode(filterMode),
			category_name: subcategory,
			results_count,
			trigger_count,
			regular_count,
			title,
		});
	}

	function onCategoryExpanded(properties: { category_name: string; workflow_id: string }) {
		trackNodeCreatorEvent('User viewed node category', { ...properties, is_subcategory: false });
	}

	function onViewActions(properties: {
		app_identifier: string;
		actions: string[];
		regular_action_count: number;
		trigger_action_count: number;
	}) {
		trackNodeCreatorEvent('User viewed node actions', properties);
	}

	function onActionsCustomAPIClicked(properties: { app_identifier: string }) {
		trackNodeCreatorEvent('User clicked custom API from node actions', properties);
	}

	function onAddActions(properties: {
		node_type?: string;
		action: string;
		source_mode: string;
		resource: NodeParameterValueType;
	}) {
		trackNodeCreatorEvent('User added action', properties);
	}

	function onSubcategorySelected(properties: { subcategory: string }) {
		trackNodeCreatorEvent('User viewed node category', {
			category_name: properties.subcategory,
			is_subcategory: true,
		});
	}

	function onNodeAddedToCanvas(properties: {
		node_id: string;
		node_type: string;
		node_version: number;
		is_auto_add?: boolean;
		workflow_id: string;
		drag_and_drop?: boolean;
		input_node_type?: string;
	}) {
		trackNodeCreatorEvent('User added node to workflow canvas', properties, true);
	}

	function getMode(mode: NodeFilterType): string {
		if (mode === AI_NODE_CREATOR_VIEW || mode === AI_OTHERS_NODE_CREATOR_VIEW) {
			return 'ai';
		}

		if (mode === TRIGGER_NODE_CREATOR_VIEW) {
			return 'trigger';
		}

		return 'regular';
	}

	return {
		isCreateNodeActive,
		openSource,
		selectedView,
		showScrim,
		mergedNodes,
		actions,
		allNodeCreatorNodes,
		setShowScrim,
		setSelectedView,
		setOpenSource,
		setActions,
		setMergeNodes,
		removeNodeFromMergedNodes,
		setNodeCreatorState,
		openSelectiveNodeCreator,
		openNodeCreatorForConnectingNode,
		openNodeCreatorForTriggerNodes,
		openNodeCreatorForActions,
		onCreatorOpened,
		onNodeFilterChanged,
		onCategoryExpanded,
		onActionsCustomAPIClicked,
		onViewActions,
		onAddActions,
		onSubcategorySelected,
		onNodeAddedToCanvas,
	};
});
