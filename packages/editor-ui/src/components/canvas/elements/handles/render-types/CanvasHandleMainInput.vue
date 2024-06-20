<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { CanvasNodeHandleKey } from '@/constants';

const handle = inject(CanvasNodeHandleKey);

const $style = useCssModule();

const label = computed(() => handle?.label.value ?? '');
</script>
<template>
	<div :class="['canvas-node-handle-main-input', $style.handle]">
		<div :class="$style.label">{{ label }}</div>
	</div>
</template>

<style lang="scss" module>
.handle {
	width: 8px;
	height: 16px;
	border-radius: 0;
	background: var(--color-foreground-xdark);

	&:hover {
		background: var(--color-primary);
	}
}

.label {
	position: absolute;
	top: 50%;
	right: 12px;
	transform: translate(0, -50%);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 1;
}
</style>
