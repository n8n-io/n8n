<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { CanvasElementData } from '@/types';
import { NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS } from '@/constants';
import { useNodeConnections } from '@/composables/useNodeConnections';

const props = defineProps<{
	nodeType: INodeTypeDescription;
	data: CanvasElementData;
}>();

const $style = useCssModule();

const inputs = computed(() => props.data.inputs);
const outputs = computed(() => props.data.outputs);

const { nonMainInputs, requiredNonMainInputs } = useNodeConnections({
	inputs,
	outputs,
});

const styles = computed(() => {
	const styles: {
		[key: string]: string | number;
	} = {};

	if (requiredNonMainInputs.value.length > 0) {
		let spacerCount = 0;
		if (NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS) {
			const requiredNonMainInputsCount = requiredNonMainInputs.value.length;
			const optionalNonMainInputsCount = nonMainInputs.value.length - requiredNonMainInputsCount;
			spacerCount = requiredNonMainInputsCount > 0 && optionalNonMainInputsCount > 0 ? 1 : 0;
		}

		styles['--configurable-node-input-count'] = nonMainInputs.value.length + spacerCount;
	}

	return styles;
});
</script>

<template>
	<div :class="$style.canvasNodeConfiguration" :style="styles">
		<slot />
	</div>
</template>

<style lang="scss" module>
.canvasNodeConfiguration {
	--configurable-node-min-input-count: 4;
	--configurable-node-input-width: 65px;

	width: calc(
		max(var(--configurable-node-input-count, 5), var(--configurable-node-min-input-count)) *
			var(--configurable-node-input-width)
	);
	height: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-canvas-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);
}
</style>
