const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useStateMachine = require('../shared/useStateMachine.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_ScrollAreaScrollbarAuto = require('./ScrollAreaScrollbarAuto.cjs');
const require_ScrollArea_ScrollAreaScrollbar = require('./ScrollAreaScrollbar.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ScrollArea/ScrollAreaScrollbarGlimpse.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarGlimpse_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ScrollAreaScrollbarGlimpse",
	props: { forceMount: {
		type: Boolean,
		required: false
	} },
	setup(__props) {
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const scrollbarContext = require_ScrollArea_ScrollAreaScrollbar.injectScrollAreaScrollbarContext();
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const { state, dispatch } = require_shared_useStateMachine.useStateMachine("hidden", {
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
		const visible = (0, vue.computed)(() => state.value !== "hidden");
		function handlePointerEnter() {
			dispatch("POINTER_ENTER");
		}
		function handlePointerLeave() {
			dispatch("POINTER_LEAVE");
		}
		const debounceScrollEnd = (0, __vueuse_core.useDebounceFn)(() => dispatch("SCROLL_END"), 100);
		(0, vue.watchEffect)((onCleanup) => {
			if (state.value === "glimpse") {
				const timeId = window.setTimeout(() => dispatch("HIDE"), rootContext.scrollHideDelay.value);
				onCleanup(() => {
					window.clearTimeout(timeId);
				});
			}
		});
		(0, vue.watchEffect)((onCleanup) => {
			if (state.value === "idle") {
				const timeId = window.setTimeout(() => dispatch("HIDE"), rootContext.scrollHideDelay.value);
				onCleanup(() => {
					window.clearTimeout(timeId);
				});
			}
		});
		(0, vue.watchEffect)((onCleanup) => {
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
		(0, vue.onMounted)(() => {
			const scrollArea = rootContext.scrollArea.value;
			if (scrollArea) {
				scrollArea.addEventListener("pointerenter", handlePointerEnter);
				scrollArea.addEventListener("pointerleave", handlePointerLeave);
			}
		});
		(0, vue.onUnmounted)(() => {
			const scrollArea = rootContext.scrollArea.value;
			if (scrollArea) {
				scrollArea.removeEventListener("pointerenter", handlePointerEnter);
				scrollArea.removeEventListener("pointerleave", handlePointerLeave);
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || visible.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_ScrollArea_ScrollAreaScrollbarAuto.ScrollAreaScrollbarAuto_default, (0, vue.mergeProps)(_ctx.$attrs, {
					ref: (0, vue.unref)(forwardRef),
					"data-state": visible.value ? "visible" : "hidden"
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'ScrollAreaScrollbarGlimpse_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaScrollbarGlimpse_default;
  }
});
//# sourceMappingURL=ScrollAreaScrollbarGlimpse.cjs.map