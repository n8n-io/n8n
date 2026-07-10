<script setup lang="ts">
import type { ContextMenuAction } from '@/features/shared/contextMenu/composables/useContextMenuItems';
import type { IWorkflowDb } from '@/Interface';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import type { ViewportTransform } from '@vue-flow/core';
import { getRectOfNodes, useVueFlow } from '@vue-flow/core';
import { throttledRef } from '@vueuse/core';
import {
	computed,
	effectScope,
	onScopeDispose,
	provide,
	ref,
	shallowRef,
	useCssModule,
	useTemplateRef,
	watch,
	type EffectScope,
} from 'vue';
import type { CanvasEventBusEvents, GroupExpansionMode } from '../canvas.types';
import { createEmptyCanvasRenderData, type CanvasRenderData } from '../canvas.utils';
import { useCanvasMapping } from '../composables/useCanvasMapping';
import {
	aggregateGroupExecution,
	mapGroupsToVueFlowNodes,
} from '../composables/useCanvasMapping.groups';
import { NodeGroupViewKey, useCanvasNodeGroupView } from '../composables/useCanvasNodeGroupView';
import {
	phantomDisplayName,
	SubWorkflowGroupViewKey,
	useCanvasSubWorkflowGroups,
} from '../composables/useCanvasSubWorkflowGroups';
import { buildNodeGroupLayoutComponents } from '../composables/useCanvasNodeGroupLayout';
import Canvas from './Canvas.vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowDocumentRenderData } from '@/app/stores/workflowDocument/useWorkflowDocumentRenderData';
import { useExperimentalNdvStore } from '../experimental/experimentalNdv.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { SUB_WORKFLOW_GROUPS_EXPERIMENT } from '@/app/constants';

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(
	defineProps<{
		id?: string;
		fallbackNodes?: IWorkflowDb['nodes'];
		showFallbackNodes?: boolean;
		eventBus?: EventBus<CanvasEventBusEvents>;
		readOnly?: boolean;
		groupExpansionMode?: GroupExpansionMode;
		canExecute?: boolean;
		executing?: boolean;
		suppressInteraction?: boolean;
		stripedBackground?: boolean;
		initialViewport?: ViewportTransform | null;
	}>(),
	{
		id: 'canvas',
		eventBus: () => createEventBus<CanvasEventBusEvents>(),
		fallbackNodes: () => [],
		showFallbackNodes: true,
		suppressInteraction: false,
		stripedBackground: true,
		groupExpansionMode: undefined,
	},
);

const canvasRef = useTemplateRef('canvas');
const $style = useCssModule();
const workflowDocumentStore = injectWorkflowDocumentStore();

// `useWorkflowDocumentRenderData` is side-effectful (subscribes to the document
// store and creates per-node effect scopes), so it must run once per document
// id inside a scope we own — not inside a re-evaluating `computed`. We rebuild
// it only when the document id actually changes, stopping the previous scope
// (which runs the composable's teardown). The `watch` callback runs outside
// reactive tracking, so the composable's internal reactive reads don't cause
// re-invocation.
const renderData = shallowRef<CanvasRenderData>(createEmptyCanvasRenderData());
let renderDataScope: EffectScope | undefined;
watch(
	() => workflowDocumentStore.value.documentId,
	(documentId) => {
		renderDataScope?.stop();
		renderDataScope = effectScope(true);
		renderDataScope.run(() => {
			renderData.value = useWorkflowDocumentRenderData(documentId);
		});
	},
	{ immediate: true },
);
onScopeDispose(() => renderDataScope?.stop());

const { onNodesInitialized, viewport, viewportRef, getNodes, fitBounds } = useVueFlow(props.id);

const posthogStore = usePostHog();
const isSubWorkflowGroupsEnabled = computed(() =>
	posthogStore.isFeatureEnabled(SUB_WORKFLOW_GROUPS_EXPERIMENT.name),
);

// Sub-workflow group expansion is tracked in memory, keyed by host node id,
// separately from real-group view state.
const expandedSubWorkflowHostIds = ref(new Set<string>());
const subWorkflowGroupView = {
	isExpanded: (hostId: string) => expandedSubWorkflowHostIds.value.has(hostId),
	toggle: (hostId: string) => {
		const next = new Set(expandedSubWorkflowHostIds.value);
		if (next.has(hostId)) next.delete(hostId);
		else next.add(hostId);
		expandedSubWorkflowHostIds.value = next;
	},
};
provide(SubWorkflowGroupViewKey, subWorkflowGroupView);

const subWorkflowGroups = useCanvasSubWorkflowGroups({
	nodes: computed(() => workflowDocumentStore.value.allNodes),
	isGroupExpanded: subWorkflowGroupView.isExpanded,
	getCurrentWorkflowId: () => workflowDocumentStore.value.documentId.split('@')[0],
});
const subWorkflowHostIds = computed(() =>
	isSubWorkflowGroupsEnabled.value ? subWorkflowGroups.hostNodeIds.value : new Set<string>(),
);

