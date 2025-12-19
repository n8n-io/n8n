<script lang="ts" setup>
import { useCanvasNodeHandle } from '../../../../composables/useCanvasNodeHandle';
import { computed, useCssModule } from 'vue';
import CanvasHandleDot from './parts/CanvasHandleDot.vue';
import { useCanvas } from '../../../../composables/useCanvas';
import { useZoomAdjustedValues } from '../../../../composables/useZoomAdjustedValues';

const $style = useCssModule();

const { label, isRequired } = useCanvasNodeHandle();
const { viewport } = useCanvas();
const { calculateHandleLightness } = useZoomAdjustedValues(viewport);

const classes = computed(() => ({
	'canvas-node-handle-main-input': true,
	[$style.handle]: true,
	[$style.required]: isRequired.value,
}));

const handleLightness = calculateHandleLightness();

const handleStyles = computed(() => ({
	'--handle--border--lightness--light': handleLightness.value.light,
	'--handle--border--lightness--dark': handleLightness.value.dark,
}));

const handleClasses = 'target';
</script>
<template>
	<div :class="classes">
		<div :class="[$style.label]">{{ label }}</div>
		<CanvasHandleDot :handle-classes="handleClasses" :style="handleStyles" />
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
	left: calc(var(--spacing--xs) * -1);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translate(0, -50%) scale(var(--canvas-zoom-compensation-factor, 1)) translate(-100%, 0);
	transform-origin: center left;
	font-size: var(--font-size--2xs);
	color: var(--color--foreground--shade-2);
	background: var(--canvas--label--color--background);
	z-index: 1;
	text-align: center;
	white-space: nowrap;
}

.required .label::after {
	content: '*';
	color: var(--color--danger);
}
</style>
