<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import { computed, getCurrentInstance, ref } from 'vue';

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

	if (!option || option === target || option.hasAttribute('data-disabled')) return;

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
	return element.tabIndex >= 0 && !element.hasAttribute('disabled');
}
</script>

<template>
	<ListboxRoot
		ref="rootRef"
		v-bind="forwardedRootProps"
		:model-value="rootModelValue"
		@update:model-value="onModelUpdate"
	>
		<ListboxContent
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
	gap: var(--listbox--gap, var(--spacing--4xs));

	&[data-orientation='horizontal'] {
		flex-direction: row;
	}
}
</style>
