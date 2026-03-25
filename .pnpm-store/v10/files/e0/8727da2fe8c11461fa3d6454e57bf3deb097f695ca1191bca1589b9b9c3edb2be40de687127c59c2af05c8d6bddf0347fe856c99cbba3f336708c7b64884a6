import { useForwardExpose } from "../shared/useForwardExpose.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { getThumbSize } from "./utils.js";
import { ScrollAreaScrollbarImpl_default } from "./ScrollAreaScrollbarImpl.js";
import { injectScrollAreaScrollbarVisibleContext } from "./ScrollAreaScrollbarVisible.js";
import { computed, createBlock, defineComponent, normalizeStyle, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaScrollbarX.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarX_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ScrollAreaScrollbarX",
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const scrollbarVisibleContext = injectScrollAreaScrollbarVisibleContext();
		const { forwardRef, currentElement: scrollbarElement } = useForwardExpose();
		onMounted(() => {
			if (scrollbarElement.value) rootContext.onScrollbarXChange(scrollbarElement.value);
		});
		const sizes = computed(() => scrollbarVisibleContext.sizes.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ScrollAreaScrollbarImpl_default, {
				ref: unref(forwardRef),
				"is-horizontal": true,
				"data-orientation": "horizontal",
				style: normalizeStyle({
					bottom: 0,
					left: unref(rootContext).dir.value === "rtl" ? "var(--reka-scroll-area-corner-width)" : 0,
					right: unref(rootContext).dir.value === "ltr" ? "var(--reka-scroll-area-corner-width)" : 0,
					["--reka-scroll-area-thumb-width"]: sizes.value ? `${unref(getThumbSize)(sizes.value)}px` : void 0
				}),
				onOnDragScroll: _cache[0] || (_cache[0] = ($event) => unref(scrollbarVisibleContext).onDragScroll($event.x))
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["style"]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarX.vue
var ScrollAreaScrollbarX_default = ScrollAreaScrollbarX_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbarX_default };
//# sourceMappingURL=ScrollAreaScrollbarX.js.map