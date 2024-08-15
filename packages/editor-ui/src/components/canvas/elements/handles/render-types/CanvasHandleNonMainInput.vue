<script lang="ts" setup>
import CanvasHandlePlus from '@/components/canvas/elements/handles/render-types/parts/CanvasHandlePlus.vue';
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { NodeConnectionType } from 'n8n-workflow';
import { computed } from 'vue';

const emit = defineEmits<{
	add: [];
}>();

const { label, connected, type } = useCanvasNodeHandle();

const isAddButtonVisible = computed(
	() => !connected.value || type.value === NodeConnectionType.AiTool,
);

function onClickAdd() {
	emit('add');
}
</script>
<template>
	<div :class="['canvas-node-handle-non-main', $style.handle]">
		<div :class="$style.label">{{ label }}</div>
		<CanvasHandlePlus v-if="isAddButtonVisible" :class="$style.plus" @click="onClickAdd" />
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
	top: 18px;
	left: 50%;
	transform: translate(-50%, 0);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 1;
}

.plus {
	transform: rotate(90deg) translateX(50%);
}
</style>
