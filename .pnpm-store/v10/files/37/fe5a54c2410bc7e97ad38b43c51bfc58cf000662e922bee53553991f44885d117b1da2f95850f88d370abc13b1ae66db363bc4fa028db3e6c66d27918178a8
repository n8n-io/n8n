const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Toast_ToastAnnounceExclude = require('./ToastAnnounceExclude.cjs');
const require_Toast_ToastClose = require('./ToastClose.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Toast/ToastAction.vue?vue&type=script&setup=true&lang.ts
var ToastAction_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ToastAction",
	props: {
		altText: {
			type: String,
			required: true
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
		if (!props.altText) throw new Error("Missing prop `altText` expected on `ToastAction`");
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return _ctx.altText ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Toast_ToastAnnounceExclude.ToastAnnounceExclude_default, {
				key: 0,
				"alt-text": _ctx.altText,
				"as-child": ""
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_Toast_ToastClose.ToastClose_default, {
					ref: (0, vue.unref)(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, ["as", "as-child"])]),
				_: 3
			}, 8, ["alt-text"])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Toast/ToastAction.vue
var ToastAction_default = ToastAction_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToastAction_default', {
  enumerable: true,
  get: function () {
    return ToastAction_default;
  }
});
//# sourceMappingURL=ToastAction.cjs.map