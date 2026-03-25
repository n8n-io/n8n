const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const require_NavigationMenu_utils = require('./utils.cjs');
const require_NavigationMenu_NavigationMenuItem = require('./NavigationMenuItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/NavigationMenu/NavigationMenuTrigger.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = ["aria-owns"];
var NavigationMenuTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "NavigationMenuTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const menuContext = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const itemContext = require_NavigationMenu_NavigationMenuItem.injectNavigationMenuItemContext();
		const { CollectionItem } = require_Collection_Collection.useCollection({ key: "NavigationMenu" });
		const { forwardRef, currentElement: triggerElement } = require_shared_useForwardExpose.useForwardExpose();
		const triggerId = (0, vue.ref)("");
		const contentId = (0, vue.ref)("");
		const hasPointerMoveOpenedRef = (0, __vueuse_core.refAutoReset)(false, 300);
		const wasClickCloseRef = (0, vue.ref)(false);
		const open = (0, vue.computed)(() => itemContext.value === menuContext.modelValue.value);
		(0, vue.onMounted)(() => {
			itemContext.triggerRef = triggerElement;
			triggerId.value = require_NavigationMenu_utils.makeTriggerId(menuContext.baseId, itemContext.value);
			contentId.value = require_NavigationMenu_utils.makeContentId(menuContext.baseId, itemContext.value);
		});
		function handlePointerEnter() {
			if (menuContext.disableHoverTrigger.value) return;
			wasClickCloseRef.value = false;
			itemContext.wasEscapeCloseRef.value = false;
		}
		function handlePointerMove(ev) {
			if (menuContext.disableHoverTrigger.value) return;
			if (ev.pointerType === "mouse") {
				if (props.disabled || wasClickCloseRef.value || itemContext.wasEscapeCloseRef.value || hasPointerMoveOpenedRef.value) return;
				menuContext.onTriggerEnter(itemContext.value);
				hasPointerMoveOpenedRef.value = true;
			}
		}
		function handlePointerLeave(ev) {
			if (menuContext.disableHoverTrigger.value) return;
			if (ev.pointerType === "mouse") {
				if (props.disabled) return;
				menuContext.onTriggerLeave();
				hasPointerMoveOpenedRef.value = false;
			}
		}
		function handleClick(event) {
			if (event.pointerType === "mouse" && menuContext.disableClickTrigger.value) return;
			if (hasPointerMoveOpenedRef.value) return;
			if (open.value) menuContext.onItemSelect("");
			else menuContext.onItemSelect(itemContext.value);
			wasClickCloseRef.value = open.value;
		}
		function handleKeydown(ev) {
			const verticalEntryKey = menuContext.dir.value === "rtl" ? "ArrowLeft" : "ArrowRight";
			const entryKey = {
				horizontal: "ArrowDown",
				vertical: verticalEntryKey
			}[menuContext.orientation];
			if (open.value && ev.key === entryKey) {
				itemContext.onEntryKeyDown();
				ev.preventDefault();
				ev.stopPropagation();
			}
		}
		function setFocusProxyRef(node) {
			itemContext.focusProxyRef.value = (0, __vueuse_core.unrefElement)(node);
			return void 0;
		}
		function handleVisuallyHiddenFocus(ev) {
			const content = document.getElementById(itemContext.contentId);
			const prevFocusedElement = ev.relatedTarget;
			const wasTriggerFocused = prevFocusedElement === triggerElement.value;
			const wasFocusFromContent = content?.contains(prevFocusedElement);
			if (wasTriggerFocused || !wasFocusFromContent) itemContext.onFocusProxyEnter(wasTriggerFocused ? "start" : "end");
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [(0, vue.createVNode)((0, vue.unref)(CollectionItem), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
					id: triggerId.value,
					ref: (0, vue.unref)(forwardRef),
					disabled: _ctx.disabled,
					"data-disabled": _ctx.disabled ? "" : void 0,
					"data-state": (0, vue.unref)(require_NavigationMenu_utils.getOpenState)(open.value),
					"data-navigation-menu-trigger": "",
					"aria-expanded": open.value,
					"aria-controls": contentId.value,
					"as-child": props.asChild,
					as: _ctx.as
				}, _ctx.$attrs, {
					onPointerenter: handlePointerEnter,
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onClick: handleClick,
					onKeydown: handleKeydown
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"disabled",
					"data-disabled",
					"data-state",
					"aria-expanded",
					"aria-controls",
					"as-child",
					"as"
				])]),
				_: 3
			}), open.value ? ((0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, { key: 0 }, [(0, vue.createVNode)((0, vue.unref)(require_VisuallyHidden_VisuallyHidden.VisuallyHidden_default), {
				ref: setFocusProxyRef,
				"aria-hidden": "true",
				tabindex: 0,
				onFocus: handleVisuallyHiddenFocus
			}), (0, vue.unref)(menuContext).viewport ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("span", {
				key: 0,
				"aria-owns": contentId.value
			}, null, 8, _hoisted_1)) : (0, vue.createCommentVNode)("v-if", true)], 64)) : (0, vue.createCommentVNode)("v-if", true)], 64);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuTrigger.vue
var NavigationMenuTrigger_default = NavigationMenuTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuTrigger_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuTrigger_default;
  }
});
//# sourceMappingURL=NavigationMenuTrigger.cjs.map