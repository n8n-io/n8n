<script lang="ts" setup>
import { useCanvasNodeHandle } from '@/composables/useCanvasNodeHandle';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { computed, ref, useCssModule } from 'vue';
import type { CanvasNodeDefaultRender } from '@/types';
import { useI18n } from '@/composables/useI18n';

const emit = defineEmits<{
	add: [];
}>();

const $style = useCssModule();

const i18n = useI18n();
const { render } = useCanvasNode();
const { label, isConnected, isConnecting, isReadOnly, isRequired, runData } = useCanvasNodeHandle();

const handleClasses = 'source';

const classes = computed(() => ({
	'canvas-node-handle-main-output': true,
	[$style.handle]: true,
	[$style.required]: isRequired.value,
}));

const isHovered = ref(false);

const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);

const runDataTotal = computed(() => runData.value?.total ?? 0);

const runDataLabel = computed(() =>
	runData.value
		? i18n.baseText('ndv.output.items', {
				adjustToNumber: runData.value.total,
				interpolate: { count: String(runData.value.total) },
			})
		: '',
);

const isHandlePlusVisible = computed(() => !isConnecting.value || isHovered.value);

const plusType = computed(() => (runDataTotal.value > 0 ? 'success' : 'default'));

const plusLineSize = computed(
	() =>
		({
			small: 46,
			medium: 66,
			large: 80,
		})[(runDataTotal.value > 0 ? 'large' : renderOptions.value.outputs?.labelSize) ?? 'small'],
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
	<div :class="classes">
		<div v-if="label" :class="[$style.label, $style.outputLabel]">{{ label }}</div>
		<div v-else-if="runData" :class="[$style.label, $style.runDataLabel]">{{ runDataLabel }}</div>
		<CanvasHandleDot :handle-classes="handleClasses" />
		<Transition name="canvas-node-handle-main-output">
			<CanvasHandlePlus
				v-if="!isConnected && !isReadOnly"
				v-show="isHandlePlusVisible"
				data-test-id="canvas-handle-plus"
				:line-size="plusLineSize"
				:handle-classes="handleClasses"
				:type="plusType"
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
	background: var(--color-canvas-label-background);
	z-index: 1;
	max-width: calc(100% - var(--spacing-m) - 24px);
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.required .label::after {
	content: '*';
	color: var(--color-danger);
}

.outputLabel {
	top: 50%;
	left: var(--spacing-m);
	transform: translate(0, -50%);
	font-size: var(--font-size-2xs);
	color: var(--color-foreground-xdark);
}

.runDataLabel {
	position: absolute;
	top: 0;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: var(--font-size-xs);
	color: var(--color-success);
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
