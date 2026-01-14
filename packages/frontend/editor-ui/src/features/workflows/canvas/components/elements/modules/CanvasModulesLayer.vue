<script setup lang="ts">
import { computed } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { CanvasModule } from '../../../canvas.types';
import CanvasModuleComponent from './CanvasModule.vue';

defineProps<{
	modules: CanvasModule[];
}>();

const emit = defineEmits<{
	toggleCollapse: [moduleName: string];
}>();

const { viewport } = useVueFlow();

const transformStyle = computed(() => ({
	transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
	transformOrigin: '0 0',
}));

function onToggleCollapse(moduleName: string) {
	emit('toggleCollapse', moduleName);
}
</script>

<template>
	<div class="canvas-modules-layer">
		<div class="canvas-modules-viewport" :style="transformStyle">
			<CanvasModuleComponent
				v-for="module in modules"
				:key="module.name"
				:module="module"
				@toggle-collapse="onToggleCollapse"
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
	pointer-events: none;
	overflow: hidden;
}

.canvas-modules-viewport {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}
</style>
