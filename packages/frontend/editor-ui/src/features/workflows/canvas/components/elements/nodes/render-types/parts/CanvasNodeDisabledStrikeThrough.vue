<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { useCanvasNode } from '../../../../../composables/useCanvasNode';
import { CanvasNodeRenderType } from '../../../../../canvas.types';

const $style = useCssModule();

const { hasRunData, render } = useCanvasNode();

const classes = computed(() => {
	return {
		[$style.disabledStrikeThrough]: true,
		[$style.success]: hasRunData.value,
		[$style.warning]:
			render.value.type === CanvasNodeRenderType.Default &&
			render.value.options.dirtiness !== undefined,
	};
});
</script>

<template>
	<div :class="classes"></div>
</template>

<style lang="scss" module>
.disabledStrikeThrough {
	border: 1px solid var(--color--foreground--shade-1);
	position: absolute;
	top: calc(var(--canvas-node--height) / 2 - 1px);
	left: -4px;
	width: calc(100% + 12px);
	pointer-events: none;
}

.success {
	border-color: var(--color--success--tint-1);
}

.warning {
	border-color: var(--color--warning--tint-1);
}
</style>
