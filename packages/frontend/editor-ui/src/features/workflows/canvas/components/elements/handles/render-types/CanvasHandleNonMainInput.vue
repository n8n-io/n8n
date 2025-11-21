<script lang="ts" setup>
import { useCanvasNodeHandle } from '../../../../composables/useCanvasNodeHandle';
import { computed, useCssModule } from 'vue';
import CanvasHandleDiamond from './parts/CanvasHandleDiamond.vue';

const $style = useCssModule();

const { label, isRequired } = useCanvasNodeHandle();

const handleClasses = 'target';

const classes = computed(() => ({
	'canvas-node-handle-non-main-input': true,
	[$style.handle]: true,
	[$style.required]: isRequired.value,
}));
</script>
<template>
	<div :class="classes">
		<div :class="[$style.label]">{{ label }}</div>
		<CanvasHandleDiamond :handle-classes="handleClasses" />
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
	top: 20px;
	left: 50%;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	transform: translate(-50%, 0) scale(var(--canvas-zoom-compensation-factor, 1));
	font-size: var(--font-size--2xs);
	color: var(--canvas-label--color);
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

<style lang="scss">
.canvas-node-handle-non-main-input-enter-active,
.canvas-node-handle-non-main-input-leave-active {
	transform-origin: center 0;
	transition-property: transform, opacity;
	transition-duration: 0.2s;
	transition-timing-function: ease;
}

.canvas-node-handle-non-main-input-enter-from,
.canvas-node-handle-non-main-input-leave-to {
	transform: scale(0);
	opacity: 0;
}
</style>
