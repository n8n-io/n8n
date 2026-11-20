<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue';

import type { ListboxProps, ListboxSlots, ListboxValue } from './Listbox.types';
import { ListboxContent, ListboxRoot, useForwardProps, type AcceptableValue } from './reka-ui';

defineOptions({ name: 'N8nListbox' });
defineSlots<ListboxSlots>();

const props = withDefaults(defineProps<ListboxProps>(), {
	selectionBehavior: 'replace',
	orientation: 'vertical',
	disabled: false,
});

type ListboxRootExposed = {
	highlightItem: (value: ListboxValue) => void;
};

const rootRef = ref<ListboxRootExposed | null>(null);

const rootProps = useForwardProps(
	reactivePick(props, 'disabled', 'orientation', 'selectionBehavior'),
);

const forwardedRootProps = computed(() => ({
	...rootProps.value,
	highlightOnHover: true,
}));

const emit = defineEmits<{
	'update:modelValue': [value: ListboxValue | undefined];
}>();

const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const isModelControlled = 'modelValue' in vnodeProps || 'model-value' in vnodeProps;
const internalValue = ref<ListboxValue | undefined>(props.defaultValue);
const rootModelValue = computed(() => (isModelControlled ? props.modelValue : internalValue.value));

function isListboxUpdate(
	value: AcceptableValue | undefined,
): value is ListboxValue | null | undefined {
	return typeof value === 'string' || value === null || value === undefined;
}

function onModelUpdate(value: AcceptableValue | undefined) {
	if (!isListboxUpdate(value)) return;
	const next = value ?? undefined;
	if (!isModelControlled) internalValue.value = next;
	emit('update:modelValue', next);
}

function onKeydown(event: KeyboardEvent) {
	if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;

	const listbox = event.currentTarget;
	const target = event.target;

	if (!(listbox instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

	const option = optionIn(listbox, target);

	// A section control sits between items. Tab lands on the nearest item only
	// when no other control sits in front of that item.
	if (!option) {
		moveHighlightPastControl(listbox, target, event);
		return;
	}

	if (option === target || option.hasAttribute('data-disabled')) return;

	if (event.shiftKey) {
		const previous = adjacentTabStop(target, true);
		if (!previous || !option.contains(previous)) moveHighlight(option, event);
		return;
	}

	const nextOption = optionIn(listbox, adjacentTabStop(target, false));
	if (!nextOption || nextOption === option) return;

	const destination = nextOption.hasAttribute('data-disabled')
		? nextEnabledOption(listbox, nextOption)
		: nextOption;
	if (destination) moveHighlight(destination, event);
}

function optionIn(listbox: HTMLElement, node: HTMLElement | null) {
	if (!node) return null;
	const option = node.closest('[role="option"]');
	return option instanceof HTMLElement && listbox.contains(option) ? option : null;
}

function moveHighlightPastControl(listbox: HTMLElement, target: HTMLElement, event: KeyboardEvent) {
	if (!listbox.contains(target)) return;

	const backwards = event.shiftKey;
	const neighbor = nearestOption(listbox, target, backwards);
	if (!neighbor) return;

	const tabStop = adjacentTabStop(target, backwards);
	// Keep native Tab when the next control is the item, sits between this
	// control and the item, or lives inside the item.
	if (tabStop && keepsNativeTab(target, neighbor, tabStop)) return;

	moveHighlight(neighbor, event);
}

function keepsNativeTab(target: HTMLElement, neighbor: HTMLElement, tabStop: HTMLElement) {
	if (tabStop === neighbor || neighbor.contains(tabStop)) return true;
	return !isBetween(target, neighbor, tabStop);
}

function nearestOption(listbox: HTMLElement, from: HTMLElement, backwards: boolean) {
	const options = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].filter(
		isAvailableOption,
	);
	const ordered = backwards ? options.reverse() : options;
	return (
		ordered.find(
			(option) =>
				(backwards ? option.compareDocumentPosition(from) : from.compareDocumentPosition(option)) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		) ?? null
	);
}

function isAvailableOption(option: HTMLElement) {
	return !option.hasAttribute('data-disabled') && option.closest('[hidden]') === null;
}

function isBetween(from: HTMLElement, middle: HTMLElement, end: HTMLElement) {
	const middleFollowsFrom = follows(from, middle);
	const endFollowsMiddle = follows(middle, end);
	const fromFollowsMiddle = follows(middle, from);
	const middleFollowsEnd = follows(end, middle);
	return (middleFollowsFrom && endFollowsMiddle) || (fromFollowsMiddle && middleFollowsEnd);
}

// A child is reported as following its parent. That containment bit must not
// count, or Tab from a section control skips the next item's action button.
function follows(start: HTMLElement, node: HTMLElement) {
	const position = start.compareDocumentPosition(node);
	if (position & (Node.DOCUMENT_POSITION_CONTAINS | Node.DOCUMENT_POSITION_CONTAINED_BY)) {
		return false;
	}
	return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

function moveHighlight(option: HTMLElement, event: KeyboardEvent) {
	const value = option.dataset.value;
	if (value === undefined) return;
	event.preventDefault();
	event.stopPropagation();
	rootRef.value?.highlightItem(value);
}

function nextEnabledOption(listbox: HTMLElement, after: HTMLElement) {
	const options = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')];
	const start = options.indexOf(after);
	return options.slice(start + 1).find((option) => !option.hasAttribute('data-disabled')) ?? null;
}

function adjacentTabStop(from: HTMLElement, backwards: boolean) {
	const stops = [...document.querySelectorAll<HTMLElement>('body *')].filter(isTabStop);
	const index = stops.indexOf(from);
	return index < 0 ? null : (stops[index + (backwards ? -1 : 1)] ?? null);
}

function isTabStop(element: HTMLElement) {
	return (
		element.tabIndex >= 0 &&
		!element.hasAttribute('disabled') &&
		element.closest('[hidden]') === null
	);
}

const contentRef = ref<unknown>(null);

function contentElement(): HTMLElement | null {
	const target = contentRef.value;
	const root =
		target instanceof HTMLElement
			? target
			: target && typeof target === 'object' && '$el' in target && target.$el instanceof HTMLElement
				? target.$el
				: null;
	if (!root) return null;
	return root.getAttribute('role') === 'listbox' ? root : root.querySelector('[role="listbox"]');
}

// Hover focuses the row under the pointer. That focus closes a menu opened from a row.
function onPointerMove(event: Event) {
	const listbox = event.currentTarget;
	if (!(listbox instanceof HTMLElement)) return;
	if (!listbox.querySelector('[aria-expanded="true"][aria-haspopup="menu"]')) return;
	event.stopPropagation();
}

onMounted(() => {
	contentElement()?.addEventListener('pointermove', onPointerMove, true);
});

onBeforeUnmount(() => {
	contentElement()?.removeEventListener('pointermove', onPointerMove, true);
});
</script>

<template>
	<ListboxRoot
		ref="rootRef"
		v-bind="forwardedRootProps"
		:model-value="rootModelValue"
		@update:model-value="onModelUpdate"
	>
		<ListboxContent
			ref="contentRef"
			:class="$style.content"
			:aria-label="label"
			@keydown="onKeydown"
		>
			<slot />
		</ListboxContent>
	</ListboxRoot>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--n8n-listbox--gap, var(--spacing--4xs));

	&[data-orientation='horizontal'] {
		flex-direction: row;
	}
}
</style>
