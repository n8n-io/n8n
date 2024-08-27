<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';

const { label } = useCanvasNodeHandle();

const handleClasses = 'source';
</script>
<template>
	<div :class="['canvas-node-handle-non-main-output', $style.handle]">
		<div :class="[$style.label]">{{ label }}</div>
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
	left: -50%;
	transform: translate(0%, 0);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 0;
}

:global(.vue-flow__handle:not(.connectionindicator)) .plus {
	display: none;
	position: absolute;
}
</style>
