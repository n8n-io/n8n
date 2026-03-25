const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Dialog_DialogRoot = require('./DialogRoot.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_FocusScope_FocusScope = require('../FocusScope/FocusScope.cjs');
const require_Menu_utils = require('../Menu/utils.cjs');
const require_Dialog_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Dialog/DialogContentImpl.vue?vue&type=script&setup=true&lang.ts
var DialogContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DialogContentImpl",
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
		const { forwardRef, currentElement: contentElement } = require_shared_useForwardExpose.useForwardExpose();
		rootContext.titleId ||= require_shared_useId.useId(void 0, "reka-dialog-title");
		rootContext.descriptionId ||= require_shared_useId.useId(void 0, "reka-dialog-description");
		(0, vue.onMounted)(() => {
			rootContext.contentElement = contentElement;
			if (require_shared_getActiveElement.getActiveElement() !== document.body) rootContext.triggerElement.value = require_shared_getActiveElement.getActiveElement();
		});
		if (process.env.NODE_ENV !== "production") require_Dialog_utils.useWarning({
			titleName: "DialogTitle",
			contentName: "DialogContent",
			componentLink: "dialog.html#title",
			titleId: rootContext.titleId,
			descriptionId: rootContext.descriptionId,
			contentElement
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_FocusScope_FocusScope.FocusScope_default), {
				"as-child": "",
				loop: "",
				trapped: props.trapFocus,
				onMountAutoFocus: _cache[5] || (_cache[5] = ($event) => emits("openAutoFocus", $event)),
				onUnmountAutoFocus: _cache[6] || (_cache[6] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), (0, vue.mergeProps)({
					id: (0, vue.unref)(rootContext).contentId,
					ref: (0, vue.unref)(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
					role: "dialog",
					"aria-describedby": (0, vue.unref)(rootContext).descriptionId,
					"aria-labelledby": (0, vue.unref)(rootContext).titleId,
					"data-state": (0, vue.unref)(require_Menu_utils.getOpenState)((0, vue.unref)(rootContext).open.value)
				}, _ctx.$attrs, {
					onDismiss: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).onOpenChange(false)),
					onEscapeKeyDown: _cache[1] || (_cache[1] = ($event) => emits("escapeKeyDown", $event)),
					onFocusOutside: _cache[2] || (_cache[2] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[3] || (_cache[3] = ($event) => emits("interactOutside", $event)),
					onPointerDownOutside: _cache[4] || (_cache[4] = ($event) => emits("pointerDownOutside", $event))
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"as",
					"as-child",
					"disable-outside-pointer-events",
					"aria-describedby",
					"aria-labelledby",
					"data-state"
				])]),
				_: 3
			}, 8, ["trapped"]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogContentImpl.vue
var DialogContentImpl_default = DialogContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DialogContentImpl_default', {
  enumerable: true,
  get: function () {
    return DialogContentImpl_default;
  }
});
//# sourceMappingURL=DialogContentImpl.cjs.map