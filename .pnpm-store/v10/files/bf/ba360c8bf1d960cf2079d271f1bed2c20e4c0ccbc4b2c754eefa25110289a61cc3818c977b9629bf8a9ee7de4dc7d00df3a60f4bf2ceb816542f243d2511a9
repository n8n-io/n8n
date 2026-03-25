import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { addUnlinkedScrollListener } from "./utils.js";
import { injectScrollAreaScrollbarVisibleContext } from "./ScrollAreaScrollbarVisible.js";
import { computed, createBlock, defineComponent, onUnmounted, openBlock, ref, renderSlot, unref, withCtx } from "vue";
import { watchOnce } from "@vueuse/core";

//#region src/ScrollArea/ScrollAreaThumb.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ScrollAreaThumb",
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
	setup(__props) {
		const props = __props;
		const rootContext = injectScrollAreaRootContext();
		const scrollbarContextVisible = injectScrollAreaScrollbarVisibleContext();
		function handlePointerDown(event) {
			const thumb = event.target;
			const thumbRect = thumb.getBoundingClientRect();
			const x = event.clientX - thumbRect.left;
			const y = event.clientY - thumbRect.top;
			scrollbarContextVisible.handleThumbDown(event, {
				x,
				y
			});
		}
		function handlePointerUp(event) {
			scrollbarContextVisible.handleThumbUp(event);
		}
		const { forwardRef, currentElement: thumbElement } = useForwardExpose();
		const removeUnlinkedScrollListenerRef = ref();
		const viewport = computed(() => rootContext.viewport.value);
		function handleScroll() {
			if (!removeUnlinkedScrollListenerRef.value) {
				const listener = addUnlinkedScrollListener(viewport.value, scrollbarContextVisible.onThumbPositionChange);
				removeUnlinkedScrollListenerRef.value = listener;
				scrollbarContextVisible.onThumbPositionChange();
			}
		}
		const sizes = computed(() => scrollbarContextVisible.sizes.value);
		watchOnce(sizes, () => {
			scrollbarContextVisible.onThumbChange(thumbElement.value);
			if (viewport.value) {
				/**
				* We only bind to native scroll event so we know when scroll starts and ends.
				* When scroll starts we start a requestAnimationFrame loop that checks for
				* changes to scroll position. That rAF loop triggers our thumb position change
				* when relevant to avoid scroll-linked effects. We cancel the loop when scroll ends.
				* https://developer.mozilla.org/en-US/docs/Mozilla/Performance/Scroll-linked_effects
				*/
				scrollbarContextVisible.onThumbPositionChange();
				viewport.value.addEventListener("scroll", handleScroll);
			}
		});
		onUnmounted(() => {
			viewport.value.removeEventListener("scroll", handleScroll);
			rootContext.viewport.value?.removeEventListener("scroll", handleScroll);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				"data-state": unref(scrollbarContextVisible).hasThumb ? "visible" : "hidden",
				style: {
					width: "var(--reka-scroll-area-thumb-width)",
					height: "var(--reka-scroll-area-thumb-height)"
				},
				"as-child": props.asChild,
				as: _ctx.as,
				onPointerdown: handlePointerDown,
				onPointerup: handlePointerUp
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"data-state",
				"as-child",
				"as"
			]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaThumb.vue
var ScrollAreaThumb_default = ScrollAreaThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaThumb_default };
//# sourceMappingURL=ScrollAreaThumb.js.map