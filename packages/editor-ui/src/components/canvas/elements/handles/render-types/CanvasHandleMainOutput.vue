<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { computed, ref } from 'vue';

const emit = defineEmits<{
	add: [];
}>();

const { label, isConnected, isConnecting } = useCanvasNodeHandle();

const handleClasses = 'source';

const isHandlePlusVisible = computed(() => !isConnecting.value || isHovered.value);
const isHovered = ref(false);

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
	left: var(--spacing-s);
	transform: translate(0, -50%);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
	background: var(--color-background-light);
	z-index: 1;
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
