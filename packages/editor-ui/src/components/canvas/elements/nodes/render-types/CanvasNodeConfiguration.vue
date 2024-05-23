<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { CanvasNodeKey } from '@/constants';

const node = inject(CanvasNodeKey);

const $style = useCssModule();

const label = computed(() => node?.label.value ?? '');

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: node?.selected.value,
	};
});
</script>

<template>
	<div :class="classes" data-test-id="canvas-node-configuration">
		<slot />
		<div v-if="label" :class="$style.label">{{ label }}</div>
	</div>
</template>

<style lang="scss" module>
.node {
	width: 75px;
	height: 75px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--node-type-supplemental-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-dark));
	border-radius: 50%;
}

.selected {
	box-shadow: 0 0 0 4px var(--color-canvas-selected);
}

.label {
	top: 100%;
	position: absolute;
	font-size: var(--font-size-m);
	text-align: center;
	width: 100%;
	min-width: 200px;
	margin-top: var(--spacing-2xs);
}
</style>
