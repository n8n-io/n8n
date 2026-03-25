import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Presence_default } from "../Presence/Presence.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { ScrollAreaScrollbarAuto_default } from "./ScrollAreaScrollbarAuto.js";
import { createBlock, createVNode, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaScrollbarHover.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarHover_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ScrollAreaScrollbarHover",
	props: { forceMount: {
		type: Boolean,
		required: false
	} },
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const { forwardRef } = useForwardExpose();
		let timeout;
		const visible = ref(false);
		function handlePointerEnter() {
			window.clearTimeout(timeout);
			visible.value = true;
		}
		function handlePointerLeave() {
			timeout = window.setTimeout(() => {
				visible.value = false;
			}, rootContext.scrollHideDelay.value);
		}
		onMounted(() => {
			const scrollArea = rootContext.scrollArea.value;
			if (scrollArea) {
				scrollArea.addEventListener("pointerenter", handlePointerEnter);
				scrollArea.addEventListener("pointerleave", handlePointerLeave);
			}
		});
		onUnmounted(() => {
			const scrollArea = rootContext.scrollArea.value;
			if (scrollArea) {
				window.clearTimeout(timeout);
				scrollArea.removeEventListener("pointerenter", handlePointerEnter);
				scrollArea.removeEventListener("pointerleave", handlePointerLeave);
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || visible.value }, {
				default: withCtx(() => [createVNode(ScrollAreaScrollbarAuto_default, mergeProps(_ctx.$attrs, {
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
//#region src/ScrollArea/ScrollAreaScrollbarHover.vue
var ScrollAreaScrollbarHover_default = ScrollAreaScrollbarHover_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbarHover_default };
//# sourceMappingURL=ScrollAreaScrollbarHover.js.map