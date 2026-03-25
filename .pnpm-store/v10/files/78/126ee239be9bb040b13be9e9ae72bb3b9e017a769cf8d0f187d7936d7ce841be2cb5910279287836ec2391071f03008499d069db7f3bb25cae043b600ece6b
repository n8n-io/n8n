const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useEmitAsProps = require('../shared/useEmitAsProps.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Dialog_DialogRoot = require('./DialogRoot.cjs');
const require_Dialog_DialogContentImpl = require('./DialogContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Dialog/DialogContentNonModal.vue?vue&type=script&setup=true&lang.ts
var DialogContentNonModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DialogContentNonModal",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		trapFocus: {
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
		const rootContext = require_Dialog_DialogRoot.injectDialogRootContext();
		const hasInteractedOutsideRef = (0, vue.ref)(false);
		const hasPointerDownOutsideRef = (0, vue.ref)(false);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Dialog_DialogContentImpl.DialogContentImpl_default, (0, vue.mergeProps)({
				...props,
				...(0, vue.unref)(emitsAsProps)
			}, {
				"trap-focus": false,
				"disable-outside-pointer-events": false,
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					if (!event.defaultPrevented) {
						if (!hasInteractedOutsideRef.value) (0, vue.unref)(rootContext).triggerElement.value?.focus();
						event.preventDefault();
					}
					hasInteractedOutsideRef.value = false;
					hasPointerDownOutsideRef.value = false;
				}),
				onInteractOutside: _cache[1] || (_cache[1] = (event) => {
					if (!event.defaultPrevented) {
						hasInteractedOutsideRef.value = true;
						if (event.detail.originalEvent.type === "pointerdown") hasPointerDownOutsideRef.value = true;
					}
					const target = event.target;
					const targetIsTrigger = (0, vue.unref)(rootContext).triggerElement.value?.contains(target);
					if (targetIsTrigger) event.preventDefault();
					if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.value) event.preventDefault();
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Dialog/DialogContentNonModal.vue
var DialogContentNonModal_default = DialogContentNonModal_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogContentNonModal_default', {
  enumerable: true,
  get: function () {
    return DialogContentNonModal_default;
  }
});
//# sourceMappingURL=DialogContentNonModal.cjs.map