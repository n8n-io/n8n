const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useEmitAsProps = require('../shared/useEmitAsProps.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Dialog_DialogContent = require('../Dialog/DialogContent.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/AlertDialog/AlertDialogContent.vue?vue&type=script&setup=true&lang.ts
const [injectAlertDialogContentContext, provideAlertDialogContentContext] = require_shared_createContext.createContext("AlertDialogContent");
var AlertDialogContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "AlertDialogContent",
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
		const emitsAsProps = require_shared_useEmitAsProps.useEmitAsProps(emits);
		require_shared_useForwardExpose.useForwardExpose();
		const cancelElement = (0, vue.ref)();
		provideAlertDialogContentContext({ onCancelElementChange: (el) => {
			cancelElement.value = el;
		} });
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Dialog_DialogContent.DialogContent_default), (0, vue.mergeProps)({
				...props,
				...(0, vue.unref)(emitsAsProps)
			}, {
				role: "alertdialog",
				onPointerDownOutside: _cache[0] || (_cache[0] = (0, vue.withModifiers)(() => {}, ["prevent"])),
				onInteractOutside: _cache[1] || (_cache[1] = (0, vue.withModifiers)(() => {}, ["prevent"])),
				onOpenAutoFocus: _cache[2] || (_cache[2] = () => {
					(0, vue.nextTick)(() => {
						cancelElement.value?.focus({ preventScroll: true });
					});
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/AlertDialog/AlertDialogContent.vue
var AlertDialogContent_default = AlertDialogContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'AlertDialogContent_default', {
  enumerable: true,
  get: function () {
    return AlertDialogContent_default;
  }
});
Object.defineProperty(exports, 'injectAlertDialogContentContext', {
  enumerable: true,
  get: function () {
    return injectAlertDialogContentContext;
  }
});
//# sourceMappingURL=AlertDialogContent.cjs.map