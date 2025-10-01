<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { computed, useCssModule } from 'vue';

const $style = useCssModule();
const { executionStatus, hasPinnedData } = useCanvasNode();
const { label, isRequired } = useCanvasNodeHandle();

const handleClasses = 'source';

const classes = computed(() => ({
	'canvas-node-handle-non-main-output': true,
	[$style.handle]: true,
	[$style.required]: isRequired.value,
}));
</script>
<template>
	<div :class="classes">
		<div :class="$style.label">{{ label }}</div>
		<CanvasHandleDiamond
			:handle-classes="handleClasses"
			:execution-status="executionStatus"
			:has-pinned-data="hasPinnedData"
		/>
	</div>
</template>

<style lang="scss" module>
.handle {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}

.label {
	position: absolute;
	top: -20px;
	left: 50%;
	transform: translate(-50%, 0) scale(var(--canvas-zoom-compensation-factor, 1));
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--canvas--background);
	z-index: 0;
	white-space: nowrap;
}

.required .label::after {
	content: '*';
	color: var(--color-danger);
}

:global(.vue-flow__handle:not(.connectionindicator)) .plus {
	display: none;
	position: absolute;
}
</style>
