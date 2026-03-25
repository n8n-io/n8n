const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Toast_ToastAnnounceExclude = require('./ToastAnnounceExclude.cjs');
const require_Toast_ToastRootImpl = require('./ToastRootImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Toast/ToastClose.vue?vue&type=script&setup=true&lang.ts
var ToastClose_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ToastClose",
	props: {
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
		const rootContext = require_Toast_ToastRootImpl.injectToastRootContext();
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Toast_ToastAnnounceExclude.ToastAnnounceExclude_default, { "as-child": "" }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
					ref: (0, vue.unref)(forwardRef),
					type: _ctx.as === "button" ? "button" : void 0,
					onClick: (0, vue.unref)(rootContext).onClose
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["type", "onClick"])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Toast/ToastClose.vue
var ToastClose_default = ToastClose_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToastClose_default', {
  enumerable: true,
  get: function () {
    return ToastClose_default;
  }
});
//# sourceMappingURL=ToastClose.cjs.map