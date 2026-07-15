<script lang="ts" setup generic="Value extends string | boolean">
import type { AcceptableValue } from 'reka-ui';
import { RadioGroupRoot } from 'reka-ui';
import { reactiveOmit } from '@vueuse/core';
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	useAttrs,
	useTemplateRef,
	watch,
} from 'vue';

import type { SegmentControlSize } from './SegmentControl.types';
import SegmentControlItem from './SegmentControlItem.vue';

export type { SegmentControlSize };

defineOptions({ inheritAttrs: false });

interface SegmentOption {
	label: string;
	value: Value;
	disabled?: boolean;
	data?: Record<string, string | number | boolean | undefined>;
}

interface SegmentControlProps {
	modelValue?: Value;
	options?: SegmentOption[];
	/** @default medium */
	size?: SegmentControlSize;
	disabled?: boolean;
	squareButtons?: boolean;
}

const props = withDefaults(defineProps<SegmentControlProps>(), {
	disabled: false,
	size: 'medium',
	squareButtons: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: Value, e: MouseEvent];
}>();

defineSlots<{ option?: ((props: SegmentOption) => {}) | undefined }>();

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, 'class'));

/** Reka values are compared by identity; stringify so boolean options work. */
const serializedModelValue = computed(() =>
	props.modelValue === undefined ? undefined : String(props.modelValue),
);

/**
 * reka-ui selects on arrow keys by listening on window. Parent containers that
 * call stopPropagation on keydown (e.g. modals) can block that, so we track
 * arrow keys in capture phase and complete selection on focusin in the item.
 */
const arrowKeyPressed = ref(false);
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Last pointer event, so consumers like TabBar can read ctrl/meta for open-in-new-tab. */
const lastPointerEvent = ref<MouseEvent>();

const rootRef = useTemplateRef<HTMLElement>('rootRef');
const indicatorReady = ref(false);
const indicatorVisible = ref(false);
const indicatorStyle = ref<Record<string, string>>({
	width: '0px',
	height: '0px',
	transform: 'translate(0, 0)',
});

let resizeObserver: ResizeObserver | undefined;

function updateIndicator() {
	const root = rootRef.value;
	if (!root) return;

	const active = root.querySelector<HTMLElement>('[role="radio"][data-state="checked"]');
	if (!active) {
		indicatorVisible.value = false;
		return;
	}

	const rootRect = root.getBoundingClientRect();
	const activeRect = active.getBoundingClientRect();
	// Absolute children are positioned against the padding box; rects include the border.
	const offsetLeft = activeRect.left - rootRect.left - root.clientLeft;
	const offsetTop = activeRect.top - rootRect.top - root.clientTop;

	indicatorVisible.value = true;
	indicatorStyle.value = {
		width: `${activeRect.width}px`,
		height: `${activeRect.height}px`,
		transform: `translate(${offsetLeft}px, ${offsetTop}px)`,
	};

	if (!indicatorReady.value) {
		// Defer enabling transitions until after the first paint position is applied.
		requestAnimationFrame(() => {
			indicatorReady.value = true;
		});
	}
}

function onKeyDownCapture(event: KeyboardEvent) {
	if (ARROW_KEYS.includes(event.key)) {
		arrowKeyPressed.value = true;
	}
}

function onKeyUp() {
	arrowKeyPressed.value = false;
}

function onItemClickCapture(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	if (target.closest('[role="radio"]')) {
		lastPointerEvent.value = event;
	}
}

function onItemFocusIn(event: FocusEvent) {
	if (!arrowKeyPressed.value) return;

	const target = event.target;
	if (target instanceof HTMLElement && target.getAttribute('role') === 'radio') {
		target.click();
	}
}

function findOption(raw: AcceptableValue): SegmentOption | undefined {
	return props.options?.find((option) => String(option.value) === String(raw));
}

function onUpdate(raw: AcceptableValue) {
	const option = findOption(raw);
	if (!option || props.disabled || option.disabled) {
		return;
	}

	const event = lastPointerEvent.value ?? new MouseEvent('click');
	lastPointerEvent.value = undefined;
	emit('update:modelValue', option.value, event);
}

watch(
	() => [props.modelValue, props.options, props.size, props.squareButtons, props.disabled] as const,
	async () => {
		await nextTick();
		updateIndicator();
	},
);

onMounted(() => {
	updateIndicator();

	const root = rootRef.value;
	if (!root || typeof ResizeObserver === 'undefined') return;

	resizeObserver = new ResizeObserver(() => {
		updateIndicator();
	});
	resizeObserver.observe(root);
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
});
</script>

<template>
	<div
		ref="rootRef"
		:class="['n8n-segment-control', $style.segmentControl, disabled && $style.disabled, rootClass]"
	>
		<span
			v-show="indicatorVisible"
			aria-hidden="true"
			data-test-id="segment-control-indicator"
			:class="[
				$style.indicator,
				indicatorReady && $style.indicatorReady,
				disabled && $style.indicatorDisabled,
			]"
			:style="indicatorStyle"
		/>
		<RadioGroupRoot
			v-bind="rootAttrs"
			:model-value="serializedModelValue"
			:disabled="disabled"
			orientation="horizontal"
			:loop="true"
			:class="$style.group"
			@update:model-value="onUpdate"
			@keydown.capture="onKeyDownCapture"
			@keyup="onKeyUp"
			@click.capture="onItemClickCapture"
		>
			<SegmentControlItem
				v-for="option in options"
				:key="`${option.value}`"
				:label="option.label"
				:value="`${option.value}`"
				:size="size"
				:disabled="disabled || option.disabled"
				:square="squareButtons"
				@focusin="onItemFocusIn"
			>
				<slot name="option" v-bind="option" />
			</SegmentControlItem>
		</RadioGroupRoot>
	</div>
</template>

<style lang="scss" module>
.segmentControl {
	position: relative;
	display: inline-flex;
	align-items: stretch;
	line-height: 1;
	vertical-align: middle;
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs);
	border-radius: var(--radius--2xs);
}

.group {
	display: flex;
	align-items: stretch;
	flex: 1;
	width: 100%;
	gap: var(--spacing--5xs);
	position: relative;
	z-index: 1;
}

.indicator {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 0;
	border-radius: var(--radius--3xs);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	pointer-events: none;
}

.indicatorReady {
	transition:
		transform var(--duration--snappy) var(--easing--ease-out),
		width var(--duration--snappy) var(--easing--ease-out),
		height var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.indicatorDisabled {
	background-color: var(--background--disabled);
	box-shadow: none;
}

.disabled {
	cursor: not-allowed;
	opacity: 0.7;
}
</style>
