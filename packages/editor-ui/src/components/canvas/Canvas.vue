<script lang="ts" setup>
import type { CanvasConnection, CanvasConnectionPort, CanvasElement } from '@/types';
import type { EdgeChange, NodeChange } from '@vue-flow/core';
import { useVueFlow, VueFlow } from '@vue-flow/core';
import CanvasNode from './elements/CanvasNode.vue';

const emit = defineEmits(['update:modelValue']);

const props = withDefaults(
	defineProps<{
		id: string;
		elements: CanvasElement[];
		connections: CanvasConnection[];
	}>(),
	{
		id: 'canvas',
		elements: () => [],
		connections: () => [],
	},
);

const { onInit } = useVueFlow({ id: props.id });

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
	<div class="canvas-wrapper">
		<VueFlow
			:id="id"
			:nodes="elements"
			:edges="connections"
			fit-view-on-init
			:apply-changes="false"
			@nodes-change="onNodesChange"
			@edges-change="onConnectionsChange"
		>
			<template #node-canvas-node="canvasNodeProps">
				<CanvasNode v-bind="canvasNodeProps" />
			</template>

			<!--			&lt;!&ndash; bind your custom edge type to a component by using slots, slot names are always `edge-<type>` &ndash;&gt;-->
			<!--			<template #edge-special="specialEdgeProps">-->
			<!--				<SpecialEdge v-bind="specialEdgeProps" />-->
			<!--			</template>-->
		</VueFlow>
	</div>
</template>

<style lang="scss">
.canvas-wrapper {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
}
</style>