const nodes = computed(() => {
	const base = props.showFallbackNodes
		? [...workflowDocumentStore.value.allNodes, ...props.fallbackNodes]
		: [...workflowDocumentStore.value.allNodes];
	return isSubWorkflowGroupsEnabled.value
		? [...base, ...subWorkflowGroups.phantomNodes.value]
		: base;
});
const connections = computed(() =>
	isSubWorkflowGroupsEnabled.value
		? {
				...workflowDocumentStore.value.connectionsBySourceNode,
				...subWorkflowGroups.phantomConnections.value,
			}
		: workflowDocumentStore.value.connectionsBySourceNode,
);

const nodeGroupView = useCanvasNodeGroupView({
	workflowId: () => workflowDocumentStore.value.documentId.split('@')[0],
	getCurrentGroupIds: () => workflowDocumentStore.value.allGroups.map((group) => group.id),
	onNodeGroupsChange: (handler) => workflowDocumentStore.value.onNodeGroupsChange(handler),
	getGroupExpansionMode: () => props.groupExpansionMode,
	getExternalExpandedGroupIds: () => [...expandedSubWorkflowHostIds.value],
});

// Keep the group view in sync with the currently displayed document
watch(
	() => workflowDocumentStore.value.documentId,
	() => {
		nodeGroupView.reinitialize();
		applyGroupExpansion();
	},
);

const allGroups = computed(() => workflowDocumentStore.value.allGroups);
const readOnlyRef = computed(() => props.readOnly ?? false);
const suppressInteractionRef = computed(() => props.suppressInteraction ?? false);

const experimentalNdvStore = useExperimentalNdvStore();
const isExperimentalNdvActive = computed(() => experimentalNdvStore.isActive(viewport.value.zoom));

// Phantom nodes aren't in the document store, so overlay their render data
// (icon/type and input/output ports) so the canvas renders them with proper
// handles. Other render-data maps default to empty for read-only phantoms.
const mergedRenderData = computed<CanvasRenderData>(() => {
	const base = renderData.value;
	const phantoms = subWorkflowGroups.phantomNodes.value;
	if (!isSubWorkflowGroupsEnabled.value || phantoms.length === 0) return base;
	const asRefs = <T,>(entries: Map<string, T>) =>
		[...entries].map(([id, value]) => [id, computed(() => value)] as const);
	return {
		...base,
		renderTypeByNodeId: new Map([
			...base.renderTypeByNodeId,
			...asRefs(subWorkflowGroups.phantomRenderById.value),
		]),
		nodeInputsByNodeId: new Map([
			...base.nodeInputsByNodeId,
			...asRefs(subWorkflowGroups.phantomInputsById.value),
		]),
		nodeOutputsByNodeId: new Map([
			...base.nodeOutputsByNodeId,
			...asRefs(subWorkflowGroups.phantomOutputsById.value),
		]),
	};
});

const {
	nodes: mappedWorkflowNodes,
	connections: mappedConnections,
	nodeDisplaySizeById,
	getNodeExecutionSnapshot,
} = useCanvasMapping({
	nodes,
	connections,
	renderData: mergedRenderData,
	allGroups,
	nodeGroupView,
	isExperimentalNdvActive,
});

const groupIdsToExpand = computed(() => {
	switch (props.groupExpansionMode) {
		case 'all':
			return allGroups.value.map((group) => group.id);
		case 'errored':
			return allGroups.value
				.filter(
					(group) => aggregateGroupExecution(group.nodeIds, getNodeExecutionSnapshot) === 'error',
				)
				.map((group) => group.id);
		default:
			return [];
	}
});

function applyGroupExpansion() {
	for (const id of groupIdsToExpand.value) {
		nodeGroupView.setGroupExpanded(id, true);
	}
}

watch(groupIdsToExpand, applyGroupExpansion, { immediate: true });

const layoutComponents = computed(() => {
	// Real groups always drive the push algorithm; expanded sub-workflow groups
	// only join when the sub-workflow groups experiment is enabled.
	const subGroups = isSubWorkflowGroupsEnabled.value ? subWorkflowGroups.layoutGroups.value : [];
	const allLayoutGroups = [...workflowDocumentStore.value.allGroups, ...subGroups];
	// Without groups there can be no pushes — skip building per-node components.
	if (allLayoutGroups.length === 0) return [];
	const subHostIds = subWorkflowHostIds.value;
	return buildNodeGroupLayoutComponents({
		allGroups: allLayoutGroups,
		nodes: nodes.value,
		getNodeById: (id) =>
			subWorkflowGroups.phantomById.value.get(id) ?? workflowDocumentStore.value.getNodeById(id),
		getNodeDisplaySize: (id) => nodeDisplaySizeById.value[id],
		isGroupCollapsed: (id) =>
			subHostIds.has(id)
				? !subWorkflowGroupView.isExpanded(id)
				: nodeGroupView.isGroupCollapsed(id),
	});
});

watch(layoutComponents, (components) => nodeGroupView.syncLayoutComponents(components), {
	immediate: true,
});

