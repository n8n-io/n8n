/**
 * Creates event listeners for `data-action` attribute to allow for actions to be called from locale without using
 * unsafe onclick attribute
 */
import { reactive, del, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';

const state = reactive({
	customActions: {} as Record<string, Function>,
});

export default () => {
	function registerCustomAction(key: string, action: Function) {
		state.customActions[key] = action;
	}
	function unregisterCustomAction(key: string) {
		del(state.customActions, key);
	}
	function delegateClick(e: MouseEvent) {
		const clickedElement = e.target;
		if (!(clickedElement instanceof Element) || clickedElement.tagName !== 'A') return;

		const actionAttribute = clickedElement.getAttribute('data-action');
		if(actionAttribute && typeof availableActions.value[actionAttribute] === 'function') {
			e.preventDefault();
			availableActions.value[actionAttribute]();
		}
	}

	function reload() {
		if (window.top) {
			window.top.location.reload();
		} else {
			window.location.reload();
		}
	}

	const availableActions = computed<{[key: string]: Function}>(() => ({
		reload,
		...state.customActions,
	}));

	onMounted(() => {
		const instance = getCurrentInstance();
		window.addEventListener('click', delegateClick);
		instance?.proxy.$root.$on('registerGlobalLinkAction', registerCustomAction);
	});

	onUnmounted(() => {
		const instance = getCurrentInstance();
		window.removeEventListener('click', delegateClick);
		instance?.proxy.$root.$off('registerGlobalLinkAction', registerCustomAction);
	});

	return {
		registerCustomAction,
		unregisterCustomAction,
	};
};

