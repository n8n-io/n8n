const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Popper_PopperAnchor = require('../Popper/PopperAnchor.cjs');
const require_Tooltip_TooltipProvider = require('./TooltipProvider.cjs');
const require_Tooltip_TooltipRoot = require('./TooltipRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Tooltip/TooltipTrigger.vue?vue&type=script&setup=true&lang.ts
var TooltipTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TooltipTrigger",
	props: {
		reference: {
			type: null,
			required: false
		},
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
		const rootContext = require_Tooltip_TooltipRoot.injectTooltipRootContext();
		const providerContext = require_Tooltip_TooltipProvider.injectTooltipProviderContext();
		rootContext.contentId ||= require_shared_useId.useId(void 0, "reka-tooltip-content");
		const { forwardRef, currentElement: triggerElement } = require_shared_useForwardExpose.useForwardExpose();
		const isPointerDown = (0, vue.ref)(false);
		const hasPointerMoveOpened = (0, vue.ref)(false);
		const tooltipListeners = (0, vue.computed)(() => {
			if (rootContext.disabled.value) return {};
			return {
				click: handleClick,
				focus: handleFocus,
				pointermove: handlePointerMove,
				pointerleave: handlePointerLeave,
				pointerdown: handlePointerDown,
				blur: handleBlur
			};
		});
		(0, vue.onMounted)(() => {
			rootContext.onTriggerChange(triggerElement.value);
		});
		function handlePointerUp() {
			setTimeout(() => {
				isPointerDown.value = false;
			}, 1);
		}
		function handlePointerDown() {
			if (rootContext.open && !rootContext.disableClosingTrigger.value) rootContext.onClose();
			isPointerDown.value = true;
			document.addEventListener("pointerup", handlePointerUp, { once: true });
		}
		function handlePointerMove(event) {
			if (event.pointerType === "touch") return;
			if (!hasPointerMoveOpened.value && !providerContext.isPointerInTransitRef.value) {
				rootContext.onTriggerEnter();
				hasPointerMoveOpened.value = true;
			}
		}
		function handlePointerLeave() {
			rootContext.onTriggerLeave();
			hasPointerMoveOpened.value = false;
		}
		function handleFocus(event) {
			if (isPointerDown.value) return;
			if (rootContext.ignoreNonKeyboardFocus.value && !event.target.matches?.(":focus-visible")) return;
			rootContext.onOpen();
		}
		function handleBlur() {
			rootContext.onClose();
		}
		function handleClick() {
			if (!rootContext.disableClosingTrigger.value) rootContext.onClose();
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperAnchor.PopperAnchor_default), {
				"as-child": "",
				reference: _ctx.reference
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					"aria-describedby": (0, vue.unref)(rootContext).open.value ? (0, vue.unref)(rootContext).contentId : void 0,
					"data-state": (0, vue.unref)(rootContext).stateAttribute.value,
					as: _ctx.as,
					"as-child": props.asChild,
					"data-grace-area-trigger": ""
				}, (0, vue.toHandlers)(tooltipListeners.value)), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"aria-describedby",
					"data-state",
					"as",
					"as-child"
				])]),
				_: 3
			}, 8, ["reference"]);
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipTrigger.vue
var TooltipTrigger_default = TooltipTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TooltipTrigger_default', {
  enumerable: true,
  get: function () {
    return TooltipTrigger_default;
  }
});
//# sourceMappingURL=TooltipTrigger.cjs.map