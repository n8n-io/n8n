import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useStateMachine } from "../shared/useStateMachine.js";
import { Presence_default } from "../Presence/Presence.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { ScrollAreaScrollbarVisible_default } from "./ScrollAreaScrollbarVisible.js";
import { injectScrollAreaScrollbarContext } from "./ScrollAreaScrollbar.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, watchEffect, withCtx } from "vue";
import { useDebounceFn } from "@vueuse/core";

//#region src/ScrollArea/ScrollAreaScrollbarScroll.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarScroll_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ScrollAreaScrollbarScroll",
	props: { forceMount: {
		type: Boolean,
		required: false
	} },
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const scrollbarContext = injectScrollAreaScrollbarContext();
		const { forwardRef } = useForwardExpose();
		const { state, dispatch } = useStateMachine("hidden", {
			hidden: { SCROLL: "scrolling" },
			scrolling: {
				SCROLL_END: "idle",
				POINTER_ENTER: "interacting"
			},
			interacting: {
				SCROLL: "interacting",
				POINTER_LEAVE: "idle"
			},
			idle: {
				HIDE: "hidden",
				SCROLL: "scrolling",
				POINTER_ENTER: "interacting"
			}
		});
		const visible = computed(() => state.value !== "hidden");
		watchEffect((onCleanup) => {
			if (state.value === "idle") {
				const timeId = window.setTimeout(() => dispatch("HIDE"), rootContext.scrollHideDelay.value);
				onCleanup(() => {
					window.clearTimeout(timeId);
				});
			}
		});
		const debounceScrollEnd = useDebounceFn(() => dispatch("SCROLL_END"), 100);
		watchEffect((onCleanup) => {
			const viewport = rootContext.viewport.value;
			const scrollDirection = scrollbarContext.isHorizontal.value ? "scrollLeft" : "scrollTop";
			if (viewport) {
				let prevScrollPos = viewport[scrollDirection];
				const handleScroll = () => {
					const scrollPos = viewport[scrollDirection];
					const hasScrollInDirectionChanged = prevScrollPos !== scrollPos;
					if (hasScrollInDirectionChanged) {
						dispatch("SCROLL");
						debounceScrollEnd();
					}
					prevScrollPos = scrollPos;
				};
				viewport.addEventListener("scroll", handleScroll);
				onCleanup(() => {
					viewport.removeEventListener("scroll", handleScroll);
				});
			}
		});
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
//#region src/ScrollArea/ScrollAreaScrollbarScroll.vue
var ScrollAreaScrollbarScroll_default = ScrollAreaScrollbarScroll_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbarScroll_default };
//# sourceMappingURL=ScrollAreaScrollbarScroll.js.map