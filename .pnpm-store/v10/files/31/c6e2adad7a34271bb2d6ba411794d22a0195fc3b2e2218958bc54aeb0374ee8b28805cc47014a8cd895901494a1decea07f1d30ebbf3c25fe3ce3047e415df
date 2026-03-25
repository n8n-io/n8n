const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Dialog_DialogRoot = require('./DialogRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Dialog/DialogTrigger.vue?vue&type=script&setup=true&lang.ts
var DialogTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DialogTrigger",
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
		const rootContext = require_Dialog_DialogRoot.injectDialogRootContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		rootContext.contentId ||= require_shared_useId.useId(void 0, "reka-dialog-content");
		(0, vue.onMounted)(() => {
			rootContext.triggerElement.value = currentElement.value;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				ref: (0, vue.unref)(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-haspopup": "dialog",
				"aria-expanded": (0, vue.unref)(rootContext).open.value || false,
				"aria-controls": (0, vue.unref)(rootContext).open.value ? (0, vue.unref)(rootContext).contentId : void 0,
				"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
				onClick: (0, vue.unref)(rootContext).onOpenToggle
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"type",
				"aria-expanded",
				"aria-controls",
				"data-state",
				"onClick"
			]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogTrigger.vue
var DialogTrigger_default = DialogTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogTrigger_default', {
  enumerable: true,
  get: function () {
    return DialogTrigger_default;
  }
});
//# sourceMappingURL=DialogTrigger.cjs.map