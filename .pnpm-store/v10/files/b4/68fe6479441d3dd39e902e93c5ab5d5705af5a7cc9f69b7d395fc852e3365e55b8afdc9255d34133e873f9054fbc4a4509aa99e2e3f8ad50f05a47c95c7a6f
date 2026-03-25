import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Presence_default } from "../Presence/Presence.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { ScrollAreaScrollbarVisible_default } from "./ScrollAreaScrollbarVisible.js";
import { injectScrollAreaScrollbarContext } from "./ScrollAreaScrollbar.js";
import { createBlock, createVNode, defineComponent, mergeProps, onMounted, openBlock, ref, renderSlot, unref, withCtx } from "vue";
import { useDebounceFn, useResizeObserver } from "@vueuse/core";

//#region src/ScrollArea/ScrollAreaScrollbarAuto.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarAuto_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ScrollAreaScrollbarAuto",
	props: { forceMount: {
		type: Boolean,
		required: false
	} },
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const scrollbarContext = injectScrollAreaScrollbarContext();
		const { forwardRef } = useForwardExpose();
		const visible = ref(false);
		const handleResize = useDebounceFn(() => {
			if (rootContext.viewport.value) {
				const isOverflowX = rootContext.viewport.value.offsetWidth < rootContext.viewport.value.scrollWidth;
				const isOverflowY = rootContext.viewport.value.offsetHeight < rootContext.viewport.value.scrollHeight;
				visible.value = scrollbarContext.isHorizontal.value ? isOverflowX : isOverflowY;
			}
		}, 10);
		onMounted(() => handleResize());
		useResizeObserver(rootContext.viewport, handleResize);
		useResizeObserver(rootContext.content, handleResize);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || visible.value }, {
				default: withCtx(() => [createVNode(ScrollAreaScrollbarVisible_default, mergeProps(_ctx.$attrs, {
					ref: unref(forwardRef),
					"data-state": visible.value ? "visible" : "hidden"
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["data-state"])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarAuto.vue
var ScrollAreaScrollbarAuto_default = ScrollAreaScrollbarAuto_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbarAuto_default };
//# sourceMappingURL=ScrollAreaScrollbarAuto.js.map