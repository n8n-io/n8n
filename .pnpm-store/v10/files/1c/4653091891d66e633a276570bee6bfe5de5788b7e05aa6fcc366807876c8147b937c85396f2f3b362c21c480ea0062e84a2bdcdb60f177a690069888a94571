const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useEmitAsProps = require('../shared/useEmitAsProps.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useHideOthers = require('../shared/useHideOthers.cjs');
const require_Dialog_DialogRoot = require('./DialogRoot.cjs');
const require_Dialog_DialogContentImpl = require('./DialogContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Dialog/DialogContentModal.vue?vue&type=script&setup=true&lang.ts
var DialogContentModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DialogContentModal",
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
		const rootContext = require_Dialog_DialogRoot.injectDialogRootContext();
		const emitsAsProps = require_shared_useEmitAsProps.useEmitAsProps(emits);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		require_shared_useHideOthers.useHideOthers(currentElement);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Dialog_DialogContentImpl.DialogContentImpl_default, (0, vue.mergeProps)({
				...props,
				...(0, vue.unref)(emitsAsProps)
			}, {
				ref: (0, vue.unref)(forwardRef),
				"trap-focus": (0, vue.unref)(rootContext).open.value,
				"disable-outside-pointer-events": true,
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					if (!event.defaultPrevented) {
						event.preventDefault();
						(0, vue.unref)(rootContext).triggerElement.value?.focus();
					}
				}),
				onPointerDownOutside: _cache[1] || (_cache[1] = (event) => {
					const originalEvent = event.detail.originalEvent;
					const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
					const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
					if (isRightClick) event.preventDefault();
				}),
				onFocusOutside: _cache[2] || (_cache[2] = (event) => {
					event.preventDefault();
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["trap-focus"]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogContentModal.vue
var DialogContentModal_default = DialogContentModal_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogContentModal_default', {
  enumerable: true,
  get: function () {
    return DialogContentModal_default;
  }
});
//# sourceMappingURL=DialogContentModal.cjs.map