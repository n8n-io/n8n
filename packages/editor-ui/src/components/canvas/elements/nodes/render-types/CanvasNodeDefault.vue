<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { CanvasNodeKey } from '@/constants';

const node = inject(CanvasNodeKey);

const $style = useCssModule();

const inputs = computed(() => node?.data.value.inputs ?? []);
const outputs = computed(() => node?.data.value.outputs ?? []);

const { mainOutputs } = useNodeConnections({
	inputs,
	outputs,
});

const classes = computed(() => {
	return {
		[$style.canvasNode]: true,
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
	<div :class="classes" :style="styles">
		<slot />
	</div>
</template>

<style lang="scss" module>
.canvasNode {
	height: calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 50px);
	width: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-canvas-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);
}

.selected {
	box-shadow: 0 0 0 4px var(--color-canvas-selected);
}
</style>
