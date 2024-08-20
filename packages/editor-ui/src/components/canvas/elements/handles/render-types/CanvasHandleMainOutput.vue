<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import CanvasHandlePlus from '@/components/canvas/elements/handles/render-types/parts/CanvasHandlePlus.vue';

const emit = defineEmits<{
	add: [];
}>();

const { label, connected } = useCanvasNodeHandle();

function onClickAdd() {
	emit('add');
}
</script>
<template>
	<div :class="['canvas-node-handle-main-output', $style.handle]">
		<div :class="$style.label">{{ label }}</div>
		<CanvasHandlePlus v-if="!connected" @click:plus="onClickAdd" />
	</div>
</template>

<style lang="scss" module>
.handle {
	:global(.vue-flow__handle:not(.connectionindicator)) + & {
		display: none;
	}
}

.label {
	position: absolute;
	top: 50%;
	left: var(--spacing-s);
	transform: translate(0, -50%);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 1;
}
</style>
