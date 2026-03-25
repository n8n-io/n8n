const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const require_Tabs_TabsRoot = require('./TabsRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Tabs/TabsList.vue?vue&type=script&setup=true&lang.ts
var TabsList_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TabsList",
	props: {
		loop: {
			type: Boolean,
			required: false,
			default: true
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
		const { loop } = (0, vue.toRefs)(props);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const context = require_Tabs_TabsRoot.injectTabsRootContext();
		context.tabsList = currentElement;
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default), {
				"as-child": "",
				orientation: (0, vue.unref)(context).orientation.value,
				dir: (0, vue.unref)(context).dir.value,
				loop: (0, vue.unref)(loop)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					role: "tablist",
					"as-child": _ctx.asChild,
					as: _ctx.as,
					"aria-orientation": (0, vue.unref)(context).orientation.value
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as-child",
					"as",
					"aria-orientation"
				])]),
				_: 3
			}, 8, [
				"orientation",
				"dir",
				"loop"
			]);
		};
	}
});

//#endregion
//#region src/Tabs/TabsList.vue
var TabsList_default = TabsList_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TabsList_default', {
  enumerable: true,
  get: function () {
    return TabsList_default;
  }
});
//# sourceMappingURL=TabsList.cjs.map