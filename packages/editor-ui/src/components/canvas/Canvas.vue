<script lang="ts" setup>
import type { CanvasConnection, CanvasElement } from '@/types';
import type { EdgeChange, NodeChange, PanelPositionType } from '@vue-flow/core';
import { useVueFlow, VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { ControlButton, Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import CanvasNode from './elements/CanvasNode.vue';
import { useCssModule } from 'vue';

const $style = useCssModule();

const $emit = defineEmits(['update:modelValue']);

const props = withDefaults(
	defineProps<{
		id: string;
		elements: CanvasElement[];
		connections: CanvasConnection[];
		controlsPosition: PanelPositionType;
	}>(),
	{
		id: 'canvas',
		elements: () => [],
		connections: () => [],
		controlsPosition: 'bottom-left',
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

			<!--			&lt;!&ndash; bind your custom edge type to a component by using slots, slot names are always `edge-<type>` &ndash;&gt;-->
			<!--			<template #edge-special="specialEdgeProps">-->
			<!--				<SpecialEdge v-bind="specialEdgeProps" />-->
			<!--			</template>-->

			<Background pattern-color="#aaa" :gap="16" />

			<MiniMap />

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
