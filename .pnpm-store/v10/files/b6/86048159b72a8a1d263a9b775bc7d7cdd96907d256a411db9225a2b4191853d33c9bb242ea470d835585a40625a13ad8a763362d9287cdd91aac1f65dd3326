const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useSize = require('../shared/useSize.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Popper_PopperRoot = require('./PopperRoot.cjs');
const require_Popper_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __floating_ui_vue = require_rolldown_runtime.__toESM(require("@floating-ui/vue"));

//#region src/Popper/PopperContent.vue?vue&type=script&setup=true&lang.ts
const PopperContentPropsDefaultValue = {
	side: "bottom",
	sideOffset: 0,
	sideFlip: true,
	align: "center",
	alignOffset: 0,
	alignFlip: true,
	arrowPadding: 0,
	avoidCollisions: true,
	collisionBoundary: () => [],
	collisionPadding: 0,
	sticky: "partial",
	hideWhenDetached: false,
	positionStrategy: "fixed",
	updatePositionStrategy: "optimized",
	prioritizePosition: false
};
const [injectPopperContentContext, providePopperContentContext] = require_shared_createContext.createContext("PopperContent");
var PopperContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "PopperContent",
	props: /* @__PURE__ */ (0, vue.mergeDefaults)({
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
		}
	}, { ...PopperContentPropsDefaultValue }),
	emits: ["placed"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Popper_PopperRoot.injectPopperRootContext();
		const { forwardRef, currentElement: contentElement } = require_shared_useForwardExpose.useForwardExpose();
		const floatingRef = (0, vue.ref)();
		const arrow = (0, vue.ref)();
		const { width: arrowWidth, height: arrowHeight } = require_shared_useSize.useSize(arrow);
		const desiredPlacement = (0, vue.computed)(() => props.side + (props.align !== "center" ? `-${props.align}` : ""));
		const collisionPadding = (0, vue.computed)(() => {
			return typeof props.collisionPadding === "number" ? props.collisionPadding : {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				...props.collisionPadding
			};
		});
		const boundary = (0, vue.computed)(() => {
			return Array.isArray(props.collisionBoundary) ? props.collisionBoundary : [props.collisionBoundary];
		});
		const detectOverflowOptions = (0, vue.computed)(() => {
			return {
				padding: collisionPadding.value,
				boundary: boundary.value.filter(require_Popper_utils.isNotNull),
				altBoundary: boundary.value.length > 0
			};
		});
		const flipOptions = (0, vue.computed)(() => {
			return {
				mainAxis: props.sideFlip,
				crossAxis: props.alignFlip
			};
		});
		const computedMiddleware = (0, __vueuse_core.computedEager)(() => {
			return [
				(0, __floating_ui_vue.offset)({
					mainAxis: props.sideOffset + arrowHeight.value,
					alignmentAxis: props.alignOffset
				}),
				props.prioritizePosition && props.avoidCollisions && (0, __floating_ui_vue.flip)({
					...detectOverflowOptions.value,
					...flipOptions.value
				}),
				props.avoidCollisions && (0, __floating_ui_vue.shift)({
					mainAxis: true,
					crossAxis: !!props.prioritizePosition,
					limiter: props.sticky === "partial" ? (0, __floating_ui_vue.limitShift)() : void 0,
					...detectOverflowOptions.value
				}),
				!props.prioritizePosition && props.avoidCollisions && (0, __floating_ui_vue.flip)({
					...detectOverflowOptions.value,
					...flipOptions.value
				}),
				(0, __floating_ui_vue.size)({
					...detectOverflowOptions.value,
					apply: ({ elements, rects, availableWidth, availableHeight }) => {
						const { width: anchorWidth, height: anchorHeight } = rects.reference;
						const contentStyle = elements.floating.style;
						contentStyle.setProperty("--reka-popper-available-width", `${availableWidth}px`);
						contentStyle.setProperty("--reka-popper-available-height", `${availableHeight}px`);
						contentStyle.setProperty("--reka-popper-anchor-width", `${anchorWidth}px`);
						contentStyle.setProperty("--reka-popper-anchor-height", `${anchorHeight}px`);
					}
				}),
				arrow.value && (0, __floating_ui_vue.arrow)({
					element: arrow.value,
					padding: props.arrowPadding
				}),
				require_Popper_utils.transformOrigin({
					arrowWidth: arrowWidth.value,
					arrowHeight: arrowHeight.value
				}),
				props.hideWhenDetached && (0, __floating_ui_vue.hide)({
					strategy: "referenceHidden",
					...detectOverflowOptions.value
				})
			];
		});
		const reference = (0, vue.computed)(() => props.reference ?? rootContext.anchor.value);
		const { floatingStyles, placement, isPositioned, middlewareData, update } = (0, __floating_ui_vue.useFloating)(reference, floatingRef, {
			strategy: props.positionStrategy,
			placement: desiredPlacement,
			whileElementsMounted: (...args) => {
				const cleanup = (0, __floating_ui_vue.autoUpdate)(...args, {
					layoutShift: !props.disableUpdateOnLayoutShift,
					animationFrame: props.updatePositionStrategy === "always"
				});
				return cleanup;
			},
			middleware: computedMiddleware
		});
		const placedSide = (0, vue.computed)(() => require_Popper_utils.getSideAndAlignFromPlacement(placement.value)[0]);
		const placedAlign = (0, vue.computed)(() => require_Popper_utils.getSideAndAlignFromPlacement(placement.value)[1]);
		(0, vue.watchPostEffect)(() => {
			if (isPositioned.value) emits("placed");
		});
		const cannotCenterArrow = (0, vue.computed)(() => middlewareData.value.arrow?.centerOffset !== 0);
		const contentZIndex = (0, vue.ref)("");
		(0, vue.watchEffect)(() => {
			if (contentElement.value) contentZIndex.value = window.getComputedStyle(contentElement.value).zIndex;
		});
		const arrowX = (0, vue.computed)(() => middlewareData.value.arrow?.x ?? 0);
		const arrowY = (0, vue.computed)(() => middlewareData.value.arrow?.y ?? 0);
		providePopperContentContext({
			placedSide,
			onArrowChange: (element) => arrow.value = element,
			arrowX,
			arrowY,
			shouldHideArrow: cannotCenterArrow
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", {
				ref_key: "floatingRef",
				ref: floatingRef,
				"data-reka-popper-content-wrapper": "",
				style: (0, vue.normalizeStyle)({
					...(0, vue.unref)(floatingStyles),
					transform: (0, vue.unref)(isPositioned) ? (0, vue.unref)(floatingStyles).transform : "translate(0, -200%)",
					minWidth: "max-content",
					zIndex: contentZIndex.value,
					["--reka-popper-transform-origin"]: [(0, vue.unref)(middlewareData).transformOrigin?.x, (0, vue.unref)(middlewareData).transformOrigin?.y].join(" "),
					...(0, vue.unref)(middlewareData).hide?.referenceHidden && {
						visibility: "hidden",
						pointerEvents: "none"
					}
				})
			}, [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({ ref: (0, vue.unref)(forwardRef) }, _ctx.$attrs, {
				"as-child": props.asChild,
				as: _ctx.as,
				"data-side": placedSide.value,
				"data-align": placedAlign.value,
				style: { animation: !(0, vue.unref)(isPositioned) ? "none" : void 0 }
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as-child",
				"as",
				"data-side",
				"data-align",
				"style"
			])], 4);
		};
	}
});

//#endregion
//#region src/Popper/PopperContent.vue
var PopperContent_default = PopperContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopperContentPropsDefaultValue', {
  enumerable: true,
  get: function () {
    return PopperContentPropsDefaultValue;
  }
});
Object.defineProperty(exports, 'PopperContent_default', {
  enumerable: true,
  get: function () {
    return PopperContent_default;
  }
});
Object.defineProperty(exports, 'injectPopperContentContext', {
  enumerable: true,
  get: function () {
    return injectPopperContentContext;
  }
});
//# sourceMappingURL=PopperContent.cjs.map