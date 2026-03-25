const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_clamp = require('../shared/clamp.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Select_utils = require('./utils.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Select/SelectItemAlignedPosition.vue?vue&type=script&setup=true&lang.ts
const [injectSelectItemAlignedPositionContext, provideSelectItemAlignedPositionContext] = require_shared_createContext.createContext("SelectItemAlignedPosition");
var SelectItemAlignedPosition_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { getItems } = require_Collection_Collection.useCollection();
		const rootContext = require_Select_SelectRoot.injectSelectRootContext();
		const contentContext = require_Select_SelectContentImpl.injectSelectContentContext();
		const shouldExpandOnScrollRef = (0, vue.ref)(false);
		const shouldRepositionRef = (0, vue.ref)(true);
		const contentWrapperElement = (0, vue.ref)();
		const { forwardRef, currentElement: contentElement } = require_shared_useForwardExpose.useForwardExpose();
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
					const rightEdge = window.innerWidth - require_Select_utils.CONTENT_MARGIN;
					const clampedLeft = require_shared_clamp.clamp(left, require_Select_utils.CONTENT_MARGIN, Math.max(require_Select_utils.CONTENT_MARGIN, rightEdge - contentWidth));
					contentWrapperElement.value.style.minWidth = `${minContentWidth}px`;
					contentWrapperElement.value.style.left = `${clampedLeft}px`;
				} else {
					const itemTextOffset = contentRect.right - itemTextRect.right;
					const right = window.innerWidth - valueNodeRect.right - itemTextOffset;
					const rightDelta = window.innerWidth - triggerRect.right - right;
					const minContentWidth = triggerRect.width + rightDelta;
					const contentWidth = Math.max(minContentWidth, contentRect.width);
					const leftEdge = window.innerWidth - require_Select_utils.CONTENT_MARGIN;
					const clampedRight = require_shared_clamp.clamp(right, require_Select_utils.CONTENT_MARGIN, Math.max(require_Select_utils.CONTENT_MARGIN, leftEdge - contentWidth));
					contentWrapperElement.value.style.minWidth = `${minContentWidth}px`;
					contentWrapperElement.value.style.right = `${clampedRight}px`;
				}
				const items = getItems().map((i) => i.ref);
				const availableHeight = window.innerHeight - require_Select_utils.CONTENT_MARGIN * 2;
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
				const topEdgeToTriggerMiddle = triggerRect.top + triggerRect.height / 2 - require_Select_utils.CONTENT_MARGIN;
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
				contentWrapperElement.value.style.margin = `${require_Select_utils.CONTENT_MARGIN}px 0`;
				contentWrapperElement.value.style.minHeight = `${minContentHeight}px`;
				contentWrapperElement.value.style.maxHeight = `${availableHeight}px`;
				emits("placed");
				requestAnimationFrame(() => shouldExpandOnScrollRef.value = true);
			}
		}
		const contentZIndex = (0, vue.ref)("");
		(0, vue.onMounted)(async () => {
			await (0, vue.nextTick)();
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
		(0, __vueuse_core.useResizeObserver)(rootContext.triggerElement, () => {
			position();
		});
		provideSelectItemAlignedPositionContext({
			contentWrapper: contentWrapperElement,
			shouldExpandOnScrollRef,
			onScrollButtonChange: handleScrollButtonChange
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", {
				ref_key: "contentWrapperElement",
				ref: contentWrapperElement,
				style: (0, vue.normalizeStyle)({
					display: "flex",
					flexDirection: "column",
					position: "fixed",
					zIndex: contentZIndex.value
				})
			}, [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				ref: (0, vue.unref)(forwardRef),
				style: {
					boxSizing: "border-box",
					maxHeight: "100%"
				}
			}, {
				..._ctx.$attrs,
				...props
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16)], 4);
		};
	}
});

//#endregion
//#region src/Select/SelectItemAlignedPosition.vue
var SelectItemAlignedPosition_default = SelectItemAlignedPosition_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectItemAlignedPosition_default', {
  enumerable: true,
  get: function () {
    return SelectItemAlignedPosition_default;
  }
});
Object.defineProperty(exports, 'injectSelectItemAlignedPositionContext', {
  enumerable: true,
  get: function () {
    return injectSelectItemAlignedPositionContext;
  }
});
//# sourceMappingURL=SelectItemAlignedPosition.cjs.map