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

const handleClasses = 'target';

function onClickAdd() {
	emit('add');
}
</script>
<template>
	<div :class="['canvas-node-handle-non-main-input', $style.handle]">
		<div :class="[$style.label]">{{ label }}</div>
		<CanvasHandleDiamond :handle-classes="handleClasses" />
		<CanvasHandlePlus
			v-if="isAddButtonVisible"
			:handle-classes="handleClasses"
			:class="$style.plus"
			position="bottom"
			@click="onClickAdd"
		/>
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
	transform: translate(-50%, 0);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 1;
	text-align: center;
}

:global(.vue-flow__handle:not(.connectionindicator)) .plus {
	display: none;
}
</style>
