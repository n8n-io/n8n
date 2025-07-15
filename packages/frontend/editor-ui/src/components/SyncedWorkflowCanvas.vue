<script setup lang="ts">
import { useInjectViewportSync } from '@/composables/useViewportSync';
import type { CanvasConnection, CanvasNode } from '@/types';
import { useVueFlow } from '@vue-flow/core';
import type { MaybeRefOrGetter } from 'vue';
import { watch } from 'vue';
const props = defineProps<{
	id: string;
	nodes: MaybeRefOrGetter<CanvasNode[]>;
	connections: MaybeRefOrGetter<CanvasConnection[]>;
}>();
const {
	setViewport,
	onViewportChange: onLocalViewportChange,
	onNodeClick,
	fitView,
	findNode,
} = useVueFlow({ id: props.id });
const { triggerViewportChange, onViewportChange, selectedDetailId } = useInjectViewportSync();

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

onNodeClick(({ event, node }) => {
	selectedDetailId.value = node.id; // Set selected node ID for details drawer
});

watch(selectedDetailId, (id) => {
	const node = findNode(id);
	if (!node) {
		return;
	}
	const desiredPixelPadding = node.dimensions.width * 3; // or node.height * 0.5
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
			<template #edge="{ edgeProps }">
				<slot name="edge" v-bind="{ edgeProps }" />
			</template>
		</Canvas>
	</div>
</template>
