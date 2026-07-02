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
import { buildNodeGroupLayoutComponents } from '../composables/useCanvasNodeGroupLayout';
import Canvas from './Canvas.vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowDocumentRenderData } from '@/app/stores/workflowDocument/useWorkflowDocumentRenderData';
import { useExperimentalNdvStore } from '../experimental/experimentalNdv.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { CANVAS_NODES_GROUPING_EXPERIMENT } from '@/app/constants';

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

const nodes = computed(() => {
	return props.showFallbackNodes
		? [...workflowDocumentStore.value.allNodes, ...props.fallbackNodes]
		: workflowDocumentStore.value.allNodes;
});
const connections = computed(() => workflowDocumentStore.value.connectionsBySourceNode);

const posthogStore = usePostHog();
const isCanvasNodeGroupingEnabled = computed(() =>
	posthogStore.isFeatureEnabled(CANVAS_NODES_GROUPING_EXPERIMENT.name),
);

const nodeGroupView = useCanvasNodeGroupView({
	workflowId: () => workflowDocumentStore.value.documentId.split('@')[0],
	getCurrentGroupIds: () => workflowDocumentStore.value.allGroups.map((group) => group.id),
	onNodeGroupsChange: (handler) => workflowDocumentStore.value.onNodeGroupsChange(handler),
	isGroupingEnabled: () => isCanvasNodeGroupingEnabled.value,
	getGroupExpansionMode: () => props.groupExpansionMode,
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

const {
	nodes: mappedWorkflowNodes,
	connections: mappedConnections,
	nodeDisplaySizeById,
	getNodeExecutionSnapshot,
} = useCanvasMapping({
	nodes,
	connections,
	renderData,
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

const layoutComponents = computed(() =>
	// Without grouping enabled or without groups there can be no pushes —
	// skip building per-node components.
	!isCanvasNodeGroupingEnabled.value || workflowDocumentStore.value.allGroups.length === 0
		? []
		: buildNodeGroupLayoutComponents({
				allGroups: workflowDocumentStore.value.allGroups,
				nodes: nodes.value,
				getNodeById: (id) => workflowDocumentStore.value.getNodeById(id),
				getNodeDisplaySize: (id) => nodeDisplaySizeById.value[id],
				isGroupCollapsed: (id) => nodeGroupView.isGroupCollapsed(id),
			}),
);

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

const mappedNodes = computed(() => [
	...mappedWorkflowNodes.value,
	...mappedGroupVueFlowNodes.value,
]);

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
const mappedConnectionsThrottled = throttledRef(mappedConnections, 200);

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
				:connections="executing ? mappedConnectionsThrottled : mappedConnections"
				:render-data="renderData"
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
