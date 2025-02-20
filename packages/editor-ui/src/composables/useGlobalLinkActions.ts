/**
 * Creates event listeners for `data-action` attribute to allow for actions to be called from locale without using
 * unsafe onclick attribute
 */
import { reactive, computed, onMounted, onUnmounted } from 'vue';
import type { LinkActionFn, RegisterCustomActionOpts } from '@/event-bus';
import { globalLinkActionsEventBus } from '@/event-bus';

const state = reactive({
	customActions: {} as Record<string, LinkActionFn>,
	delegatedClickHandler: null as null | ((e: MouseEvent) => void),
});

export function useGlobalLinkActions() {
	function registerCustomAction({ key, action }: RegisterCustomActionOpts) {
		state.customActions[key] = action;
	}
	function unregisterCustomAction(key: string) {
		const { [key]: _, ...rest } = state.customActions;
		state.customActions = rest;
	}
	function getElementAttributes(element: Element) {
		const attributesObject: Record<string, string> = {};

		for (let i = 0; i < element.attributes.length; i++) {
			const attr = element.attributes[i];
			if (attr.name.startsWith('data-action-parameter-')) {
				attributesObject[attr.name.replace('data-action-parameter-', '')] = attr.value;
			}
		}
		return attributesObject;
	}

	function delegateClick(e: MouseEvent) {
		const clickedElement = e.target;
		if (!(clickedElement instanceof Element) || clickedElement.tagName !== 'A') return;

		const actionAttribute = clickedElement.getAttribute('data-action');
		if (actionAttribute && typeof availableActions.value[actionAttribute] === 'function') {
			e.preventDefault();
			// Extract and parse `data-action-parameter-` attributes and pass them to the action
			const elementAttributes = getElementAttributes(clickedElement);
			availableActions.value[actionAttribute](elementAttributes);
		}
	}

	function reload() {
		if (window.top) {
			window.top.location.reload();
		} else {
			window.location.reload();
		}
	}

	const availableActions = computed<{ [key: string]: LinkActionFn }>(() => ({
		reload,
		...state.customActions,
	}));

	onMounted(() => {
		if (state.delegatedClickHandler) return;

		state.delegatedClickHandler = delegateClick;
		window.addEventListener('click', delegateClick);

		globalLinkActionsEventBus.on('registerGlobalLinkAction', registerCustomAction);
	});

	onUnmounted(() => {
		window.removeEventListener('click', delegateClick);
		state.delegatedClickHandler = null;

		globalLinkActionsEventBus.off('registerGlobalLinkAction', registerCustomAction);
	});

	return {
		registerCustomAction,
		unregisterCustomAction,
	};
}
