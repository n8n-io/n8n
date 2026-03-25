const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Dialog_DialogRoot = require('./DialogRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Dialog/DialogClose.vue?vue&type=script&setup=true&lang.ts
var DialogClose_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DialogClose",
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
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Dialog_DialogRoot.injectDialogRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				type: _ctx.as === "button" ? "button" : void 0,
				onClick: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).onOpenChange(false))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["type"]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogClose.vue
var DialogClose_default = DialogClose_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogClose_default', {
  enumerable: true,
  get: function () {
    return DialogClose_default;
  }
});
//# sourceMappingURL=DialogClose.cjs.map