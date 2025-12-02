<script lang="ts" setup>
import { useCanvasNodeHandle } from '../../../../composables/useCanvasNodeHandle';
import { computed, useCssModule } from 'vue';
import CanvasHandleDiamond from './parts/CanvasHandleDiamond.vue';
import { useCanvas } from '../../../../composables/useCanvas';
import { useZoomAdjustedValues } from '../../../../composables/useZoomAdjustedValues';

const $style = useCssModule();
const { label, isRequired } = useCanvasNodeHandle();
const { viewport } = useCanvas();
const { calculateHandleLightness } = useZoomAdjustedValues(viewport);

const handleClasses = 'source';

const classes = computed(() => ({
	'canvas-node-handle-non-main-output': true,
	[$style.handle]: true,
	[$style.required]: isRequired.value,
}));

const handleLightness = calculateHandleLightness();

const handleStyles = computed(() => ({
	'--handle--border--lightness--light': handleLightness.value.light,
	'--handle--border--lightness--dark': handleLightness.value.dark,
}));
</script>
<template>
	<div :class="classes">
		<div :class="$style.label">{{ label }}</div>
		<CanvasHandleDiamond :handle-classes="handleClasses" :style="handleStyles" />
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
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translate(-50%, 0) scale(var(--canvas-zoom-compensation-factor, 1));
	font-size: var(--font-size--2xs);
	color: var(--canvas--label--color);
	background: var(--canvas--label--color--background);
	z-index: 0;
	white-space: nowrap;
}

.required .label::after {
	content: '*';
	color: var(--color--danger);
}
</style>
