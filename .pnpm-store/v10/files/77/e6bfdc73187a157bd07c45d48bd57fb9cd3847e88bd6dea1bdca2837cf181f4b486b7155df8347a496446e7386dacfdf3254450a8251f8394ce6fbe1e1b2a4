import { getActiveElement } from "../shared/getActiveElement.js";
import { useArrowNavigation } from "../shared/useArrowNavigation.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { DismissableLayer_default } from "../DismissableLayer/DismissableLayer.js";
import { useCollection } from "../Collection/Collection.js";
import { injectNavigationMenuContext } from "./NavigationMenuRoot.js";
import { EVENT_ROOT_CONTENT_DISMISS, focusFirst, getOpenState, getTabbableCandidates, makeContentId, makeTriggerId } from "./utils.js";
import { injectNavigationMenuItemContext } from "./NavigationMenuItem.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, watchEffect, withCtx } from "vue";

//#region src/NavigationMenu/NavigationMenuContentImpl.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "NavigationMenuContentImpl",
	props: {
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { getItems } = useCollection({ key: "NavigationMenu" });
		const { forwardRef, currentElement } = useForwardExpose();
		const menuContext = injectNavigationMenuContext();
		const itemContext = injectNavigationMenuItemContext();
		const triggerId = makeTriggerId(menuContext.baseId, itemContext.value);
		const contentId = makeContentId(menuContext.baseId, itemContext.value);
		const prevMotionAttributeRef = ref(null);
		const motionAttribute = computed(() => {
			const values = getItems().map((i) => i.ref.id.split("trigger-")[1]);
			if (menuContext.dir.value === "rtl") values.reverse();
			const index = values.indexOf(menuContext.modelValue.value);
			const prevIndex = values.indexOf(menuContext.previousValue.value);
			const isSelected = itemContext.value === menuContext.modelValue.value;
			const wasSelected = prevIndex === values.indexOf(itemContext.value);
			if (!isSelected && !wasSelected) return prevMotionAttributeRef.value;
			const attribute = (() => {
				if (index !== prevIndex) {
					if (isSelected && prevIndex !== -1) return index > prevIndex ? "from-end" : "from-start";
					if (wasSelected && index !== -1) return index > prevIndex ? "to-start" : "to-end";
				}
				return null;
			})();
			prevMotionAttributeRef.value = attribute;
			return attribute;
		});
		function handleFocusOutside(ev) {
			emits("focusOutside", ev);
			emits("interactOutside", ev);
			const target = ev.detail.originalEvent.target;
			if (target.hasAttribute("data-navigation-menu-trigger")) ev.preventDefault();
			if (!ev.defaultPrevented) {
				itemContext.onContentFocusOutside();
				const target$1 = ev.target;
				if (menuContext.rootNavigationMenu?.value?.contains(target$1)) ev.preventDefault();
			}
		}
		function handlePointerDownOutside(ev) {
			emits("pointerDownOutside", ev);
			if (!ev.defaultPrevented) {
				const target = ev.target;
				const isTrigger = getItems().some((i) => i.ref.contains(target));
				const isRootViewport = menuContext.isRootMenu && menuContext.viewport.value?.contains(target);
				if (isTrigger || isRootViewport || !menuContext.isRootMenu) ev.preventDefault();
			}
		}
		watchEffect((cleanupFn) => {
			const content = currentElement.value;
			if (menuContext.isRootMenu && content) {
				const handleClose = () => {
					menuContext.onItemDismiss();
					itemContext.onRootContentClose();
					if (content.contains(getActiveElement())) itemContext.triggerRef.value?.focus();
				};
				content.addEventListener(EVENT_ROOT_CONTENT_DISMISS, handleClose);
				cleanupFn(() => content.removeEventListener(EVENT_ROOT_CONTENT_DISMISS, handleClose));
			}
		});
		function handleEscapeKeyDown(ev) {
			emits("escapeKeyDown", ev);
			if (!ev.defaultPrevented) {
				menuContext.onItemDismiss();
				itemContext.triggerRef?.value?.focus();
				itemContext.wasEscapeCloseRef.value = true;
			}
		}
		function handleKeydown(ev) {
			if (ev.target.closest("[data-reka-navigation-menu]") !== menuContext.rootNavigationMenu.value) return;
			const isMetaKey = ev.altKey || ev.ctrlKey || ev.metaKey;
			const isTabKey = ev.key === "Tab" && !isMetaKey;
			const candidates = getTabbableCandidates(ev.currentTarget);
			if (isTabKey) {
				const focusedElement = getActiveElement();
				const index = candidates.findIndex((candidate) => candidate === focusedElement);
				const isMovingBackwards = ev.shiftKey;
				const nextCandidates = isMovingBackwards ? candidates.slice(0, index).reverse() : candidates.slice(index + 1, candidates.length);
				if (focusFirst(nextCandidates)) ev.preventDefault();
				else {
					itemContext.focusProxyRef.value?.focus();
					return;
				}
			}
			const newSelectedElement = useArrowNavigation(ev, getActiveElement(), void 0, {
				itemsArray: candidates,
				loop: false,
				enableIgnoredElement: true
			});
			newSelectedElement?.focus();
		}
		function handleDismiss() {
			const rootContentDismissEvent = new Event(EVENT_ROOT_CONTENT_DISMISS, {
				bubbles: true,
				cancelable: true
			});
			currentElement.value?.dispatchEvent(rootContentDismissEvent);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DismissableLayer_default), mergeProps({
				id: unref(contentId),
				ref: unref(forwardRef),
				"aria-labelledby": unref(triggerId),
				"data-motion": motionAttribute.value,
				"data-state": unref(getOpenState)(unref(menuContext).modelValue.value === unref(itemContext).value),
				"data-orientation": unref(menuContext).orientation
			}, props, {
				onKeydown: handleKeydown,
				onEscapeKeyDown: handleEscapeKeyDown,
				onPointerDownOutside: handlePointerDownOutside,
				onFocusOutside: handleFocusOutside,
				onDismiss: handleDismiss
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"id",
				"aria-labelledby",
				"data-motion",
				"data-state",
				"data-orientation"
			]);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuContentImpl.vue
var NavigationMenuContentImpl_default = NavigationMenuContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { NavigationMenuContentImpl_default };
//# sourceMappingURL=NavigationMenuContentImpl.js.map