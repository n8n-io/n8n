import { $d as init_runtime_core_esm_bundler, Eu as useActiveElement, Iu as useEventListener, Jf as toValue, Nf as init_reactivity_esm_bundler, Rd as computed, Rf as onScopeDispose, Vf as ref, ef as inject } from "./vendor-Hx42-oQF.js";
import { OM as PopOutWindowKey, QM as useDeviceSupport, Yh as shouldIgnoreCanvasShortcut } from "./app-D5flEmb-.js";
//#region src/app/composables/useKeybindings.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
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
var useKeybindings = (keymap, options) => {
	const popOutWindow = inject(PopOutWindowKey, ref());
	const activeElement = useActiveElement({ window: popOutWindow?.value });
	const { isCtrlKeyPressed } = useDeviceSupport();
	const layoutMap = ref(null);
	async function updateLayoutMap() {
		try {
			layoutMap.value = await navigator.keyboard?.getLayoutMap() ?? null;
		} catch {
			layoutMap.value = null;
		}
	}
	if (navigator.keyboard) {
		updateLayoutMap();
		if ("addEventListener" in navigator.keyboard) {
			const onLayoutChange = () => {
				updateLayoutMap();
			};
			navigator.keyboard.addEventListener("layoutchange", onLayoutChange);
			onScopeDispose(() => {
				navigator.keyboard?.removeEventListener("layoutchange", onLayoutChange);
			});
		}
	}
	const isDisabled = computed(() => toValue(options?.disabled));
	const normalizedKeymap = computed(() => Object.fromEntries(Object.entries(toValue(keymap)).flatMap(([shortcut, handler]) => {
		return shortcut.split("|").map((s) => [normalizeShortcutString(s), handler]);
	})));
	function shortcutPartsToString(parts) {
		return parts.map((key) => key.toLowerCase()).sort((a, b) => a.localeCompare(b)).join("+");
	}
	function normalizeShortcutString(shortcut) {
		if (shortcut.length === 1) return shortcut.toLowerCase();
		const splitCharsRegEx = [
			"+",
			"_",
			"-"
		].reduce((acc, char) => {
			if (shortcut.startsWith(char) || shortcut.endsWith(char)) return acc;
			return char + acc;
		}, "");
		return shortcutPartsToString(shortcut.split(new RegExp(`[${splitCharsRegEx}]`)));
	}
	/**
	* Converts a keyboard event code to a key string.
	*
	* @example
	* keyboardEventCodeToKey('Digit0') -> '0'
	* keyboardEventCodeToKey('KeyA') -> 'a'
	*/
	function keyboardEventCodeToKey(code) {
		if (code.startsWith("Digit")) return code.replace("Digit", "").toLowerCase();
		else if (code.startsWith("Key")) return code.replace("Key", "").toLowerCase();
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
	function toShortcutString(event) {
		const { shiftKey, altKey } = event;
		const ctrlKey = isCtrlKeyPressed(event);
		const keys = "key" in event ? [event.key] : [];
		const codes = "code" in event ? [keyboardEventCodeToKey(event.code)] : [];
		const modifiers = [];
		if (shiftKey) modifiers.push("shift");
		if (ctrlKey) modifiers.push("ctrl");
		if (altKey) modifiers.push("alt");
		let byLayout;
		if (layoutMap.value && "code" in event) {
			const layoutKey = layoutMap.value.get(event.code);
			if (layoutKey) byLayout = shortcutPartsToString([...modifiers, layoutKey]);
		}
		return {
			byKey: shortcutPartsToString([...modifiers, ...keys]),
			byCode: shortcutPartsToString([...modifiers, ...codes]),
			byLayout
		};
	}
	function onKeyDown(event) {
		if (isDisabled.value) return;
		const { byKey, byCode, byLayout } = toShortcutString(event);
		const isLetterKey = event.code.startsWith("Key");
		const isLatinLetter = /^[a-z]$/i.test(event.key);
		const isNonLatinLetter = /^\p{L}$/u.test(event.key) && !isLatinLetter;
		const ctrlOrCmd = isCtrlKeyPressed(event);
		const useCodeFallback = !isLetterKey || ctrlOrCmd && isNonLatinLetter;
		const handlerFromKey = normalizedKeymap.value[byKey];
		const handlerFromLayout = byLayout ? normalizedKeymap.value[byLayout] : void 0;
		const handlerFromCode = useCodeFallback ? normalizedKeymap.value[byCode] : void 0;
		const handler = handlerFromKey ?? handlerFromLayout ?? handlerFromCode;
		if (!handler) return;
		const allowInInputs = typeof handler !== "function" && handler.allowInInputs === true;
		if (activeElement.value && shouldIgnoreCanvasShortcut(activeElement.value, { allowInInputs })) return;
		if (typeof handler !== "function" && handler.disabled?.()) return;
		const run = typeof handler === "function" ? handler : handler.run;
		event.preventDefault();
		event.stopPropagation();
		run(event);
	}
	useEventListener(popOutWindow?.value?.document ?? document, "keydown", onKeyDown);
};
//#endregion
export { useKeybindings as t };
