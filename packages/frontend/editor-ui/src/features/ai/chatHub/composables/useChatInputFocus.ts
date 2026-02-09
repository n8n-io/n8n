import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { useActiveElement, useEventListener } from '@vueuse/core';

import { shouldIgnoreCanvasShortcut } from '@/features/workflows/canvas/canvas.utils';
import { useUIStore } from '@/app/stores/ui.store';

interface ChatInputRef {
	focus: () => void;
	appendText: (text: string) => void;
}

export function useChatInputFocus(
	inputRef: Ref<ChatInputRef | null | undefined>,
	options?: {
		disabled?: MaybeRefOrGetter<boolean>;
	},
) {
	const uiStore = useUIStore();
	const activeElement = useActiveElement();

	const isDisabled = computed(() => toValue(options?.disabled) ?? false);

	const shouldIgnoreKeypress = computed(() => {
		if (isDisabled.value) return true;
		if (uiStore.isAnyModalOpen) return true;
		if (activeElement.value && shouldIgnoreCanvasShortcut(activeElement.value)) return true;
		return false;
	});

	const RESERVED_SHORTCUT_KEYS = ['['];

	const isPrintableKey = (event: KeyboardEvent): boolean => {
		return event.key.length === 1;
	};

	const isReservedShortcut = (event: KeyboardEvent): boolean => {
		return RESERVED_SHORTCUT_KEYS.includes(event.key);
	};

	const hasModifierKey = (event: KeyboardEvent): boolean => {
		return event.ctrlKey || event.metaKey || event.altKey;
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (shouldIgnoreKeypress.value) return;
		if (event.isComposing) return;
		if (event.repeat) return;
		if (hasModifierKey(event)) return;
		if (!isPrintableKey(event)) return;
		if (isReservedShortcut(event)) return;

		const input = inputRef.value;
		if (!input) return;

		event.preventDefault();
		input.appendText(event.key);
		input.focus();
	};

	useEventListener(document, 'keydown', onKeyDown);
}
