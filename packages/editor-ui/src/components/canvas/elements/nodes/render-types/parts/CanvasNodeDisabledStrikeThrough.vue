<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { useNodeConnections } from '@/composables/useNodeConnections';
import { useCanvasNode } from '@/composables/useCanvasNode';

const $style = useCssModule();

const { inputs, outputs, connections } = useCanvasNode();
const { mainInputConnections, mainOutputConnections } = useNodeConnections({
	inputs,
	outputs,
	connections,
});

const isVisible = computed(
	() => mainInputConnections.value.length === 1 && mainOutputConnections.value.length === 1,
);

const isSuccessStatus = computed(
	() => false,
	// @TODO Implement this
	// () => !['unknown'].includes(node.status) && workflowDataItems > 0,
);

const classes = computed(() => {
	return {
		[$style.disabledStrikeThrough]: true,
		[$style.success]: isSuccessStatus.value,
	};
});
</script>

<template>
	<div v-if="isVisible" :class="classes"></div>
</template>

<style lang="scss" module>
.disabledStrikeThrough {
	border: 1px solid var(--color-foreground-dark);
	position: absolute;
	top: calc(var(--canvas-node--height) / 2 - 1px);
	left: -4px;
	width: calc(100% + 12px);
	pointer-events: none;
}

.success {
	border-color: var(--color-success-light);
}
</style>
