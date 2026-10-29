<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, getCurrentInstance, nextTick, onMounted, ref, useAttrs } from 'vue';

import type { ListboxProps, ListboxSlots, ListboxValue } from './Listbox.types';
import { ListboxContent, ListboxRoot, useForwardProps } from './reka-ui';

defineOptions({ name: 'N8nListbox', inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const props = withDefaults(defineProps<ListboxProps>(), {
	selectionBehavior: 'replace',
	orientation: 'vertical',
	disabled: false,
	highlightOnHover: true,
});

const emit = defineEmits<{
	'update:modelValue': [value: ListboxValue | undefined];
}>();

defineSlots<ListboxSlots>();

// vnode.props records a passed model, including when the value is undefined.
const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const isModelControlled = 'modelValue' in vnodeProps || 'model-value' in vnodeProps;
const internalValue = ref<ListboxValue | undefined>(props.defaultValue);
const rootModelValue = computed(() => (isModelControlled ? props.modelValue : internalValue.value));

function onModelUpdate(value: ListboxValue | undefined) {
	if (!isModelControlled) internalValue.value = value;
	emit('update:modelValue', value);
}

const rootProps = useForwardProps(
	reactivePick(props, 'disabled', 'orientation', 'dir', 'selectionBehavior', 'highlightOnHover'),
);

const contentRef = ref<HTMLElement | null>(null);
const rootRef = ref<{ highlightItem: (value: string) => void } | null>(null);

const CONTROL_SELECTOR = 'button, a[href], input, select, textarea, [role="button"]';

type ListStop = {
	option: HTMLElement;
	control: HTMLElement | null;
};

function isTabbable(el: HTMLElement) {
	if (el.tabIndex < 0) return false;
	if ('disabled' in el && el.disabled === true) return false;
	return el.getAttribute('aria-disabled') !== 'true';
}

function controlsIn(option: HTMLElement) {
	return [...option.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)].filter(
		(el) => el !== option && isTabbable(el),
	);
}

// The row comes first. Its buttons follow. Then the next row.
function stopsIn(content: HTMLElement): ListStop[] {
	const stops: ListStop[] = [];
	for (const option of content.querySelectorAll<HTMLElement>('[role="option"][data-value]')) {
		if (!option.hasAttribute('data-disabled')) stops.push({ option, control: null });
		for (const control of controlsIn(option)) stops.push({ option, control });
	}
	return stops;
}

function stopIndex(stops: ListStop[], active: Element) {
	return stops.findIndex((stop) => {
		if (stop.control) return stop.control === active || stop.control.contains(active);
		return stop.option === active;
	});
}

function focusStop(stop: ListStop) {
	if (stop.control) {
		stop.control.focus();
		return;
	}
	const value = stop.option.dataset.value;
	if (value) rootRef.value?.highlightItem(value);
	else stop.option.focus();
}

const NAVIGATION_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

// Arrow keys move the highlight. A pointermove at the same point would put it back
// on the row under the pointer, so that row would keep the fill.
let suspendPointerHighlight = false;
let pointerX = 0;
let pointerY = 0;

function onListKeydown(event: KeyboardEvent) {
	if (NAVIGATION_KEYS.has(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
		suspendPointerHighlight = true;
	}
	onTab(event);
}

function onPointerMoveCapture(event: PointerEvent) {
	const moved = Math.hypot(event.clientX - pointerX, event.clientY - pointerY) > 2;
	pointerX = event.clientX;
	pointerY = event.clientY;
	if (!suspendPointerHighlight) return;
	if (!moved) {
		event.stopPropagation();
		return;
	}
	suspendPointerHighlight = false;
}

// Tab walks the buttons inside the focused item, then moves to the next item.
function onTab(event: KeyboardEvent) {
	if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey || props.disabled) {
		return;
	}
	const content = contentRef.value;
	const active = document.activeElement;
	if (!content || !(active instanceof Element) || !content.contains(active)) return;

	const stops = stopsIn(content);
	const index = stopIndex(stops, active);
	if (index < 0) return;

	const next = stops[index + (event.shiftKey ? -1 : 1)];
	if (!next) return;

	event.preventDefault();
	focusStop(next);
}

// A menu opened from a row sits outside the list. Keep the row highlighted.
function onFocusOut(event: FocusEvent) {
	const next = event.relatedTarget;
	if (!(next instanceof Element) || !next.closest('[role="menu"]')) return;
	event.stopPropagation();
}

// Reka focuses the highlighted item while the list mounts.
// Release that focus so the caller keeps the caret where it was.
onMounted(() => {
	void nextTick(() => {
		const active = document.activeElement;
		const content = contentRef.value;
		if (active instanceof HTMLElement && content?.contains(active)) {
			active.blur();
		}
	});
});
</script>

<template>
	<div :class="[$style.root, rootClass]" v-bind="rootAttrs">
		<ListboxRoot
			ref="rootRef"
			v-bind="rootProps"
			:model-value="rootModelValue"
			@update:model-value="onModelUpdate"
		>
			<ListboxContent as-child>
				<div
					ref="contentRef"
					:class="$style.content"
					:aria-label="label"
					@keydown.capture="onListKeydown"
					@pointermove.capture="onPointerMoveCapture"
					@focusout="onFocusOut"
				>
					<slot />
				</div>
			</ListboxContent>
		</ListboxRoot>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	min-width: 0;
}

// Reka's root is the only child. It has to pass the height through to the list.
.root > * {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	min-width: 0;
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	min-width: 0;
	outline: none;

	// Reka sets data-orientation. A horizontal list lays its items in a row.
	&[data-orientation='horizontal'] {
		flex-direction: row;
		flex-wrap: wrap;

		:global([role='option']) {
			width: auto;
			flex: none;
		}
	}
}
</style>
