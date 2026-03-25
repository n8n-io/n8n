import { clamp } from "../shared/clamp.js";
import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { CONTENT_MARGIN } from "./utils.js";
import { injectSelectRootContext } from "./SelectRoot.js";
import { injectSelectContentContext } from "./SelectContentImpl.js";
import { createElementBlock, createVNode, defineComponent, mergeProps, nextTick, normalizeStyle, onMounted, openBlock, ref, renderSlot, unref, withCtx } from "vue";
import { useResizeObserver } from "@vueuse/core";

//#region src/Select/SelectItemAlignedPosition.vue?vue&type=script&setup=true&lang.ts
const [injectSelectItemAlignedPositionContext, provideSelectItemAlignedPositionContext] = createContext("SelectItemAlignedPosition");
var SelectItemAlignedPosition_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "SelectItemAlignedPosition",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: ["placed"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { getItems } = useCollection();
		const rootContext = injectSelectRootContext();
		const contentContext = injectSelectContentContext();
		const shouldExpandOnScrollRef = ref(false);
		const shouldRepositionRef = ref(true);
		const contentWrapperElement = ref();
		const { forwardRef, currentElement: contentElement } = useForwardExpose();
		const { viewport, selectedItem, selectedItemText, focusSelectedItem } = contentContext;
		function position() {
			if (rootContext.triggerElement.value && rootContext.valueElement.value && contentWrapperElement.value && contentElement.value && viewport?.value && selectedItem?.value && selectedItemText?.value) {
				const triggerRect = rootContext.triggerElement.value.getBoundingClientRect();
				const contentRect = contentElement.value.getBoundingClientRect();
				const valueNodeRect = rootContext.valueElement.value.getBoundingClientRect();
				const itemTextRect = selectedItemText.value.getBoundingClientRect();
				if (rootContext.dir.value !== "rtl") {
					const itemTextOffset = itemTextRect.left - contentRect.left;
					const left = valueNodeRect.left - itemTextOffset;
					const leftDelta = triggerRect.left - left;
					const minContentWidth = triggerRect.width + leftDelta;
					const contentWidth = Math.max(minContentWidth, contentRect.width);
					const rightEdge = window.innerWidth - CONTENT_MARGIN;
					const clampedLeft = clamp(left, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, rightEdge - contentWidth));
					contentWrapperElement.value.style.minWidth = `${minContentWidth}px`;
					contentWrapperElement.value.style.left = `${clampedLeft}px`;
				} else {
					const itemTextOffset = contentRect.right - itemTextRect.right;
					const right = window.innerWidth - valueNodeRect.right - itemTextOffset;
					const rightDelta = window.innerWidth - triggerRect.right - right;
					const minContentWidth = triggerRect.width + rightDelta;
					const contentWidth = Math.max(minContentWidth, contentRect.width);
					const leftEdge = window.innerWidth - CONTENT_MARGIN;
					const clampedRight = clamp(right, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, leftEdge - contentWidth));
					contentWrapperElement.value.style.minWidth = `${minContentWidth}px`;
					contentWrapperElement.value.style.right = `${clampedRight}px`;
				}
				const items = getItems().map((i) => i.ref);
				const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
				const itemsHeight = viewport.value.scrollHeight;
				const contentStyles = window.getComputedStyle(contentElement.value);
				const contentBorderTopWidth = Number.parseInt(contentStyles.borderTopWidth, 10);
				const contentPaddingTop = Number.parseInt(contentStyles.paddingTop, 10);
				const contentBorderBottomWidth = Number.parseInt(contentStyles.borderBottomWidth, 10);
				const contentPaddingBottom = Number.parseInt(contentStyles.paddingBottom, 10);
				const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth;
				const minContentHeight = Math.min(selectedItem.value.offsetHeight * 5, fullContentHeight);
				const viewportStyles = window.getComputedStyle(viewport.value);
				const viewportPaddingTop = Number.parseInt(viewportStyles.paddingTop, 10);
				const viewportPaddingBottom = Number.parseInt(viewportStyles.paddingBottom, 10);
				const topEdgeToTriggerMiddle = triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN;
				const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle;
				const selectedItemHalfHeight = selectedItem.value.offsetHeight / 2;
				const itemOffsetMiddle = selectedItem.value.offsetTop + selectedItemHalfHeight;
				const contentTopToItemMiddle = contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle;
				const itemMiddleToContentBottom = fullContentHeight - contentTopToItemMiddle;
				const willAlignWithoutTopOverflow = contentTopToItemMiddle <= topEdgeToTriggerMiddle;
				if (willAlignWithoutTopOverflow) {
					const isLastItem = selectedItem.value === items[items.length - 1];
					contentWrapperElement.value.style.bottom = `0px`;
					const viewportOffsetBottom = contentElement.value.clientHeight - viewport.value.offsetTop - viewport.value.offsetHeight;
					const clampedTriggerMiddleToBottomEdge = Math.max(triggerMiddleToBottomEdge, selectedItemHalfHeight + (isLastItem ? viewportPaddingBottom : 0) + viewportOffsetBottom + contentBorderBottomWidth);
					const height = contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge;
					contentWrapperElement.value.style.height = `${height}px`;
				} else {
					const isFirstItem = selectedItem.value === items[0];
					contentWrapperElement.value.style.top = `0px`;
					const clampedTopEdgeToTriggerMiddle = Math.max(topEdgeToTriggerMiddle, contentBorderTopWidth + viewport.value.offsetTop + (isFirstItem ? viewportPaddingTop : 0) + selectedItemHalfHeight);
					const height = clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom;
					contentWrapperElement.value.style.height = `${height}px`;
					viewport.value.scrollTop = contentTopToItemMiddle - topEdgeToTriggerMiddle + viewport.value.offsetTop;
				}
				contentWrapperElement.value.style.margin = `${CONTENT_MARGIN}px 0`;
				contentWrapperElement.value.style.minHeight = `${minContentHeight}px`;
				contentWrapperElement.value.style.maxHeight = `${availableHeight}px`;
				emits("placed");
				requestAnimationFrame(() => shouldExpandOnScrollRef.value = true);
			}
		}
		const contentZIndex = ref("");
		onMounted(async () => {
			await nextTick();
			position();
			if (contentElement.value) contentZIndex.value = window.getComputedStyle(contentElement.value).zIndex;
		});
		function handleScrollButtonChange(node) {
			if (node && shouldRepositionRef.value === true) {
				position();
				focusSelectedItem?.();
				shouldRepositionRef.value = false;
			}
		}
		useResizeObserver(rootContext.triggerElement, () => {
			position();
		});
		provideSelectItemAlignedPositionContext({
			contentWrapper: contentWrapperElement,
			shouldExpandOnScrollRef,
			onScrollButtonChange: handleScrollButtonChange
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "contentWrapperElement",
				ref: contentWrapperElement,
				style: normalizeStyle({
					display: "flex",
					flexDirection: "column",
					position: "fixed",
					zIndex: contentZIndex.value
				})
			}, [createVNode(unref(Primitive), mergeProps({
				ref: unref(forwardRef),
				style: {
					boxSizing: "border-box",
					maxHeight: "100%"
				}
			}, {
				..._ctx.$attrs,
				...props
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16)], 4);
		};
	}
});

//#endregion
//#region src/Select/SelectItemAlignedPosition.vue
var SelectItemAlignedPosition_default = SelectItemAlignedPosition_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectItemAlignedPosition_default, injectSelectItemAlignedPositionContext };
//# sourceMappingURL=SelectItemAlignedPosition.js.map