const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useEmitAsProps = require('../shared/useEmitAsProps.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Dialog_DialogRoot = require('./DialogRoot.cjs');
const require_Dialog_DialogContentModal = require('./DialogContentModal.cjs');
const require_Dialog_DialogContentNonModal = require('./DialogContentNonModal.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Dialog/DialogContent.vue?vue&type=script&setup=true&lang.ts
var DialogContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DialogContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Dialog_DialogRoot.injectDialogRootContext();
		const emitsAsProps = require_shared_useEmitAsProps.useEmitAsProps(emits);
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(rootContext).open.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.unref)(rootContext).modal.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Dialog_DialogContentModal.DialogContentModal_default, (0, vue.mergeProps)({
					key: 0,
					ref: (0, vue.unref)(forwardRef)
				}, {
					...props,
					...(0, vue.unref)(emitsAsProps),
					..._ctx.$attrs
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16)) : ((0, vue.openBlock)(), (0, vue.createBlock)(require_Dialog_DialogContentNonModal.DialogContentNonModal_default, (0, vue.mergeProps)({
					key: 1,
					ref: (0, vue.unref)(forwardRef)
				}, {
					...props,
					...(0, vue.unref)(emitsAsProps),
					..._ctx.$attrs
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16))]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogContent.vue
var DialogContent_default = DialogContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogContent_default', {
  enumerable: true,
  get: function () {
    return DialogContent_default;
  }
});
//# sourceMappingURL=DialogContent.cjs.map