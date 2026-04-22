import { PopOutWindowKey } from '@/app/constants';
import { shouldIgnoreCanvasShortcut } from '@/features/workflows/canvas/canvas.utils';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useActiveElement, useEventListener } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';
import { computed, inject, onScopeDispose, ref, toValue } from 'vue';

declare global {
	interface Navigator {
		keyboard?: {
			getLayoutMap(): Promise<KeyboardLayoutMap>;
			addEventListener(type: 'layoutchange', listener: () => void): void;
			removeEventListener(type: 'layoutchange', listener: () => void): void;
		};
	}

	interface KeyboardLayoutMap {
		get(code: string): string | undefined;
		has(code: string): boolean;
		entries(): IterableIterator<[string, string]>;
		keys(): IterableIterator<string>;
		values(): IterableIterator<string>;
		readonly size: number;
		forEach(callbackfn: (value: string, key: string, map: KeyboardLayoutMap) => void): void;
	}
}

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
	const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());
	const activeElement = useActiveElement({ window: popOutWindow?.value });
	const { isCtrlKeyPressed } = useDeviceSupport();

	const layoutMap = ref<KeyboardLayoutMap | null>(null);

	async function updateLayoutMap() {
		try {
			layoutMap.value = (await navigator.keyboard?.getLayoutMap()) ?? null;
		} catch {
			layoutMap.value = null;
		}
	}

	if (navigator.keyboard) {
		void updateLayoutMap();
		if ('addEventListener' in navigator.keyboard) {
			const onLayoutChange = () => {
				void updateLayoutMap();
			};
			navigator.keyboard.addEventListener('layoutchange', onLayoutChange);
			onScopeDispose(() => {
				navigator.keyboard?.removeEventListener('layoutchange', onLayoutChange);
			});
		}
	}

	const isDisabled = computed(() => toValue(options?.disabled));

	const ignoreKeyPresses = computed(
		() => activeElement.value && shouldIgnoreCanvasShortcut(activeElement.value),
	);

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

		// Use the Keyboard Layout Map API to resolve the logical key from the
		// physical code. This handles non-QWERTY layouts (e.g. Colemak) where
		// macOS produces dead keys for Alt+key combinations, causing both byKey
		// and byCode to miss.
		let byLayout: string | undefined;
		if (layoutMap.value && 'code' in event) {
			const layoutKey = layoutMap.value.get(event.code);
			if (layoutKey) {
				byLayout = shortcutPartsToString([...modifiers, layoutKey]);
			}
		}

		return {
			byKey: shortcutPartsToString([...modifiers, ...keys]),
			byCode: shortcutPartsToString([...modifiers, ...codes]),
			byLayout,
		};
	}

	// Resolution strategy:
	// 1. Prefer `byKey` (event.key) so shortcuts follow the logical character
	//    produced by the active keyboard layout (works correctly for QWERTY,
	//    Colemak/Dvorak, and most layouts).
	// 2. Use `byLayout` (Keyboard Layout Map API) as a layout-aware fallback when
	//    available. This helps in cases where `event.key` is unreliable (e.g.
	//    certain macOS modifier combinations or dead keys).
	// 3. Avoid falling back to `byCode` (physical key position) for letter keys
	//    when the active layout produces Latin letters (a–z). Physical fallback
	//    can remap one letter to another on alternative layouts (e.g. Colemak),
	//    causing unintended matches such as CMD+R triggering a CMD+S handler.
	// 4. For non-Latin layouts (Hebrew, Russian, etc.), allow `byCode` fallback for
	//    Ctrl/Cmd-modified letter shortcuts so common shortcuts like Ctrl/Cmd+C
	//    still work even when the key produces a non-Latin character.
	// 5. For non-letter keys (arrows, function keys, etc.), allow `byCode` as a
	//    last resort to ensure consistent physical-key behavior across layouts.
	function onKeyDown(event: KeyboardEvent) {
		if (ignoreKeyPresses.value || isDisabled.value) return;

		const { byKey, byCode, byLayout } = toShortcutString(event);

		const isLetterKey = event.code.startsWith('Key'); // KeyA..KeyZ
		const isLatinLetter = /^[a-z]$/i.test(event.key);
		const isNonLatinLetter = /^\p{L}$/u.test(event.key) && !isLatinLetter;
		const ctrlOrCmd = isCtrlKeyPressed(event);

		const useCodeFallback = !isLetterKey || (ctrlOrCmd && isNonLatinLetter);

		const handlerFromKey = normalizedKeymap.value[byKey];
		const handlerFromLayout = byLayout ? normalizedKeymap.value[byLayout] : undefined;
		const handlerFromCode = useCodeFallback ? normalizedKeymap.value[byCode] : undefined;

		const handler = handlerFromKey ?? handlerFromLayout ?? handlerFromCode;
		const run =
			typeof handler === 'function' ? handler : handler?.disabled() ? undefined : handler?.run;

		if (run) {
			event.preventDefault();
			event.stopPropagation();
			run(event);
		}
	}

	useEventListener(popOutWindow?.value?.document ?? document, 'keydown', onKeyDown);
};
