import { PiPWindowSymbol } from '@/constants';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useActiveElement, useEventListener } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';
import { computed, inject, ref, toValue } from 'vue';

type KeyboardEventHandler =
	| ((event: KeyboardEvent) => void)
	| { disabled: () => boolean; run: (event: KeyboardEvent) => void };

export type KeyMap = Partial<Record<string, KeyboardEventHandler>>;

/**
 * Binds a `keydown` event to `document` and calls the approriate
 * handlers based on the given `keymap`. The keymap is a map from
 * shortcut strings to handlers. The shortcut strings can contain
 * multiple shortcuts separated by `|`.
 *
 * @example
 * ```ts
 * {
 * 	'ctrl+a': () => console.log('ctrl+a'),
 * 	'ctrl+b|ctrl+c': () => console.log('ctrl+b or ctrl+c'),
 * }
 * ```
 */
export const useKeybindings = (
	keymap: MaybeRefOrGetter<KeyMap>,
	options?: {
		disabled: MaybeRefOrGetter<boolean>;
	},
) => {
	const pipWindow = inject(PiPWindowSymbol, ref<Window | undefined>());
	const activeElement = useActiveElement({ window: pipWindow?.value });
	const { isCtrlKeyPressed } = useDeviceSupport();

	const isDisabled = computed(() => toValue(options?.disabled));

	const ignoreKeyPresses = computed(() => {
		if (!activeElement.value) return false;

		const active = activeElement.value;
		const isInput = ['INPUT', 'TEXTAREA'].includes(active.tagName);
		const isContentEditable = active.closest('[contenteditable]') !== null;
		const isIgnoreClass = active.closest('.ignore-key-press-canvas') !== null;

		return isInput || isContentEditable || isIgnoreClass;
	});

	const normalizedKeymap = computed(() =>
		Object.fromEntries(
			Object.entries(toValue(keymap)).flatMap(([shortcut, handler]) => {
				const shortcuts = shortcut.split('|');
				return shortcuts.map((s) => [normalizeShortcutString(s), handler]);
			}),
		),
	);

	function shortcutPartsToString(parts: string[]) {
		return parts
			.map((key) => key.toLowerCase())
			.sort((a, b) => a.localeCompare(b))
			.join('+');
	}

	function normalizeShortcutString(shortcut: string) {
		if (shortcut.length === 1) {
			return shortcut.toLowerCase();
		}

		const splitChars = ['+', '_', '-'];
		const splitCharsRegEx = splitChars.reduce((acc, char) => {
			if (shortcut.startsWith(char) || shortcut.endsWith(char)) {
				return acc;
			}

			return char + acc;
		}, '');

		return shortcutPartsToString(shortcut.split(new RegExp(`[${splitCharsRegEx}]`)));
	}

	/**
	 * Converts a keyboard event code to a key string.
	 *
	 * @example
	 * keyboardEventCodeToKey('Digit0') -> '0'
	 * keyboardEventCodeToKey('KeyA') -> 'a'
	 */
	function keyboardEventCodeToKey(code: string) {
		if (code.startsWith('Digit')) {
			return code.replace('Digit', '').toLowerCase();
		} else if (code.startsWith('Key')) {
			return code.replace('Key', '').toLowerCase();
		}

		return code.toLowerCase();
	}

	/**
	 * Converts a keyboard event to a shortcut string for both
	 * `key` and `code`.
	 *
	 * @example
	 * keyboardEventToShortcutString({ key: 'a', code: 'KeyA', ctrlKey: true })
	 * // --> { byKey: 'ctrl+a', byCode: 'ctrl+a' }
	 */
	function toShortcutString(event: KeyboardEvent) {
		const { shiftKey, altKey } = event;
		const ctrlKey = isCtrlKeyPressed(event);
		const keys = 'key' in event ? [event.key] : [];
		const codes = 'code' in event ? [keyboardEventCodeToKey(event.code)] : [];
		const modifiers: string[] = [];

		if (shiftKey) {
			modifiers.push('shift');
		}

		if (ctrlKey) {
			modifiers.push('ctrl');
		}

		if (altKey) {
			modifiers.push('alt');
		}

		return {
			byKey: shortcutPartsToString([...modifiers, ...keys]),
			byCode: shortcutPartsToString([...modifiers, ...codes]),
		};
	}

	function onKeyDown(event: KeyboardEvent) {
		if (ignoreKeyPresses.value || isDisabled.value) return;

		const { byKey, byCode } = toShortcutString(event);

		// Prefer `byKey` over `byCode` so that:
		// - ANSI layouts work correctly
		// - Dvorak works correctly
		// - Non-ansi layouts work correctly
		const handler = normalizedKeymap.value[byKey] ?? normalizedKeymap.value[byCode];
		const run =
			typeof handler === 'function' ? handler : handler?.disabled() ? undefined : handler?.run;

		if (run) {
			event.preventDefault();
			event.stopPropagation();
			run(event);
		}
	}

	useEventListener(pipWindow?.value?.document ?? document, 'keydown', onKeyDown);
};
