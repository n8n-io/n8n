import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { getScrollPositionFromPointer, getThumbOffsetFromScroll, getThumbRatio, isScrollingWithinScrollbarBounds } from "./utils.js";
import { ScrollAreaScrollbarX_default } from "./ScrollAreaScrollbarX.js";
import { ScrollAreaScrollbarY_default } from "./ScrollAreaScrollbarY.js";
import { injectScrollAreaScrollbarContext } from "./ScrollAreaScrollbar.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaScrollbarVisible.vue?vue&type=script&setup=true&lang.ts
const [injectScrollAreaScrollbarVisibleContext, provideScrollAreaScrollbarVisibleContext] = createContext("ScrollAreaScrollbarVisible");
var ScrollAreaScrollbarVisible_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ScrollAreaScrollbarVisible",
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const scrollbarContext = injectScrollAreaScrollbarContext();
		const { forwardRef } = useForwardExpose();
		const sizes = ref({
			content: 0,
			viewport: 0,
			scrollbar: {
				size: 0,
				paddingStart: 0,
				paddingEnd: 0
			}
		});
		const hasThumb = computed(() => {
			const thumbRatio = getThumbRatio(sizes.value.viewport, sizes.value.content);
			return Boolean(thumbRatio > 0 && thumbRatio < 1);
		});
		const thumbRef = ref();
		const pointerOffset = ref(0);
		function handleWheelScroll(event, payload) {
			if (isShowingScrollbarX.value) {
				const scrollPos = rootContext.viewport.value.scrollLeft + event.deltaY;
				rootContext.viewport.value.scrollLeft = scrollPos;
				if (isScrollingWithinScrollbarBounds(scrollPos, payload)) event.preventDefault();
			} else {
				const scrollPos = rootContext.viewport.value.scrollTop + event.deltaY;
				rootContext.viewport.value.scrollTop = scrollPos;
				if (isScrollingWithinScrollbarBounds(scrollPos, payload)) event.preventDefault();
			}
		}
		function handleThumbDown(event, payload) {
			if (isShowingScrollbarX.value) pointerOffset.value = payload.x;
			else pointerOffset.value = payload.y;
		}
		function handleThumbUp(event) {
			pointerOffset.value = 0;
		}
		function handleSizeChange(payload) {
			sizes.value = payload;
		}
		function getScrollPosition(pointerPos, dir) {
			return getScrollPositionFromPointer(pointerPos, pointerOffset.value, sizes.value, dir);
		}
		const isShowingScrollbarX = computed(() => scrollbarContext.isHorizontal.value);
		function onDragScroll(payload) {
			if (isShowingScrollbarX.value) rootContext.viewport.value.scrollLeft = getScrollPosition(payload, rootContext.dir.value);
			else rootContext.viewport.value.scrollTop = getScrollPosition(payload);
		}
		function onThumbPositionChange() {
			if (isShowingScrollbarX.value) {
				if (rootContext.viewport.value && thumbRef.value) {
					const scrollPos = rootContext.viewport.value.scrollLeft;
					const offset = getThumbOffsetFromScroll(scrollPos, sizes.value, rootContext.dir.value);
					thumbRef.value.style.transform = `translate3d(${offset}px, 0, 0)`;
				}
			} else if (rootContext.viewport.value && thumbRef.value) {
				const scrollPos = rootContext.viewport.value.scrollTop;
				const offset = getThumbOffsetFromScroll(scrollPos, sizes.value);
				thumbRef.value.style.transform = `translate3d(0, ${offset}px, 0)`;
			}
		}
		function onThumbChange(element) {
			thumbRef.value = element;
		}
		provideScrollAreaScrollbarVisibleContext({
			sizes,
			hasThumb,
			handleWheelScroll,
			handleThumbDown,
			handleThumbUp,
			handleSizeChange,
			onThumbPositionChange,
			onThumbChange,
			onDragScroll
		});
		return (_ctx, _cache) => {
			return isShowingScrollbarX.value ? (openBlock(), createBlock(ScrollAreaScrollbarX_default, mergeProps({ key: 0 }, _ctx.$attrs, { ref: unref(forwardRef) }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : (openBlock(), createBlock(ScrollAreaScrollbarY_default, mergeProps({ key: 1 }, _ctx.$attrs, { ref: unref(forwardRef) }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16));
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarVisible.vue
var ScrollAreaScrollbarVisible_default = ScrollAreaScrollbarVisible_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbarVisible_default, injectScrollAreaScrollbarVisibleContext };
//# sourceMappingURL=ScrollAreaScrollbarVisible.js.map