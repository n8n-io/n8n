const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useBodyScrollLock = require('../shared/useBodyScrollLock.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Dialog_DialogRoot = require('./DialogRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Dialog/DialogOverlayImpl.vue?vue&type=script&setup=true&lang.ts
var DialogOverlayImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DialogOverlayImpl",
	props: {
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
		const rootContext = require_Dialog_DialogRoot.injectDialogRootContext();
		require_shared_useBodyScrollLock.useBodyScrollLock(true);
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
				style: { "pointer-events": "auto" }
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-state"
			]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogOverlayImpl.vue
var DialogOverlayImpl_default = DialogOverlayImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogOverlayImpl_default', {
  enumerable: true,
  get: function () {
    return DialogOverlayImpl_default;
  }
});
//# sourceMappingURL=DialogOverlayImpl.cjs.map