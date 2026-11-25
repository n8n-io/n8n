import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, lf as onMounted, uf as onUnmounted, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Gu as globalLinkActionsEventBus } from "./app-D5flEmb-.js";
//#region src/app/composables/useGlobalLinkActions.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var state = reactive({
	customActions: {},
	delegatedClickHandler: null
});
function useGlobalLinkActions() {
	function registerCustomAction({ key, action }) {
		state.customActions[key] = action;
	}
	function unregisterCustomAction(key) {
		const { [key]: _, ...rest } = state.customActions;
		state.customActions = rest;
	}
	function getElementAttributes(element) {
		const attributesObject = {};
		for (let i = 0; i < element.attributes.length; i++) {
			const attr = element.attributes[i];
			if (attr.name.startsWith("data-action-parameter-")) attributesObject[attr.name.replace("data-action-parameter-", "")] = attr.value;
		}
		return attributesObject;
	}
	function delegateClick(e) {
		const clickedElement = e.target;
		if (!(clickedElement instanceof Element) || clickedElement.tagName !== "A") return;
		const actionAttribute = clickedElement.getAttribute("data-action");
		if (actionAttribute && typeof availableActions.value[actionAttribute] === "function") {
			e.preventDefault();
			const elementAttributes = getElementAttributes(clickedElement);
			availableActions.value[actionAttribute](elementAttributes);
		}
	}
	function reload() {
		if (window.top) window.top.location.reload();
		else window.location.reload();
	}
	const availableActions = computed(() => ({
		reload,
		...state.customActions
	}));
	onMounted(() => {
		if (state.delegatedClickHandler) return;
		state.delegatedClickHandler = delegateClick;
		window.addEventListener("click", delegateClick);
		globalLinkActionsEventBus.on("registerGlobalLinkAction", registerCustomAction);
	});
	onUnmounted(() => {
		window.removeEventListener("click", delegateClick);
		state.delegatedClickHandler = null;
		globalLinkActionsEventBus.off("registerGlobalLinkAction", registerCustomAction);
	});
	return {
		registerCustomAction,
		unregisterCustomAction
	};
}
//#endregion
export { useGlobalLinkActions as t };
