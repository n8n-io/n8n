<script lang="ts" setup>
import CanvasHandlePlus from './parts/CanvasHandlePlus.vue';
import { useCanvasNodeHandle } from '../../../../composables/useCanvasNodeHandle';
import { computed, ref, useCssModule } from 'vue';
import CanvasHandleDiamond from './parts/CanvasHandleDiamond.vue';

const emit = defineEmits<{
	add: [];
}>();

const $style = useCssModule();

const { label, isConnected, isConnecting, isRequired, maxConnections } = useCanvasNodeHandle();

const handleClasses = 'target';

const classes = computed(() => ({
	'canvas-node-handle-non-main-input': true,
	[$style.handle]: true,
	[$style.required]: isRequired.value,
}));

const isHandlePlusAvailable = computed(
	() => !isConnected.value || !maxConnections.value || maxConnections.value > 1,
);

const isHandlePlusVisible = computed(
	() => !isConnecting.value || isHovered.value || !maxConnections.value || maxConnections.value > 1,
);

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
	<div :class="classes">
		<div :class="[$style.label]">{{ label }}</div>
		<CanvasHandleDiamond :handle-classes="handleClasses" />
		<Transition name="canvas-node-handle-non-main-input">
			<CanvasHandlePlus
				v-if="isHandlePlusAvailable"
				v-show="isHandlePlusVisible"
				:handle-classes="handleClasses"
				type="secondary"
				position="bottom"
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
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.label {
	position: absolute;
	top: 20px;
	left: 50%;
	transform: translate(-50%, 0) scale(var(--canvas-zoom-compensation-factor, 1));
	font-size: var(--font-size--2xs);
	color: var(--node-type-supplemental-color);
	background: var(--color-canvas-label-background);
	z-index: 1;
	text-align: center;
	white-space: nowrap;
}

.required .label::after {
	content: '*';
	color: var(--color--danger);
}
</style>

<style lang="scss">
.canvas-node-handle-non-main-input-enter-active,
.canvas-node-handle-non-main-input-leave-active {
	transform-origin: center 0;
	transition-property: transform, opacity;
	transition-duration: 0.2s;
	transition-timing-function: ease;
}

.canvas-node-handle-non-main-input-enter-from,
.canvas-node-handle-non-main-input-leave-to {
	transform: scale(0);
	opacity: 0;
}
</style>
