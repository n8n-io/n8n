import { useActiveElement, useEventListener } from '@vueuse/core';
import { computed, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export interface ChatInputAutoFocusTarget {
	focus: () => void;
	appendText?: (text: string) => void;
}

export interface ChatInputAutoFocusOptions {
	disabled?: MaybeRefOrGetter<boolean>;
	reservedKeys?: MaybeRefOrGetter<readonly string[]>;
}

const DEFAULT_RESERVED_KEYS = ['['];

function isEditableElement(element: Element) {
	if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
		return !element.readOnly && !element.disabled;
	}

	if (element instanceof HTMLSelectElement) {
		return !element.disabled;
	}

	return element instanceof HTMLElement && element.isContentEditable;
}

function hasModifierKey(event: KeyboardEvent) {
	return event.ctrlKey || event.metaKey || event.altKey;
}

function isPrintableKey(event: KeyboardEvent) {
	return event.key.length === 1;
}

export function useChatInputAutoFocus(
	inputRef: Ref<ChatInputAutoFocusTarget | null | undefined>,
	options: ChatInputAutoFocusOptions = {},
) {
	const activeElement = useActiveElement();

	const isDisabled = computed(() => toValue(options.disabled) ?? false);
	const reservedKeys = computed(() => toValue(options.reservedKeys) ?? DEFAULT_RESERVED_KEYS);

	function onKeyDown(event: KeyboardEvent) {
		if (isDisabled.value) return;
		if (event.defaultPrevented) return;
		if (event.isComposing) return;
		if (event.repeat) return;
		if (hasModifierKey(event)) return;
		if (!isPrintableKey(event)) return;
		if (reservedKeys.value.includes(event.key)) return;
		if (activeElement.value && isEditableElement(activeElement.value)) return;

		const input = inputRef.value;
		if (!input) return;

		event.preventDefault();
		input.appendText?.(event.key);
		input.focus();
	}

	useEventListener(document, 'keydown', onKeyDown);
}
