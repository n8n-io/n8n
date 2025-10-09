<script setup lang="ts">
import CanvasBackground from '@/components/canvas/elements/background/CanvasBackground.vue';
import { useInjectViewportSync } from '@/features/workflow-diff/useViewportSync';
import type { CanvasConnection, CanvasNode } from '@/types';
import { useVueFlow } from '@vue-flow/core';
import { watch } from 'vue';

const props = defineProps<{
	id: string;
	nodes: CanvasNode[];
	connections: CanvasConnection[];
}>();
const {
	setViewport,
	onViewportChange: onLocalViewportChange,
	onNodeClick,
	fitView,
	findNode,
	addSelectedNodes,
	onPaneClick,
} = useVueFlow({ id: props.id });

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
		<Canvas :id :nodes :connections :read-only="true" style="width: 100%; height: 100%">
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
