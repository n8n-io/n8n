const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Dialog_DialogClose = require('../Dialog/DialogClose.cjs');
const require_AlertDialog_AlertDialogContent = require('./AlertDialogContent.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/AlertDialog/AlertDialogCancel.vue?vue&type=script&setup=true&lang.ts
var AlertDialogCancel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "AlertDialogCancel",
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
		const contentContext = require_AlertDialog_AlertDialogContent.injectAlertDialogContentContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		(0, vue.onMounted)(() => {
			contentContext.onCancelElementChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Dialog_DialogClose.DialogClose_default), (0, vue.mergeProps)(props, { ref: (0, vue.unref)(forwardRef) }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/AlertDialog/AlertDialogCancel.vue
var AlertDialogCancel_default = AlertDialogCancel_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'AlertDialogCancel_default', {
  enumerable: true,
  get: function () {
    return AlertDialogCancel_default;
  }
});
//# sourceMappingURL=AlertDialogCancel.cjs.map