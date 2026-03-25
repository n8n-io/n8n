const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/NavigationMenu/NavigationMenuList.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuList_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "NavigationMenuList",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "ul"
		}
	},
	setup(__props) {
		const props = __props;
		const menuContext = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		(0, vue.onMounted)(() => {
			menuContext.onIndicatorTrackChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				style: { "position": "relative" }
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
					"as-child": props.asChild,
					as: _ctx.as,
					"data-orientation": (0, vue.unref)(menuContext).orientation
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"as-child",
					"as",
					"data-orientation"
				])]),
				_: 3
			}, 512);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuList.vue
var NavigationMenuList_default = NavigationMenuList_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuList_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuList_default;
  }
});
//# sourceMappingURL=NavigationMenuList.cjs.map