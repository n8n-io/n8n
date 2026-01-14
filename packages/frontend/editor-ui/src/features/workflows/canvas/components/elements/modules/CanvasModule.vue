<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import type { CanvasModule } from '../../../canvas.types';
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';

const props = defineProps<{
	module: CanvasModule;
}>();

const emit = defineEmits<{
	toggleCollapse: [moduleName: string];
}>();

const $style = useCssModule();

const headerHeight = GRID_SIZE * 5;

const moduleStyle = computed(() => ({
	transform: `translate(${props.module.boundingBox.x}px, ${props.module.boundingBox.y}px)`,
	width: `${props.module.boundingBox.width}px`,
	height: `${props.module.boundingBox.height}px`,
}));

const headerStyle = computed(() => ({
	height: `${headerHeight}px`,
}));

function onToggleCollapse() {
	emit('toggleCollapse', props.module.name);
}
</script>

<template>
	<div :class="$style.module" :style="moduleStyle" data-test-id="canvas-module">
		<div :class="$style.header" :style="headerStyle" @click="onToggleCollapse">
			<div :class="$style.headerContent">
				<span :class="$style.name">{{ module.name }}</span>
				<span v-if="module.description" :class="$style.description">{{ module.description }}</span>
			</div>
		</div>
		<div :class="$style.body">
			<slot />
		</div>
	</div>
</template>

<style lang="scss" module>
.module {
	position: absolute;
	top: 0;
	left: 0;
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--tint-1);
	pointer-events: none;
	z-index: -50;
}

.header {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: 1px dashed var(--color--foreground);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	pointer-events: auto;
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-3);
	}
}

.headerContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	overflow: hidden;
}

.name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.body {
	flex: 1;
	position: relative;
}
</style>
