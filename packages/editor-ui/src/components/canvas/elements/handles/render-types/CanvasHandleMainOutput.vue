<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { computed, ref } from 'vue';
import type { CanvasNodeDefaultRender } from '@/types';

const emit = defineEmits<{
	add: [];
}>();

const { render } = useCanvasNode();
const { label, isConnected, isConnecting } = useCanvasNodeHandle();

const handleClasses = 'source';
const isHovered = ref(false);

const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);

const isHandlePlusVisible = computed(() => !isConnecting.value || isHovered.value);

const plusLineSize = computed(
	() =>
		({
			small: 46,
			medium: 66,
			large: 80,
		})[renderOptions.value.outputs?.labelSize ?? 'small'],
);

function onMouseEnter() {
	isHovered.value = true;
}

function onMouseLeave() {
	isHovered.value = false;
}

function onClickAdd() {
	emit('add');
}
</script>
<template>
	<div :class="['canvas-node-handle-main-output', $style.handle]">
		<div :class="[$style.label]">{{ label }}</div>
		<CanvasHandleDot :handle-classes="handleClasses" />
		<Transition name="canvas-node-handle-main-output">
			<CanvasHandlePlus
				v-if="!isConnected"
				v-show="isHandlePlusVisible"
				:line-size="plusLineSize"
				:handle-classes="handleClasses"
				@mouseenter="onMouseEnter"
				@mouseleave="onMouseLeave"
				@click:plus="onClickAdd"
			/>
		</Transition>
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
	top: 50%;
	left: var(--spacing-m);
	transform: translate(0, -50%);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-canvas-label-background);
	z-index: 1;
	max-width: calc(100% - var(--spacing-m) - 24px);
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}
</style>

<style lang="scss">
.canvas-node-handle-main-output-enter-active,
.canvas-node-handle-main-output-leave-active {
	transform-origin: 0 center;
	transition-property: transform, opacity;
	transition-duration: 0.2s;
	transition-timing-function: ease;
}

.canvas-node-handle-main-output-enter-from,
.canvas-node-handle-main-output-leave-to {
	transform: scale(0);
	opacity: 0;
}
</style>
