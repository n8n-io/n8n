<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { CanvasNodeKey } from '@/constants';

const node = inject(CanvasNodeKey);

const $style = useCssModule();

const label = computed(() => node?.label.value ?? '');
const inputs = computed(() => node?.data.value.inputs ?? []);
const outputs = computed(() => node?.data.value.outputs ?? []);

const { mainOutputs } = useNodeConnections({
	inputs,
	outputs,
});

const classes = computed(() => {
	return {
		[$style.node]: true,
		[$style.selected]: node?.selected.value,
	};
});

const styles = computed(() => {
	return {
		'--node-main-output-count': mainOutputs.value.length,
	};
});
</script>

<template>
	<div v-if="node" :class="classes" :style="styles" data-test-id="canvas-node-default">
		<slot />
		<div v-if="label" :class="$style.label">{{ label }}</div>
	</div>
</template>

<style lang="scss" module>
.node {
	height: calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 50px);
	width: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-canvas-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);
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

.selected {
	box-shadow: 0 0 0 4px var(--color-canvas-selected);
}
</style>
