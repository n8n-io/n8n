const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_utils = require('./utils.cjs');
const require_ScrollArea_ScrollAreaScrollbarVisible = require('./ScrollAreaScrollbarVisible.cjs');
const require_ScrollArea_ScrollAreaScrollbar = require('./ScrollAreaScrollbar.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ScrollArea/ScrollAreaScrollbarImpl.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ScrollAreaScrollbarImpl",
	props: { isHorizontal: {
		type: Boolean,
		required: true
	} },
	emits: [
		"onDragScroll",
		"onWheelScroll",
		"onThumbPointerDown"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const scrollbarVisibleContext = require_ScrollArea_ScrollAreaScrollbarVisible.injectScrollAreaScrollbarVisibleContext();
		const scrollbarContext = require_ScrollArea_ScrollAreaScrollbar.injectScrollAreaScrollbarContext();
		const { forwardRef, currentElement: scrollbar } = require_shared_useForwardExpose.useForwardExpose();
		const prevWebkitUserSelectRef = (0, vue.ref)("");
		const rectRef = (0, vue.ref)();
		function handleDragScroll(event) {
			if (rectRef.value) {
				const x = event.clientX - rectRef.value?.left;
				const y = event.clientY - rectRef.value?.top;
				emit("onDragScroll", {
					x,
					y
				});
			}
		}
		function handlePointerDown(event) {
			const mainPointer = 0;
			if (event.button === mainPointer) {
				const element = event.target;
				element.setPointerCapture(event.pointerId);
				rectRef.value = scrollbar.value.getBoundingClientRect();
				prevWebkitUserSelectRef.value = document.body.style.webkitUserSelect;
				document.body.style.webkitUserSelect = "none";
				if (rootContext.viewport) rootContext.viewport.value.style.scrollBehavior = "auto";
				handleDragScroll(event);
			}
		}
		function handlePointerMove(event) {
			handleDragScroll(event);
		}
		function handlePointerUp(event) {
			const element = event.target;
			if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
			document.body.style.webkitUserSelect = prevWebkitUserSelectRef.value;
			if (rootContext.viewport) rootContext.viewport.value.style.scrollBehavior = "";
			rectRef.value = void 0;
		}
		function handleWheel(event) {
			const element = event.target;
			const isScrollbarWheel = scrollbar.value?.contains(element);
			const maxScrollPos = scrollbarVisibleContext.sizes.value.content - scrollbarVisibleContext.sizes.value.viewport;
			if (isScrollbarWheel) scrollbarVisibleContext.handleWheelScroll(event, maxScrollPos);
		}
		(0, vue.onMounted)(() => {
			document.addEventListener("wheel", handleWheel, { passive: false });
		});
		(0, vue.onUnmounted)(() => {
			document.removeEventListener("wheel", handleWheel);
		});
		function handleSizeChange() {
			if (!scrollbar.value) return;
			if (props.isHorizontal) scrollbarVisibleContext.handleSizeChange({
				content: rootContext.viewport.value?.scrollWidth ?? 0,
				viewport: rootContext.viewport.value?.offsetWidth ?? 0,
				scrollbar: {
					size: scrollbar.value.clientWidth ?? 0,
					paddingStart: require_ScrollArea_utils.toInt(getComputedStyle(scrollbar.value).paddingLeft),
					paddingEnd: require_ScrollArea_utils.toInt(getComputedStyle(scrollbar.value).paddingRight)
				}
			});
			else scrollbarVisibleContext.handleSizeChange({
				content: rootContext.viewport.value?.scrollHeight ?? 0,
				viewport: rootContext.viewport.value?.offsetHeight ?? 0,
				scrollbar: {
					size: scrollbar.value?.clientHeight ?? 0,
					paddingStart: require_ScrollArea_utils.toInt(getComputedStyle(scrollbar.value).paddingLeft),
					paddingEnd: require_ScrollArea_utils.toInt(getComputedStyle(scrollbar.value).paddingRight)
				}
			});
		}
		(0, __vueuse_core.useResizeObserver)(scrollbar, handleSizeChange);
		(0, __vueuse_core.useResizeObserver)(rootContext.content, handleSizeChange);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				style: { "position": "absolute" },
				"data-scrollbarimpl": "",
				as: (0, vue.unref)(scrollbarContext).as.value,
				"as-child": (0, vue.unref)(scrollbarContext).asChild.value,
				onPointerdown: handlePointerDown,
				onPointermove: handlePointerMove,
				onPointerup: handlePointerUp
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as", "as-child"]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarImpl.vue
var ScrollAreaScrollbarImpl_default = ScrollAreaScrollbarImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaScrollbarImpl_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaScrollbarImpl_default;
  }
});
//# sourceMappingURL=ScrollAreaScrollbarImpl.cjs.map