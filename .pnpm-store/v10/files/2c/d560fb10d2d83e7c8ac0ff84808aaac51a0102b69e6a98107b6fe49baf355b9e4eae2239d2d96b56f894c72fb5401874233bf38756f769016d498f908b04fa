const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Switch_SwitchRoot = require('./SwitchRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Switch/SwitchThumb.vue?vue&type=script&setup=true&lang.ts
var SwitchThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SwitchThumb",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const rootContext = require_Switch_SwitchRoot.injectSwitchRootContext();
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				"data-state": (0, vue.unref)(rootContext).modelValue?.value ? "checked" : "unchecked",
				"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"data-state",
				"data-disabled",
				"as-child",
				"as"
			]);
		};
	}
});

//#endregion
//#region src/Switch/SwitchThumb.vue
var SwitchThumb_default = SwitchThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SwitchThumb_default', {
  enumerable: true,
  get: function () {
    return SwitchThumb_default;
  }
});
//# sourceMappingURL=SwitchThumb.cjs.map