const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const require_Popper_PopperContent = require('../Popper/PopperContent.cjs');
const require_Tooltip_utils = require('./utils.cjs');
const require_Tooltip_TooltipRoot = require('./TooltipRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Tooltip/TooltipContentImpl.vue?vue&type=script&setup=true&lang.ts
var TooltipContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TooltipContentImpl",
	props: {
		ariaLabel: {
			type: String,
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
		side: {
			type: null,
			required: false,
			default: "top"
		},
		sideOffset: {
			type: Number,
			required: false,
			default: 0
		},
		align: {
			type: null,
			required: false,
			default: "center"
		},
		alignOffset: {
			type: Number,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false,
			default: true
		},
		collisionBoundary: {
			type: null,
			required: false,
			default: () => []
		},
		collisionPadding: {
			type: [Number, Object],
			required: false,
			default: 0
		},
		arrowPadding: {
			type: Number,
			required: false,
			default: 0
		},
		sticky: {
			type: String,
			required: false,
			default: "partial"
		},
		hideWhenDetached: {
			type: Boolean,
			required: false,
			default: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		}
	},
	emits: ["escapeKeyDown", "pointerDownOutside"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Tooltip_TooltipRoot.injectTooltipRootContext();
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const slot = (0, vue.useSlots)();
		const defaultSlot = (0, vue.computed)(() => slot.default?.({}));
		const ariaLabel = (0, vue.computed)(() => {
			if (props.ariaLabel) return props.ariaLabel;
			let content = "";
			function recursiveTextSearch(node) {
				if (typeof node.children === "string" && node.type !== vue.Comment) content += node.children;
				else if (Array.isArray(node.children)) node.children.forEach((child) => recursiveTextSearch(child));
			}
			defaultSlot.value?.forEach((node) => recursiveTextSearch(node));
			return content;
		});
		const popperContentProps = (0, vue.computed)(() => {
			const { ariaLabel: _,...restProps } = props;
			return restProps;
		});
		(0, vue.onMounted)(() => {
			(0, __vueuse_core.useEventListener)(window, "scroll", (event) => {
				const target = event.target;
				if (target?.contains(rootContext.trigger.value)) rootContext.onClose();
			});
			(0, __vueuse_core.useEventListener)(window, require_Tooltip_utils.TOOLTIP_OPEN, rootContext.onClose);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), {
				"as-child": "",
				"disable-outside-pointer-events": false,
				onEscapeKeyDown: _cache[0] || (_cache[0] = ($event) => emits("escapeKeyDown", $event)),
				onPointerDownOutside: _cache[1] || (_cache[1] = (event) => {
					if ((0, vue.unref)(rootContext).disableClosingTrigger.value && (0, vue.unref)(rootContext).trigger.value?.contains(event.target)) event.preventDefault();
					emits("pointerDownOutside", event);
				}),
				onFocusOutside: _cache[2] || (_cache[2] = (0, vue.withModifiers)(() => {}, ["prevent"])),
				onDismiss: _cache[3] || (_cache[3] = ($event) => (0, vue.unref)(rootContext).onClose())
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Popper_PopperContent.PopperContent_default), (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					"data-state": (0, vue.unref)(rootContext).stateAttribute.value
				}, {
					..._ctx.$attrs,
					...popperContentProps.value
				}, { style: {
					"--reka-tooltip-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-tooltip-content-available-width": "var(--reka-popper-available-width)",
					"--reka-tooltip-content-available-height": "var(--reka-popper-available-height)",
					"--reka-tooltip-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-tooltip-trigger-height": "var(--reka-popper-anchor-height)"
				} }), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default"), (0, vue.createVNode)((0, vue.unref)(require_VisuallyHidden_VisuallyHidden.VisuallyHidden_default), {
						id: (0, vue.unref)(rootContext).contentId,
						role: "tooltip"
					}, {
						default: (0, vue.withCtx)(() => [(0, vue.createTextVNode)((0, vue.toDisplayString)(ariaLabel.value), 1)]),
						_: 1
					}, 8, ["id"])]),
					_: 3
				}, 16, ["data-state"])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipContentImpl.vue
var TooltipContentImpl_default = TooltipContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TooltipContentImpl_default', {
  enumerable: true,
  get: function () {
    return TooltipContentImpl_default;
  }
});
//# sourceMappingURL=TooltipContentImpl.cjs.map