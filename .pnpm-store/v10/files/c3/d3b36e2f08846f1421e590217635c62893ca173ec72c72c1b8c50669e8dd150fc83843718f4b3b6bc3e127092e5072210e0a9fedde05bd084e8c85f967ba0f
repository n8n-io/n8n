const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/NavigationMenu/NavigationMenuIndicator.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "NavigationMenuIndicator",
	props: {
		forceMount: {
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
	setup(__props) {
		const props = __props;
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const menuContext = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const indicatorStyle = (0, vue.ref)();
		const isHorizontal = (0, vue.computed)(() => menuContext.orientation === "horizontal");
		const isVisible = (0, vue.computed)(() => !!menuContext.modelValue.value);
		const { activeTrigger } = menuContext;
		function handlePositionChange() {
			if (!activeTrigger.value) return;
			indicatorStyle.value = {
				size: isHorizontal.value ? activeTrigger.value.offsetWidth : activeTrigger.value.offsetHeight,
				position: isHorizontal.value ? activeTrigger.value.offsetLeft : activeTrigger.value.offsetTop
			};
		}
		(0, vue.watchEffect)(() => {
			if (!menuContext.modelValue.value) return;
			handlePositionChange();
		});
		(0, __vueuse_core.useResizeObserver)(activeTrigger, handlePositionChange);
		(0, __vueuse_core.useResizeObserver)(menuContext.indicatorTrack, handlePositionChange);
		return (_ctx, _cache) => {
			return (0, vue.unref)(menuContext).indicatorTrack.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(vue.Teleport, {
				key: 0,
				to: (0, vue.unref)(menuContext).indicatorTrack.value
			}, [(0, vue.createVNode)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || isVisible.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					"aria-hidden": "true",
					"data-state": isVisible.value ? "visible" : "hidden",
					"data-orientation": (0, vue.unref)(menuContext).orientation,
					"as-child": props.asChild,
					as: _ctx.as,
					style: { ...indicatorStyle.value ? {
						"--reka-navigation-menu-indicator-size": `${indicatorStyle.value.size}px`,
						"--reka-navigation-menu-indicator-position": `${indicatorStyle.value.position}px`
					} : {} }
				}, _ctx.$attrs), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"data-state",
					"data-orientation",
					"as-child",
					"as",
					"style"
				])]),
				_: 3
			}, 8, ["present"])], 8, ["to"])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuIndicator.vue
var NavigationMenuIndicator_default = NavigationMenuIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuIndicator_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuIndicator_default;
  }
});
//# sourceMappingURL=NavigationMenuIndicator.cjs.map