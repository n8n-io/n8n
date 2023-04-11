import { getCurrentInstance, ref, set, del, onUnmounted, nextTick } from 'vue';

import { useNodeCreatorStore } from '@/stores/nodeCreator';
// import { useViewStacks } from './useViewStacks'
import { defineStore } from 'pinia';

type KeyboardKey = (typeof WATCHED_KEYS)[number];
interface KeyHook {
	keyboardKey: KeyboardKey;
	condition?: (params: any) => boolean;
	handler: (any) => void;
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
	const selectableItems = ref<HTMLElement[]>([]);
	const activeItemId = ref<string | null>(null);
	// Array of objects that contains key code and handler
	const keysHooks = ref<Record<string, KeyHook>>({});

	function getItemType(element: HTMLElement) {
		return element?.getAttribute('data-keyboard-nav-type');
	}
	function getElementId(element: HTMLElement) {
		return element?.getAttribute(KEYBOARD_ID_ATTR);
	}
	function refreshSelectableItems() {
		setTimeout(() => {
			cleanupItems();
			selectableItems.value = Array.from(document.querySelectorAll('[data-keyboard-nav-type]'));
		}, 0);
	}
	function executeKeyHooks(keyboardKey: KeyboardKey, activeItem: HTMLElement) {
		const flatHooks = Object.values(keysHooks.value);
		const hooks = flatHooks.filter((hook) => hook.keyboardKey === keyboardKey);

		hooks.forEach((hook) => {
			const conditionPassed =
				hook.condition === undefined ||
				hook.condition({ activeItemId: activeItemId.value, type: getItemType(activeItem) });
			if (conditionPassed) {
				hook.handler({
					activeItemId: activeItemId.value,
					type: getItemType(activeItem),
					refreshSelectableItems,
				});
			}
		});
	}

	function onKeyDown(e: KeyboardEvent) {
		const pressedKey = e.key;
		if (!WATCHED_KEYS.includes(pressedKey)) return;
		e.preventDefault();
		e.stopPropagation();

		const activeItemIndex = selectableItems.value.findIndex(
			(item) => getElementId(item) === activeItemId.value,
		);
		const activeItem = selectableItems.value[activeItemIndex];

		refreshSelectableItems();
		const isArrowDown = pressedKey === 'ArrowDown';
		const isArrowUp = pressedKey === 'ArrowUp';

		if (isArrowDown) {
			const nextItemIndex =
				activeItemIndex < selectableItems.value.length - 1 ? activeItemIndex + 1 : 0;

			setActiveItemId(getElementId(selectableItems.value[nextItemIndex]));

			selectableItems.value[nextItemIndex].scrollIntoView({ block: 'nearest' });
		}
		if (isArrowUp) {
			const previousIndex =
				activeItemIndex > 0 ? activeItemIndex - 1 : selectableItems.value.length - 1;

			setActiveItemId(getElementId(selectableItems.value[previousIndex]));

			activeItem.scrollIntoView({ block: 'nearest' });
		}
		executeKeyHooks(pressedKey, activeItem);
	}

	function setActiveItemId(itemId: string | null) {
		activeItemId.value = itemId;
	}
	function setFirstItemActive() {
		refreshSelectableItems();
		setTimeout(() => {
			setActiveItemId(getElementId(selectableItems.value[0]));
		}, 0);
	}

	function attachKeydownEvent() {
		document.addEventListener('keydown', onKeyDown, { capture: true });
	}
	function detachKeydownEvent() {
		cleanupItems();
		document.removeEventListener('keydown', onKeyDown, { capture: true });
	}

	function registerKeyHook(name: string, hook: KeyHook) {
		if (WATCHED_KEYS.includes(hook.keyboardKey)) {
			set(keysHooks.value, name, hook);
		} else {
			throw new Error(`Key ${hook.keyboardKey} is not supported`);
		}
	}

	function cleanupItems() {
		for (let i = 0; i <= selectableItems.value.length; i++) {
			del(selectableItems.value, i);
		}

		selectableItems.value = [];
	}

	return {
		activeItemId,
		attachKeydownEvent,
		detachKeydownEvent,
		refreshSelectableItems,
		onKeyDown,
		setActiveItemId,
		setFirstItemActive,
		registerKeyHook,
	};
});
