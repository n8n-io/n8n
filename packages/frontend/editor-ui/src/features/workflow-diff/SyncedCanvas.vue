<script setup lang="ts">
import NodeSettings from '@/components/NodeSettings.vue';
import type { CanvasConnection, CanvasNode } from '@/types';
import { useVueFlow } from '@vue-flow/core';
import { useInjectViewportSync } from './viewport.sync';

const props = defineProps<{
	id: string;
	nodes: CanvasNode[];
	connections: CanvasConnection[];
}>();

const {
	setViewport,
	onViewportChange: onLocalViewportChange,
	onNodeClick,
	onNodesInitialized,
} = useVueFlow({ id: props.id });

onNodesInitialized(() => {
	console.log('initialized');
});
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
	setViewport(viewport);
	requestAnimationFrame(() => (isApplyingRemoteUpdate = false));
});

onNodeClick(({ event, node }) => {
	selectedDetailId.value = node.id; // Set selected node ID for details drawer
	// detailIsOpen.value = true; // Open details drawer on node click
	console.log('Node clicked:', event, node);
});
</script>

<template>
	<div style="width: 100%; height: 100%; position: relative">
		<div
			v-if="selectedDetailId"
			style="
				position: absolute;
				top: 0;
				right: 0;
				width: 100%;
				height: 100%;
				z-index: 1000;
				display: flex;
				align-items: center;
				justify-content: center;
				background: #00000026;
			"
			@click.self="selectedDetailId = undefined"
		>
			<!-- Placeholder for details drawer, can be replaced with actual component -->
			<div style="background: white; padding: 10px; border: 1px solid #ccc">
				<NodeSettings />
			</div>
		</div>
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
