const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useArrowNavigation = require('../shared/useArrowNavigation.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const require_NavigationMenu_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/NavigationMenu/NavigationMenuItem.vue?vue&type=script&setup=true&lang.ts
const [injectNavigationMenuItemContext, provideNavigationMenuItemContext] = require_shared_createContext.createContext("NavigationMenuItem");
var NavigationMenuItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "NavigationMenuItem",
	props: {
		value: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "li"
		}
	},
	setup(__props) {
		const props = __props;
		require_shared_useForwardExpose.useForwardExpose();
		const { getItems } = require_Collection_Collection.useCollection({ key: "NavigationMenu" });
		const context = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const value = require_shared_useId.useId(props.value);
		const triggerRef = (0, vue.ref)();
		const focusProxyRef = (0, vue.ref)();
		const contentId = require_NavigationMenu_utils.makeContentId(context.baseId, value);
		let restoreContentTabOrderRef = () => ({});
		const wasEscapeCloseRef = (0, vue.ref)(false);
		async function handleContentEntry(side = "start") {
			const el = document.getElementById(contentId);
			if (el) {
				restoreContentTabOrderRef();
				const candidates = require_NavigationMenu_utils.getTabbableCandidates(el);
				if (candidates.length) require_NavigationMenu_utils.focusFirst(side === "start" ? candidates : candidates.reverse());
			}
		}
		function handleContentExit() {
			const el = document.getElementById(contentId);
			if (el) {
				const candidates = require_NavigationMenu_utils.getTabbableCandidates(el);
				if (candidates.length) restoreContentTabOrderRef = require_NavigationMenu_utils.removeFromTabOrder(candidates);
			}
		}
		provideNavigationMenuItemContext({
			value,
			contentId,
			triggerRef,
			focusProxyRef,
			wasEscapeCloseRef,
			onEntryKeyDown: handleContentEntry,
			onFocusProxyEnter: handleContentEntry,
			onContentFocusOutside: handleContentExit,
			onRootContentClose: handleContentExit
		});
		function handleClose() {
			context.onItemDismiss();
			triggerRef.value?.focus();
		}
		function handleKeydown(ev) {
			const currentFocus = require_shared_getActiveElement.getActiveElement();
			if (ev.keyCode === 32 || ev.key === "Enter") if (context.modelValue.value === value) {
				handleClose();
				ev.preventDefault();
				return;
			} else {
				ev.target.click();
				ev.preventDefault();
				return;
			}
			const itemsArray = getItems().filter((i) => i.ref.parentElement?.hasAttribute("data-menu-item")).map((i) => i.ref);
			if (!itemsArray.includes(currentFocus)) return;
			const newSelectedElement = require_shared_useArrowNavigation.useArrowNavigation(ev, currentFocus, void 0, {
				itemsArray,
				loop: false
			});
			if (newSelectedElement) newSelectedElement?.focus();
			ev.preventDefault();
			ev.stopPropagation();
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				"as-child": _ctx.asChild,
				as: _ctx.as,
				"data-menu-item": "",
				onKeydown: (0, vue.withKeys)(handleKeydown, [
					"up",
					"down",
					"left",
					"right",
					"home",
					"end",
					"space"
				])
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as-child", "as"]);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuItem.vue
var NavigationMenuItem_default = NavigationMenuItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuItem_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuItem_default;
  }
});
Object.defineProperty(exports, 'injectNavigationMenuItemContext', {
  enumerable: true,
  get: function () {
    return injectNavigationMenuItemContext;
  }
});
//# sourceMappingURL=NavigationMenuItem.cjs.map