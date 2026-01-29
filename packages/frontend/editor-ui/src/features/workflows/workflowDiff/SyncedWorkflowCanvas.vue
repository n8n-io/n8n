<script setup lang="ts">
import CanvasBackground from '@/features/workflows/canvas/components/elements/background/CanvasBackground.vue';
import { useInjectViewportSync } from '@/features/workflows/workflowDiff/useViewportSync';
import type {
	CanvasConnection,
	CanvasEventBusEvents,
	CanvasNode,
} from '@/features/workflows/canvas/canvas.types';
import type { CanvasLayoutEvent } from '@/features/workflows/canvas/composables/useCanvasLayout';
import { useVueFlow } from '@vue-flow/core';
import { watch } from 'vue';
import Canvas from '@/features/workflows/canvas/components/Canvas.vue';
import { createEventBus } from '@n8n/utils/event-bus';

const props = defineProps<{
	id: string;
	nodes: CanvasNode[];
	connections: CanvasConnection[];
	applyLayout?: boolean;
}>();

// Create eventBus for this canvas to communicate with Canvas component
const eventBus = createEventBus<CanvasEventBusEvents>();
const {
	setViewport,
	onViewportChange: onLocalViewportChange,
	onNodeClick,
	fitView,
	findNode,
	addSelectedNodes,
	onPaneClick,
	onNodesInitialized,
	updateNode,
} = useVueFlow({ id: props.id });

// Trigger tidy-up after nodes are initialized if applyLayout is true
onNodesInitialized(() => {
	if (props.applyLayout) {
		eventBus.emit('tidyUp', { source: 'import-workflow-data' });
	}
});

/**
 * Calculate the offset needed to shift nodes so the topmost-leftmost node is at origin.
 * Finds the anchor node (smallest Y, then smallest X) and returns the negative of its position.
 */
function calculateOriginOffset(nodes: Array<{ x: number; y: number }>): { x: number; y: number } {
	if (nodes.length === 0) return { x: 0, y: 0 };

	let minX = nodes[0].x;
	let minY = nodes[0].y;

	for (const node of nodes) {
		if (node.y < minY || (node.y === minY && node.x < minX)) {
			minX = node.x;
			minY = node.y;
		}
	}

	return { x: -minX, y: -minY };
}

// Apply calculated positions when Canvas emits tidy-up event
// Shift all nodes so the leftmost topmost node is at origin {x: 0, y: 0}
// This ensures both canvases in the diff view have aligned anchor nodes
async function onTidyUp({ result }: CanvasLayoutEvent) {
	const offset = calculateOriginOffset(result.nodes);

	result.nodes.forEach(({ id, x, y }) => {
		updateNode(id, { position: { x: x + offset.x, y: y + offset.y } });
	});

	// Zoom to fit after positions are updated
	setTimeout(() => {
		void fitView({ padding: 1 });
	}, 100);
}

const { triggerViewportChange, onViewportChange, selectedDetailId, triggerNodeClick } =
	useInjectViewportSync();

/**
 * Flag to ignore viewport changes triggered by remote updates,
 * preventing infinite sync loops between canvases
 */
let isApplyingRemoteUpdate = false;

onLocalViewportChange((vp) => {
	if (isApplyingRemoteUpdate) return;
	triggerViewportChange({
		from: props.id,
		viewport: vp,
	});
});

onViewportChange(({ from, viewport }) => {
	if (from === props.id) return; // Ignore self
	isApplyingRemoteUpdate = true;
	void setViewport(viewport);
	requestAnimationFrame(() => (isApplyingRemoteUpdate = false));
});

onNodeClick(({ node }) => triggerNodeClick(node.id));

onPaneClick(() => {
	setTimeout(() => {
		// prevent pane clicks from deselecting nodes
		const node = findNode(selectedDetailId.value);
		if (!node) {
			addSelectedNodes([]);
			return;
		}
		addSelectedNodes([node]);
	}, 0);
});

watch(selectedDetailId, (id) => {
	const node = findNode(id);
	if (!node) {
		addSelectedNodes([]); // Clear selection if node not found
		return;
	}
	addSelectedNodes([node]); // Add node to selection
	const desiredPixelPadding = node.dimensions.height * 5;
	const nodeBoundingSize = Math.max(node.dimensions.width, node.dimensions.height);
	const paddingRatio = desiredPixelPadding / nodeBoundingSize;
	void fitView({ nodes: [node.id], padding: paddingRatio, duration: 500 });
});
</script>

<template>
	<div style="width: 100%; height: 100%; position: relative">
		<Canvas
			:id
			:nodes
			:connections
			:read-only="true"
			:event-bus="eventBus"
			style="width: 100%; height: 100%"
			@tidy-up="onTidyUp"
		>
			<template #node="{ nodeProps }">
				<slot name="node" v-bind="{ nodeProps }" />
			</template>
			<template #edge="{ edgeProps, arrowHeadMarkerId }">
				<slot name="edge" v-bind="{ edgeProps, arrowHeadMarkerId }" />
			</template>
			<template #canvas-background="{ viewport }">
				<CanvasBackground :striped="false" :viewport="viewport" />
			</template>
		</Canvas>
	</div>
</template>
