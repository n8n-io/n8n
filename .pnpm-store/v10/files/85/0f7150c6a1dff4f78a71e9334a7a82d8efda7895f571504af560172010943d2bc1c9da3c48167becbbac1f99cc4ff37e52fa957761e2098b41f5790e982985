import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useStateMachine } from "../shared/useStateMachine.js";
import { Presence_default } from "../Presence/Presence.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { ScrollAreaScrollbarAuto_default } from "./ScrollAreaScrollbarAuto.js";
import { injectScrollAreaScrollbarContext } from "./ScrollAreaScrollbar.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, renderSlot, unref, watchEffect, withCtx } from "vue";
import { useDebounceFn } from "@vueuse/core";

//#region src/ScrollArea/ScrollAreaScrollbarGlimpse.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarGlimpse_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ScrollAreaScrollbarGlimpse",
	props: { forceMount: {
		type: Boolean,
		required: false
	} },
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const scrollbarContext = injectScrollAreaScrollbarContext();
		const { forwardRef } = useForwardExpose();
		const { state, dispatch } = useStateMachine("hidden", {
			hidden: {
				POINTER_ENTER: "glimpse",
				SCROLL: "scrolling"
			},
			glimpse: {
				HIDE: "hidden",
				POINTER_LEAVE: "hidden",
				SCROLL: "scrolling",
				POINTER_ENTER: "glimpse"
			},
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
		function handlePointerEnter() {
			dispatch("POINTER_ENTER");
		}
		function handlePointerLeave() {
			dispatch("POINTER_LEAVE");
		}
		const debounceScrollEnd = useDebounceFn(() => dispatch("SCROLL_END"), 100);
		watchEffect((onCleanup) => {
			if (state.value === "glimpse") {
				const timeId = window.setTimeout(() => dispatch("HIDE"), rootContext.scrollHideDelay.value);
				onCleanup(() => {
					window.clearTimeout(timeId);
				});
			}
		});
		watchEffect((onCleanup) => {
			if (state.value === "idle") {
				const timeId = window.setTimeout(() => dispatch("HIDE"), rootContext.scrollHideDelay.value);
				onCleanup(() => {
					window.clearTimeout(timeId);
				});
			}
		});
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
//#region src/ScrollArea/ScrollAreaScrollbarGlimpse.vue
var ScrollAreaScrollbarGlimpse_default = ScrollAreaScrollbarGlimpse_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbarGlimpse_default };
//# sourceMappingURL=ScrollAreaScrollbarGlimpse.js.map