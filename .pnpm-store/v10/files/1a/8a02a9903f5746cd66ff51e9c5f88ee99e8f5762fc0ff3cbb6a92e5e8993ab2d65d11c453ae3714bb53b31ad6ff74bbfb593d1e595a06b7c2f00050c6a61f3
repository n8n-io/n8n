const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_utils = require('./utils.cjs');
const require_ScrollArea_ScrollAreaScrollbarImpl = require('./ScrollAreaScrollbarImpl.cjs');
const require_ScrollArea_ScrollAreaScrollbarVisible = require('./ScrollAreaScrollbarVisible.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ScrollArea/ScrollAreaScrollbarX.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarX_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ScrollAreaScrollbarX",
	setup(__props) {
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const scrollbarVisibleContext = require_ScrollArea_ScrollAreaScrollbarVisible.injectScrollAreaScrollbarVisibleContext();
		const { forwardRef, currentElement: scrollbarElement } = require_shared_useForwardExpose.useForwardExpose();
		(0, vue.onMounted)(() => {
			if (scrollbarElement.value) rootContext.onScrollbarXChange(scrollbarElement.value);
		});
		const sizes = (0, vue.computed)(() => scrollbarVisibleContext.sizes.value);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaScrollbarImpl.ScrollAreaScrollbarImpl_default, {
				ref: (0, vue.unref)(forwardRef),
				"is-horizontal": true,
				"data-orientation": "horizontal",
				style: (0, vue.normalizeStyle)({
					bottom: 0,
					left: (0, vue.unref)(rootContext).dir.value === "rtl" ? "var(--reka-scroll-area-corner-width)" : 0,
					right: (0, vue.unref)(rootContext).dir.value === "ltr" ? "var(--reka-scroll-area-corner-width)" : 0,
					["--reka-scroll-area-thumb-width"]: sizes.value ? `${(0, vue.unref)(require_ScrollArea_utils.getThumbSize)(sizes.value)}px` : void 0
				}),
				onOnDragScroll: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(scrollbarVisibleContext).onDragScroll($event.x))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["style"]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarX.vue
var ScrollAreaScrollbarX_default = ScrollAreaScrollbarX_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaScrollbarX_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaScrollbarX_default;
  }
});
//# sourceMappingURL=ScrollAreaScrollbarX.cjs.map