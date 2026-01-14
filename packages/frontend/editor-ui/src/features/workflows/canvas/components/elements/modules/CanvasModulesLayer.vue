<script setup lang="ts">
import { computed } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { CanvasModule } from '../../../canvas.types';
import CanvasModuleComponent from './CanvasModule.vue';

const props = defineProps<{
	modules: CanvasModule[];
	onToggleCollapse?: (moduleName: string) => void;
	onModuleDrag?: (moduleName: string, delta: { dx: number; dy: number }) => void;
	onModuleDragEnd?: (moduleName: string) => void;
}>();

const { viewport } = useVueFlow();

const transformStyle = computed(() => ({
	transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
	transformOrigin: '0 0',
}));

const zoom = computed(() => viewport.value.zoom);

function handleToggleCollapse(moduleName: string) {
	props.onToggleCollapse?.(moduleName);
}

function handleDrag(moduleName: string, delta: { dx: number; dy: number }) {
	props.onModuleDrag?.(moduleName, delta);
}

function handleDragEnd(moduleName: string) {
	props.onModuleDragEnd?.(moduleName);
}
</script>

<template>
	<div class="canvas-modules-layer">
		<div class="canvas-modules-viewport" :style="transformStyle">
			<CanvasModuleComponent
				v-for="module in modules"
				:key="module.name"
				:module="module"
				:zoom="zoom"
				@toggle-collapse="handleToggleCollapse"
				@drag="handleDrag"
				@drag-end="handleDragEnd"
			/>
		</div>
	</div>
</template>

<style scoped>
.canvas-modules-layer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	/* Same z-index as vue-flow__panel (5) to ensure clicks work */
	z-index: 5;
	/* Allow clicks to pass through to canvas, except on interactive elements */
	pointer-events: none;
}

.canvas-modules-viewport {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}
</style>