const mappedGroupVueFlowNodes = computed(() =>
	mapGroupsToVueFlowNodes({
		allGroups: allGroups.value,
		getNodeById: (id) => workflowDocumentStore.value.getNodeById(id),
		getNodeDisplaySize: (id) => nodeDisplaySizeById.value[id],
		getGroupVisualOffset: (id) => nodeGroupView.getVisualOffsetForComponent(id),
		isGroupCollapsed: (id) => nodeGroupView.isGroupCollapsed(id),
		readOnly: readOnlyRef.value || suppressInteractionRef.value,
		getNodeExecutionSnapshot,
	}),
);

const mappedNodes = computed(() => {
	const hiddenHosts = subWorkflowHostIds.value;
	const phantoms = subWorkflowGroups.phantomById.value;
	const workflowNodes = mappedWorkflowNodes.value.map((n) => {
		// Host nodes are replaced by their group; phantom labels drop the namespace.
		if (hiddenHosts.has(n.id)) return { ...n, hidden: true };
		if (phantoms.has(n.id) && typeof n.label === 'string') {
			return { ...n, label: phantomDisplayName(n.label) };
		}
		return n;
	});
	return [
		...workflowNodes,
		...mappedGroupVueFlowNodes.value,
		...(isSubWorkflowGroupsEnabled.value ? subWorkflowGroups.groupNodes.value : []),
	];
});

const mappedConnectionsWithBoundary = computed(() =>
	isSubWorkflowGroupsEnabled.value
		? subWorkflowGroups.remapBoundaryConnections(mappedConnections.value)
		: mappedConnections.value,
);

provide(NodeGroupViewKey, nodeGroupView);

const initialFitViewDone = ref(false); // Workaround for https://github.com/bcakmakoglu/vue-flow/issues/1636
const { off } = onNodesInitialized(() => {
	if (!initialFitViewDone.value) {
		if (!props.initialViewport) {
			props.eventBus.emit('fitView');
		}
		initialFitViewDone.value = true;
		off();
	}
});

const mappedNodesThrottled = throttledRef(mappedNodes, 200);
const mappedConnectionsThrottled = throttledRef(mappedConnectionsWithBoundary, 200);

defineExpose({
	executeContextMenuAction: (action: ContextMenuAction, nodeIds: string[]) =>
		canvasRef.value?.executeContextMenuAction(action, nodeIds),
	ensureNodesAreVisible: (ids: string[]) => {
		const canvasElement = viewportRef.value;

		if (!canvasElement) {
			return;
		}

		// Find nodes by IDs
		const targetNodes = getNodes.value.filter((node) => ids.includes(node.id));

		if (targetNodes.length === 0) {
			return;
		}

		const insertionDone = onNodesInitialized(() => {
			// Get the current viewport after nodes are initialized
			const vp = viewport.value;
			const canvasWidth = canvasElement.clientWidth;
			const canvasHeight = canvasElement.clientHeight;

			// Get the rect of the newly added nodes
			const nodesRect = getRectOfNodes(targetNodes);

			// Check if nodes are visible in current viewport
			const screenX = nodesRect.x * vp.zoom + vp.x;
			const screenY = nodesRect.y * vp.zoom + vp.y;
			const screenWidth = nodesRect.width * vp.zoom;
			const screenHeight = nodesRect.height * vp.zoom;

			const isFullyVisible =
				screenX >= 0 &&
				screenY >= 0 &&
				screenX + screenWidth <= canvasWidth &&
				screenY + screenHeight <= canvasHeight;

			if (!isFullyVisible) {
				// Calculate viewport bounds in canvas coordinates
				const viewportRect = {
					x: -vp.x / vp.zoom,
					y: -vp.y / vp.zoom,
					width: canvasWidth / vp.zoom,
					height: canvasHeight / vp.zoom,
				};

				// Combine current viewport with nodes rect
				const minX = Math.min(viewportRect.x, nodesRect.x);
				const minY = Math.min(viewportRect.y, nodesRect.y);
				const maxX = Math.max(viewportRect.x + viewportRect.width, nodesRect.x + nodesRect.width);
				const maxY = Math.max(viewportRect.y + viewportRect.height, nodesRect.y + nodesRect.height);

				const combinedRect = {
					x: minX,
					y: minY,
					width: maxX - minX,
					height: maxY - minY,
				};

				void fitBounds(combinedRect, { padding: 0.15, duration: 100 });
			}

			props.eventBus.emit('nodes:select', { ids });
			insertionDone.off();
		});
	},
});
</script>

<template>
	<div :class="$style.wrapper" data-test-id="canvas-wrapper">
		<div id="canvas" :class="$style.canvas">
			<Canvas
				:id="id"
				ref="canvas"
				:nodes="executing ? mappedNodesThrottled : mappedNodes"
				:connections="executing ? mappedConnectionsThrottled : mappedConnectionsWithBoundary"
				:render-data="mergedRenderData"
				:node-display-size-by-id="nodeDisplaySizeById"
				:event-bus="eventBus"
				:read-only="readOnly"
				:can-execute="canExecute"
				:executing="executing"
				:suppress-interaction="suppressInteraction"
				:striped-background="stripedBackground"
				:initial-viewport="initialViewport"
				v-bind="$attrs"
			/>
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.canvas {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
	align-items: stretch;
	justify-content: stretch;
	background-color: var(--canvas--color--background);
}
</style>
