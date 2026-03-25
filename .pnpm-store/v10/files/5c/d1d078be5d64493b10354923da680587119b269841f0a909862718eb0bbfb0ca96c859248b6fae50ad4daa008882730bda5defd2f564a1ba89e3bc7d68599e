const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_utils = require('./utils.cjs');
const require_ScrollArea_ScrollAreaScrollbarVisible = require('./ScrollAreaScrollbarVisible.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ScrollArea/ScrollAreaThumb.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const scrollbarContextVisible = require_ScrollArea_ScrollAreaScrollbarVisible.injectScrollAreaScrollbarVisibleContext();
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
		const { forwardRef, currentElement: thumbElement } = require_shared_useForwardExpose.useForwardExpose();
		const removeUnlinkedScrollListenerRef = (0, vue.ref)();
		const viewport = (0, vue.computed)(() => rootContext.viewport.value);
		function handleScroll() {
			if (!removeUnlinkedScrollListenerRef.value) {
				const listener = require_ScrollArea_utils.addUnlinkedScrollListener(viewport.value, scrollbarContextVisible.onThumbPositionChange);
				removeUnlinkedScrollListenerRef.value = listener;
				scrollbarContextVisible.onThumbPositionChange();
			}
		}
		const sizes = (0, vue.computed)(() => scrollbarContextVisible.sizes.value);
		(0, __vueuse_core.watchOnce)(sizes, () => {
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
		(0, vue.onUnmounted)(() => {
			viewport.value.removeEventListener("scroll", handleScroll);
			rootContext.viewport.value?.removeEventListener("scroll", handleScroll);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				"data-state": (0, vue.unref)(scrollbarContextVisible).hasThumb ? "visible" : "hidden",
				style: {
					width: "var(--reka-scroll-area-thumb-width)",
					height: "var(--reka-scroll-area-thumb-height)"
				},
				"as-child": props.asChild,
				as: _ctx.as,
				onPointerdown: handlePointerDown,
				onPointerup: handlePointerUp
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'ScrollAreaThumb_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaThumb_default;
  }
});
//# sourceMappingURL=ScrollAreaThumb.cjs.map