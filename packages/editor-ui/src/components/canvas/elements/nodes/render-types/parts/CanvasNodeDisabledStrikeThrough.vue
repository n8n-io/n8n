<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { useCanvasNode } from '@/composables/useCanvasNode';

const $style = useCssModule();

const { hasRunData } = useCanvasNode();

const classes = computed(() => {
	return {
		[$style.disabledStrikeThrough]: true,
		[$style.success]: hasRunData.value,
	};
});
</script>

<template>
	<div :class="classes"></div>
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
