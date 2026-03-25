const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useArrowNavigation = require('../shared/useArrowNavigation.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const require_NavigationMenu_utils = require('./utils.cjs');
const require_NavigationMenu_NavigationMenuItem = require('./NavigationMenuItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/NavigationMenu/NavigationMenuContentImpl.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { getItems } = require_Collection_Collection.useCollection({ key: "NavigationMenu" });
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const menuContext = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const itemContext = require_NavigationMenu_NavigationMenuItem.injectNavigationMenuItemContext();
		const triggerId = require_NavigationMenu_utils.makeTriggerId(menuContext.baseId, itemContext.value);
		const contentId = require_NavigationMenu_utils.makeContentId(menuContext.baseId, itemContext.value);
		const prevMotionAttributeRef = (0, vue.ref)(null);
		const motionAttribute = (0, vue.computed)(() => {
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
		(0, vue.watchEffect)((cleanupFn) => {
			const content = currentElement.value;
			if (menuContext.isRootMenu && content) {
				const handleClose = () => {
					menuContext.onItemDismiss();
					itemContext.onRootContentClose();
					if (content.contains(require_shared_getActiveElement.getActiveElement())) itemContext.triggerRef.value?.focus();
				};
				content.addEventListener(require_NavigationMenu_utils.EVENT_ROOT_CONTENT_DISMISS, handleClose);
				cleanupFn(() => content.removeEventListener(require_NavigationMenu_utils.EVENT_ROOT_CONTENT_DISMISS, handleClose));
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
			const candidates = require_NavigationMenu_utils.getTabbableCandidates(ev.currentTarget);
			if (isTabKey) {
				const focusedElement = require_shared_getActiveElement.getActiveElement();
				const index = candidates.findIndex((candidate) => candidate === focusedElement);
				const isMovingBackwards = ev.shiftKey;
				const nextCandidates = isMovingBackwards ? candidates.slice(0, index).reverse() : candidates.slice(index + 1, candidates.length);
				if (require_NavigationMenu_utils.focusFirst(nextCandidates)) ev.preventDefault();
				else {
					itemContext.focusProxyRef.value?.focus();
					return;
				}
			}
			const newSelectedElement = require_shared_useArrowNavigation.useArrowNavigation(ev, require_shared_getActiveElement.getActiveElement(), void 0, {
				itemsArray: candidates,
				loop: false,
				enableIgnoredElement: true
			});
			newSelectedElement?.focus();
		}
		function handleDismiss() {
			const rootContentDismissEvent = new Event(require_NavigationMenu_utils.EVENT_ROOT_CONTENT_DISMISS, {
				bubbles: true,
				cancelable: true
			});
			currentElement.value?.dispatchEvent(rootContentDismissEvent);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), (0, vue.mergeProps)({
				id: (0, vue.unref)(contentId),
				ref: (0, vue.unref)(forwardRef),
				"aria-labelledby": (0, vue.unref)(triggerId),
				"data-motion": motionAttribute.value,
				"data-state": (0, vue.unref)(require_NavigationMenu_utils.getOpenState)((0, vue.unref)(menuContext).modelValue.value === (0, vue.unref)(itemContext).value),
				"data-orientation": (0, vue.unref)(menuContext).orientation
			}, props, {
				onKeydown: handleKeydown,
				onEscapeKeyDown: handleEscapeKeyDown,
				onPointerDownOutside: handlePointerDownOutside,
				onFocusOutside: handleFocusOutside,
				onDismiss: handleDismiss
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'NavigationMenuContentImpl_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuContentImpl_default;
  }
});
//# sourceMappingURL=NavigationMenuContentImpl.cjs.map