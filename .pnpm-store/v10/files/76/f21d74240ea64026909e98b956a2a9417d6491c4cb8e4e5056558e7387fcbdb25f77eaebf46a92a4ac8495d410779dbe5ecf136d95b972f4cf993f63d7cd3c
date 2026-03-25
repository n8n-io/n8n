const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_ScrollAreaScrollbarVisible = require('./ScrollAreaScrollbarVisible.cjs');
const require_ScrollArea_ScrollAreaScrollbar = require('./ScrollAreaScrollbar.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ScrollArea/ScrollAreaScrollbarAuto.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarAuto_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ScrollAreaScrollbarAuto",
	props: { forceMount: {
		type: Boolean,
		required: false
	} },
	setup(__props) {
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const scrollbarContext = require_ScrollArea_ScrollAreaScrollbar.injectScrollAreaScrollbarContext();
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const visible = (0, vue.ref)(false);
		const handleResize = (0, __vueuse_core.useDebounceFn)(() => {
			if (rootContext.viewport.value) {
				const isOverflowX = rootContext.viewport.value.offsetWidth < rootContext.viewport.value.scrollWidth;
				const isOverflowY = rootContext.viewport.value.offsetHeight < rootContext.viewport.value.scrollHeight;
				visible.value = scrollbarContext.isHorizontal.value ? isOverflowX : isOverflowY;
			}
		}, 10);
		(0, vue.onMounted)(() => handleResize());
		(0, __vueuse_core.useResizeObserver)(rootContext.viewport, handleResize);
		(0, __vueuse_core.useResizeObserver)(rootContext.content, handleResize);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || visible.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_ScrollArea_ScrollAreaScrollbarVisible.ScrollAreaScrollbarVisible_default, (0, vue.mergeProps)(_ctx.$attrs, {
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
//#region src/ScrollArea/ScrollAreaScrollbarAuto.vue
var ScrollAreaScrollbarAuto_default = ScrollAreaScrollbarAuto_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaScrollbarAuto_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaScrollbarAuto_default;
  }
});
//# sourceMappingURL=ScrollAreaScrollbarAuto.cjs.map