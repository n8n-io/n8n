import { useForwardExpose } from "../shared/useForwardExpose.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { getThumbSize } from "./utils.js";
import { ScrollAreaScrollbarImpl_default } from "./ScrollAreaScrollbarImpl.js";
import { injectScrollAreaScrollbarVisibleContext } from "./ScrollAreaScrollbarVisible.js";
import { computed, createBlock, defineComponent, normalizeStyle, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaScrollbarY.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarY_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ScrollAreaScrollbarY",
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const scrollbarVisibleContext = injectScrollAreaScrollbarVisibleContext();
		const { forwardRef, currentElement: scrollbarElement } = useForwardExpose();
		onMounted(() => {
			if (scrollbarElement.value) rootContext.onScrollbarYChange(scrollbarElement.value);
		});
		const sizes = computed(() => scrollbarVisibleContext.sizes.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ScrollAreaScrollbarImpl_default, {
				ref: unref(forwardRef),
				"is-horizontal": false,
				"data-orientation": "vertical",
				style: normalizeStyle({
					top: 0,
					right: unref(rootContext).dir.value === "ltr" ? 0 : void 0,
					left: unref(rootContext).dir.value === "rtl" ? 0 : void 0,
					bottom: "var(--reka-scroll-area-corner-height)",
					["--reka-scroll-area-thumb-height"]: sizes.value ? `${unref(getThumbSize)(sizes.value)}px` : void 0
				}),
				onOnDragScroll: _cache[0] || (_cache[0] = ($event) => unref(scrollbarVisibleContext).onDragScroll($event.y))
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["style"]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarY.vue
var ScrollAreaScrollbarY_default = ScrollAreaScrollbarY_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbarY_default };
//# sourceMappingURL=ScrollAreaScrollbarY.js.map