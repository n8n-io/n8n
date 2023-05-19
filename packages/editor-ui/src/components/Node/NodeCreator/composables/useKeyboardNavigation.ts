import { ref, set } from 'vue';
import { defineStore } from 'pinia';

export type KeyboardKey = (typeof WATCHED_KEYS)[number];
interface KeyHook {
	keyboardKeys: KeyboardKey[];
	condition?: (type: string, activeItemId: string) => boolean;
	handler: (activeItemId: string, keyboardKey: KeyboardKey) => void;
}

export const KEYBOARD_ID_ATTR = 'data-keyboard-nav-id';
export const WATCHED_KEYS = [
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Enter',
	'Escape',
	'Tab',
];

export const useKeyboardNavigation = defineStore('nodeCreatorKeyboardNavigation', () => {
	const selectableItems = ref<Array<WeakRef<Element>>>([]);
	const activeItemId = ref<string | null>(null);
	// Array of objects that contains key code and handler
	const keysHooks = ref<Record<string, KeyHook>>({});

	function getItemType(element?: Element) {
		return element?.getAttribute('data-keyboard-nav-type');
	}
	function getElementId(element?: Element) {
		return element?.getAttribute(KEYBOARD_ID_ATTR) || undefined;
	}
	async function refreshSelectableItems(): Promise<void> {
		return new Promise((resolve) => {
			// Wait for DOM to update
			cleanupSelectableItems();
			setTimeout(() => {
				selectableItems.value = Array.from(
					document.querySelectorAll('[data-keyboard-nav-type]'),
				).map((el) => new WeakRef(el));
				resolve();
			}, 0);
		});
	}

	function executeKeyHooks(keyboardKey: KeyboardKey, activeItem: Element) {
		const flatHooks = Object.values(keysHooks.value);
		const hooks = flatHooks.filter((hook) => hook.keyboardKeys.includes(keyboardKey));

		hooks.forEach((hook) => {
			if (!activeItemId.value) return;

			const conditionPassed =
				hook.condition === undefined ||
				hook.condition(getItemType(activeItem) || '', activeItemId.value);

			if (conditionPassed && activeItemId.value) {
				hook.handler(activeItemId.value, keyboardKey);
			}
		});
	}

	async function onKeyDown(e: KeyboardEvent) {
		const pressedKey = e.key;
		if (!WATCHED_KEYS.includes(pressedKey)) return;
		e.preventDefault();
		e.stopPropagation();

		await refreshSelectableItems();
		const activeItemIndex = selectableItems.value.findIndex(
			(item) => getElementId(item?.deref()) === activeItemId.value,
		);
		const activeItem = selectableItems.value[activeItemIndex]?.deref();

		const isArrowDown = pressedKey === 'ArrowDown';
		const isArrowUp = pressedKey === 'ArrowUp';

		if (!activeItem) return;

		if (isArrowDown) {
			const nextItemIndex =
				activeItemIndex < selectableItems.value.length - 1 ? activeItemIndex + 1 : 0;

			setActiveItem(selectableItems.value[nextItemIndex]?.deref());
		}
		if (isArrowUp) {
			const previousIndex =
				activeItemIndex > 0 ? activeItemIndex - 1 : selectableItems.value.length - 1;

			setActiveItem(selectableItems.value[previousIndex]?.deref());
		}
		executeKeyHooks(pressedKey, activeItem);
	}

	function setActiveItemId(id: string) {
		activeItemId.value = id;
	}

	function setActiveItem(item?: Element) {
		const itemId = getElementId(item);
		if (!itemId) return;

		setActiveItemId(itemId);
		if (item?.scrollIntoView) {
			item?.scrollIntoView({ block: 'center' });
		}
	}

	async function setActiveItemIndex(index: number) {
		await refreshSelectableItems();

		setActiveItem(selectableItems.value[index]?.deref());
	}

	function attachKeydownEvent() {
		document.addEventListener('keydown', onKeyDown, { capture: true });
	}

	function detachKeydownEvent() {
		cleanupSelectableItems();
		document.removeEventListener('keydown', onKeyDown, { capture: true });
	}

	function registerKeyHook(name: string, hook: KeyHook) {
		hook.keyboardKeys.forEach((keyboardKey) => {
			if (WATCHED_KEYS.includes(keyboardKey)) {
				set(keysHooks.value, name, hook);
			} else {
				throw new Error(`Key ${keyboardKey} is not supported`);
			}
		});
	}

	function cleanupSelectableItems() {
		// Cleanup to make sure DOM elements get garbage collected
		selectableItems.value = [];
	}

	function getActiveItemIndex() {
		return selectableItems.value.findIndex(
			(item) => getElementId(item?.deref()) === activeItemId.value,
		);
	}

	return {
		activeItemId,
		attachKeydownEvent,
		refreshSelectableItems,
		detachKeydownEvent,
		registerKeyHook,
		getActiveItemIndex,
		setActiveItemId,
		setActiveItemIndex,
	};
});
