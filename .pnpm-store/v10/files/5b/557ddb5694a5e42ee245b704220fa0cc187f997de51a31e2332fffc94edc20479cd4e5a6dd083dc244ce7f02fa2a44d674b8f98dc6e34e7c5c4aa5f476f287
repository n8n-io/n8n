const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const require_NavigationMenu_utils = require('./utils.cjs');
const require_NavigationMenu_NavigationMenuItem = require('./NavigationMenuItem.cjs');
const require_NavigationMenu_NavigationMenuContentImpl = require('./NavigationMenuContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/NavigationMenu/NavigationMenuContent.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "NavigationMenuContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
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
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits((0, __vueuse_shared.reactiveOmit)(props, "forceMount"), emits);
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const menuContext = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const itemContext = require_NavigationMenu_NavigationMenuItem.injectNavigationMenuItemContext();
		const open = (0, vue.computed)(() => itemContext.value === menuContext.modelValue.value);
		const isLastActiveValue = (0, vue.computed)(() => {
			if (menuContext.viewport.value) {
				if (!menuContext.modelValue.value && menuContext.previousValue.value) return menuContext.previousValue.value === itemContext.value;
			}
			return false;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(vue.Teleport, {
				to: (0, vue.unref)(__vueuse_shared.isClient) && (0, vue.unref)(menuContext).viewport.value ? (0, vue.unref)(menuContext).viewport.value : "body",
				disabled: (0, vue.unref)(__vueuse_shared.isClient) && (0, vue.unref)(menuContext).viewport.value ? !(0, vue.unref)(menuContext).viewport.value : true
			}, [(0, vue.createVNode)((0, vue.unref)(require_Presence_Presence.Presence_default), {
				present: _ctx.forceMount || open.value || isLastActiveValue.value,
				"force-mount": !(0, vue.unref)(menuContext).unmountOnHide.value
			}, {
				default: (0, vue.withCtx)(({ present }) => [(0, vue.createVNode)(require_NavigationMenu_NavigationMenuContentImpl.NavigationMenuContentImpl_default, (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					"data-state": (0, vue.unref)(require_NavigationMenu_utils.getOpenState)(open.value),
					style: { pointerEvents: !open.value && (0, vue.unref)(menuContext).isRootMenu ? "none" : void 0 }
				}, {
					..._ctx.$attrs,
					...(0, vue.unref)(forwarded)
				}, {
					hidden: !present,
					onPointerenter: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(menuContext).onContentEnter((0, vue.unref)(itemContext).value)),
					onPointerleave: _cache[1] || (_cache[1] = ($event) => (0, vue.unref)(require_NavigationMenu_utils.whenMouse)(() => (0, vue.unref)(menuContext).onContentLeave())($event)),
					onPointerDownOutside: _cache[2] || (_cache[2] = ($event) => emits("pointerDownOutside", $event)),
					onFocusOutside: _cache[3] || (_cache[3] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[4] || (_cache[4] = ($event) => emits("interactOutside", $event))
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 2
				}, 1040, [
					"data-state",
					"style",
					"hidden"
				])]),
				_: 3
			}, 8, ["present", "force-mount"])], 8, ["to", "disabled"]);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuContent.vue
var NavigationMenuContent_default = NavigationMenuContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuContent_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuContent_default;
  }
});
//# sourceMappingURL=NavigationMenuContent.cjs.map