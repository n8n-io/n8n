<script lang="ts" setup>
import type { CanvasConnection, CanvasElement } from '@/types';
import type { EdgeChange, NodeChange } from '@vue-flow/core';
import { useVueFlow, VueFlow, PanelPosition } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import CanvasNode from './elements/nodes/CanvasNode.vue';
import CanvasEdge from './elements/edges/CanvasEdge.vue';
import { useCssModule } from 'vue';

const $style = useCssModule();

const $emit = defineEmits(['update:modelValue']);

const props = withDefaults(
	defineProps<{
		id?: string;
		elements: CanvasElement[];
		connections: CanvasConnection[];
		controlsPosition?: PanelPosition;
	}>(),
	{
		id: 'canvas',
		elements: () => [],
		connections: () => [],
		controlsPosition: PanelPosition.BottomLeft,
	},
);

const { onInit, setViewport } = useVueFlow({ id: props.id });

onInit((instance) => {
	console.log(instance);
});

function onNodesChange(e: NodeChange[]) {
	console.log('onNodesChange', e);
}

function onConnectionsChange(e: EdgeChange[]) {
	console.log('onConnectionsChange', e);
}
</script>

<template>
	<div :class="$style.canvasWrapper">
		<VueFlow
			:id="id"
			:nodes="elements"
			:edges="connections"
			:apply-changes="false"
			fit-view-on-init
			:min-zoom="0.2"
			:max-zoom="4"
			@nodes-change="onNodesChange"
			@edges-change="onConnectionsChange"
		>
			<template #node-canvas-node="canvasNodeProps">
				<CanvasNode v-bind="canvasNodeProps" />
			</template>

			<template #edge-canvas-edge="canvasEdgeProps">
				<CanvasEdge v-bind="canvasEdgeProps" />
			</template>

			<Background pattern-color="#aaa" :gap="16" />

			<MiniMap pannable />

			<Controls :class="$style.canvasControls" :position="controlsPosition"></Controls>
		</VueFlow>
	</div>
</template>

<style lang="scss" module>
.canvasWrapper {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
}

.canvasControls {
	display: flex;
}
</style>
