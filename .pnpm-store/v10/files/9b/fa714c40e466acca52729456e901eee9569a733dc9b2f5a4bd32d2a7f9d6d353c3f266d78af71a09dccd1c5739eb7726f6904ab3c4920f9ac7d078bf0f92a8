import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useSize } from "../shared/useSize.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectPopperRootContext } from "./PopperRoot.js";
import { getSideAndAlignFromPlacement, isNotNull, transformOrigin } from "./utils.js";
import { computed, createElementBlock, createVNode, defineComponent, mergeDefaults, mergeProps, normalizeStyle, openBlock, ref, renderSlot, unref, watchEffect, watchPostEffect, withCtx } from "vue";
import { computedEager } from "@vueuse/core";
import { arrow, autoUpdate, flip, hide, limitShift, offset, shift, size, useFloating } from "@floating-ui/vue";

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
const [injectPopperContentContext, providePopperContentContext] = createContext("PopperContent");
var PopperContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "PopperContent",
	props: /* @__PURE__ */ mergeDefaults({
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
		const rootContext = injectPopperRootContext();
		const { forwardRef, currentElement: contentElement } = useForwardExpose();
		const floatingRef = ref();
		const arrow$1 = ref();
		const { width: arrowWidth, height: arrowHeight } = useSize(arrow$1);
		const desiredPlacement = computed(() => props.side + (props.align !== "center" ? `-${props.align}` : ""));
		const collisionPadding = computed(() => {
			return typeof props.collisionPadding === "number" ? props.collisionPadding : {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				...props.collisionPadding
			};
		});
		const boundary = computed(() => {
			return Array.isArray(props.collisionBoundary) ? props.collisionBoundary : [props.collisionBoundary];
		});
		const detectOverflowOptions = computed(() => {
			return {
				padding: collisionPadding.value,
				boundary: boundary.value.filter(isNotNull),
				altBoundary: boundary.value.length > 0
			};
		});
		const flipOptions = computed(() => {
			return {
				mainAxis: props.sideFlip,
				crossAxis: props.alignFlip
			};
		});
		const computedMiddleware = computedEager(() => {
			return [
				offset({
					mainAxis: props.sideOffset + arrowHeight.value,
					alignmentAxis: props.alignOffset
				}),
				props.prioritizePosition && props.avoidCollisions && flip({
					...detectOverflowOptions.value,
					...flipOptions.value
				}),
				props.avoidCollisions && shift({
					mainAxis: true,
					crossAxis: !!props.prioritizePosition,
					limiter: props.sticky === "partial" ? limitShift() : void 0,
					...detectOverflowOptions.value
				}),
				!props.prioritizePosition && props.avoidCollisions && flip({
					...detectOverflowOptions.value,
					...flipOptions.value
				}),
				size({
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
				arrow$1.value && arrow({
					element: arrow$1.value,
					padding: props.arrowPadding
				}),
				transformOrigin({
					arrowWidth: arrowWidth.value,
					arrowHeight: arrowHeight.value
				}),
				props.hideWhenDetached && hide({
					strategy: "referenceHidden",
					...detectOverflowOptions.value
				})
			];
		});
		const reference = computed(() => props.reference ?? rootContext.anchor.value);
		const { floatingStyles, placement, isPositioned, middlewareData, update } = useFloating(reference, floatingRef, {
			strategy: props.positionStrategy,
			placement: desiredPlacement,
			whileElementsMounted: (...args) => {
				const cleanup = autoUpdate(...args, {
					layoutShift: !props.disableUpdateOnLayoutShift,
					animationFrame: props.updatePositionStrategy === "always"
				});
				return cleanup;
			},
			middleware: computedMiddleware
		});
		const placedSide = computed(() => getSideAndAlignFromPlacement(placement.value)[0]);
		const placedAlign = computed(() => getSideAndAlignFromPlacement(placement.value)[1]);
		watchPostEffect(() => {
			if (isPositioned.value) emits("placed");
		});
		const cannotCenterArrow = computed(() => middlewareData.value.arrow?.centerOffset !== 0);
		const contentZIndex = ref("");
		watchEffect(() => {
			if (contentElement.value) contentZIndex.value = window.getComputedStyle(contentElement.value).zIndex;
		});
		const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0);
		const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0);
		providePopperContentContext({
			placedSide,
			onArrowChange: (element) => arrow$1.value = element,
			arrowX,
			arrowY,
			shouldHideArrow: cannotCenterArrow
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "floatingRef",
				ref: floatingRef,
				"data-reka-popper-content-wrapper": "",
				style: normalizeStyle({
					...unref(floatingStyles),
					transform: unref(isPositioned) ? unref(floatingStyles).transform : "translate(0, -200%)",
					minWidth: "max-content",
					zIndex: contentZIndex.value,
					["--reka-popper-transform-origin"]: [unref(middlewareData).transformOrigin?.x, unref(middlewareData).transformOrigin?.y].join(" "),
					...unref(middlewareData).hide?.referenceHidden && {
						visibility: "hidden",
						pointerEvents: "none"
					}
				})
			}, [createVNode(unref(Primitive), mergeProps({ ref: unref(forwardRef) }, _ctx.$attrs, {
				"as-child": props.asChild,
				as: _ctx.as,
				"data-side": placedSide.value,
				"data-align": placedAlign.value,
				style: { animation: !unref(isPositioned) ? "none" : void 0 }
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { PopperContentPropsDefaultValue, PopperContent_default, injectPopperContentContext };
//# sourceMappingURL=PopperContent.js.map