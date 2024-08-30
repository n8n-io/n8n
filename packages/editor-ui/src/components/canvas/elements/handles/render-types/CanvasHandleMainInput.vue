<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';

const { label } = useCanvasNodeHandle();

const handleClasses = 'target';
</script>
<template>
	<div :class="['canvas-node-handle-main-input', $style.handle]">
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
</style>
