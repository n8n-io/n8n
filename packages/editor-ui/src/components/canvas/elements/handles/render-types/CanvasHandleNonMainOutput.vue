<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { computed, useCssModule } from 'vue';

const $style = useCssModule();
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
		<CanvasHandleDiamond :handle-classes="handleClasses" />
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
	transform: translate(-50%, 0);
	font-size: var(--font-size-2xs);
	color: var(--node-type-supplemental-color);
	background: var(--color-canvas-label-background);
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
