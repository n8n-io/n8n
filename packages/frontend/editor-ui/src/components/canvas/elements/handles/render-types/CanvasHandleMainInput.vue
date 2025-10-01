<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { computed, useCssModule } from 'vue';
import type { CanvasNodeDefaultRender } from '@/types';

const $style = useCssModule();

const { render, executionStatus, hasPinnedData } = useCanvasNode();
const { label, isRequired } = useCanvasNodeHandle();

const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);

const isDirty = computed(() => renderOptions.value.dirtiness !== undefined);

const classes = computed(() => ({
	'canvas-node-handle-main-input': true,
	[$style.handle]: true,
	[$style.required]: isRequired.value,
}));

const handleClasses = 'target';
</script>
<template>
	<div :class="classes">
		<div :class="[$style.label]">{{ label }}</div>
		<CanvasHandleDot
			:handle-classes="handleClasses"
			:execution-status="executionStatus"
			:has-pinned-data="hasPinnedData"
			:is-dirty="isDirty"
		/>
	</div>
</template>

<style lang="scss" module>
.handle {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.label {
	position: absolute;
	top: 50%;
	left: calc(var(--spacing-xs) * -1);
	transform: translate(0, -50%) scale(var(--canvas-zoom-compensation-factor, 1)) translate(-100%, 0);
	transform-origin: center left;
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--canvas--background);
	z-index: 1;
	text-align: center;
	white-space: nowrap;
}

.required .label::after {
	content: '*';
	color: var(--color-danger);
}
</style>
