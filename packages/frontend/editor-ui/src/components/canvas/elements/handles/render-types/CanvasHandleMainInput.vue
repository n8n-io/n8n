<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { computed, useCssModule } from 'vue';

const $style = useCssModule();

const { label, isRequired } = useCanvasNodeHandle();

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
		<CanvasHandleRectangle :handle-classes="handleClasses" />
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
	transform: translate(-100%, -50%);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-canvas-label-background);
	z-index: 1;
	text-align: center;
	white-space: nowrap;
}

.required .label::after {
	content: '*';
	color: var(--color-danger);
}
</style>
