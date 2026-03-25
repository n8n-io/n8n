const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useFocusGuards = require('../shared/useFocusGuards.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardProps = require('../shared/useForwardProps.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_FocusScope_FocusScope = require('../FocusScope/FocusScope.cjs');
const require_Popper_PopperContent = require('../Popper/PopperContent.cjs');
const require_Popover_PopoverRoot = require('./PopoverRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Popover/PopoverContentImpl.vue?vue&type=script&setup=true&lang.ts
var PopoverContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PopoverContentImpl",
	props: {
		trapFocus: {
			type: Boolean,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
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
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
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
		const forwarded = require_shared_useForwardProps.useForwardProps((0, __vueuse_shared.reactiveOmit)(props, "trapFocus", "disableOutsidePointerEvents"));
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Popover_PopoverRoot.injectPopoverRootContext();
		require_shared_useFocusGuards.useFocusGuards();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_FocusScope_FocusScope.FocusScope_default), {
				"as-child": "",
				loop: "",
				trapped: _ctx.trapFocus,
				onMountAutoFocus: _cache[5] || (_cache[5] = ($event) => emits("openAutoFocus", $event)),
				onUnmountAutoFocus: _cache[6] || (_cache[6] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), {
					"as-child": "",
					"disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
					onPointerDownOutside: _cache[0] || (_cache[0] = ($event) => emits("pointerDownOutside", $event)),
					onInteractOutside: _cache[1] || (_cache[1] = ($event) => emits("interactOutside", $event)),
					onEscapeKeyDown: _cache[2] || (_cache[2] = ($event) => emits("escapeKeyDown", $event)),
					onFocusOutside: _cache[3] || (_cache[3] = ($event) => emits("focusOutside", $event)),
					onDismiss: _cache[4] || (_cache[4] = ($event) => (0, vue.unref)(rootContext).onOpenChange(false))
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Popper_PopperContent.PopperContent_default), (0, vue.mergeProps)((0, vue.unref)(forwarded), {
						id: (0, vue.unref)(rootContext).contentId,
						ref: (0, vue.unref)(forwardRef),
						"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
						"aria-labelledby": (0, vue.unref)(rootContext).triggerId,
						style: {
							"--reka-popover-content-transform-origin": "var(--reka-popper-transform-origin)",
							"--reka-popover-content-available-width": "var(--reka-popper-available-width)",
							"--reka-popover-content-available-height": "var(--reka-popper-available-height)",
							"--reka-popover-trigger-width": "var(--reka-popper-anchor-width)",
							"--reka-popover-trigger-height": "var(--reka-popper-anchor-height)"
						},
						role: "dialog"
					}), {
						default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
						_: 3
					}, 16, [
						"id",
						"data-state",
						"aria-labelledby"
					])]),
					_: 3
				}, 8, ["disable-outside-pointer-events"])]),
				_: 3
			}, 8, ["trapped"]);
		};
	}
});

//#endregion
//#region src/Popover/PopoverContentImpl.vue
var PopoverContentImpl_default = PopoverContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopoverContentImpl_default', {
  enumerable: true,
  get: function () {
    return PopoverContentImpl_default;
  }
});
//# sourceMappingURL=PopoverContentImpl.cjs.map