<script lang="ts" setup>
import { computed, inject, useCssModule } from 'vue';
import { CanvasNodeHandleKey } from '@/constants';

const handle = inject(CanvasNodeHandleKey);

const $style = useCssModule();

const label = computed(() => handle?.label.value ?? '');
</script>
<template>
	<div :class="['canvas-node-handle-non-main', $style.handle]">
		<div :class="$style.diamond" />
		<div :class="$style.label">{{ label }}</div>
	</div>
</template>

<style lang="scss" module>
.handle {
	width: 14px;
	height: 14px;
	border-radius: 0;
}

.diamond {
	width: 14px;
	height: 14px;
	transform: rotate(45deg);
	background: hsl(
		var(--node-type-supplemental-color-h) var(--node-type-supplemental-color-s)
			var(--node-type-supplemental-color-l)
	);

	&:hover {
		background: var(--color-primary);
	}
}

.label {
	position: absolute;
	top: 18px;
	left: 50%;
	transform: translate(-50%, 0);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 1;
}
</style>
