<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { CanvasElementData } from '@/types';
import { useNodeConnections } from '@/composables/useNodeConnections';

const props = defineProps<{
	nodeType: INodeTypeDescription;
	data: CanvasElementData;
}>();

const $style = useCssModule();

const inputs = computed(() => props.data.inputs);
const outputs = computed(() => props.data.outputs);

const { mainOutputs } = useNodeConnections({
	inputs,
	outputs,
});

/**
 * Styles
 */

const styles = computed(() => {
	return {
		'--node-main-output-count': mainOutputs.value.length,
	};
});
</script>

<template>
	<div :class="$style.canvasNode" :style="styles">
		<slot />
	</div>
</template>

<style lang="scss" module>
.canvasNode {
	height: calc(100px + max(0, var(--node-main-output-count, 1) - 4) * 20px);
	width: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--color-canvas-node-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	border-radius: var(--border-radius-large);
}
</style>
