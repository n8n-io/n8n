const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ScrollArea/ScrollAreaCornerImpl.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaCornerImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ScrollAreaCornerImpl",
	setup(__props) {
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const width = (0, vue.ref)(0);
		const height = (0, vue.ref)(0);
		const hasSize = (0, vue.computed)(() => !!width.value && !!height.value);
		function setCornerHeight() {
			const offsetHeight = rootContext.scrollbarX.value?.offsetHeight || 0;
			rootContext.onCornerHeightChange(offsetHeight);
			height.value = offsetHeight;
		}
		function setCornerWidth() {
			const offsetWidth = rootContext.scrollbarY.value?.offsetWidth || 0;
			rootContext.onCornerWidthChange(offsetWidth);
			width.value = offsetWidth;
		}
		(0, __vueuse_core.useResizeObserver)(rootContext.scrollbarX.value, setCornerHeight);
		(0, __vueuse_core.useResizeObserver)(rootContext.scrollbarY.value, setCornerWidth);
		(0, vue.watch)(() => rootContext.scrollbarX.value, setCornerHeight);
		(0, vue.watch)(() => rootContext.scrollbarY.value, setCornerWidth);
		return (_ctx, _cache) => {
			return hasSize.value ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				key: 0,
				style: {
					width: `${width.value}px`,
					height: `${height.value}px`,
					position: "absolute",
					right: (0, vue.unref)(rootContext).dir.value === "ltr" ? 0 : void 0,
					left: (0, vue.unref)(rootContext).dir.value === "rtl" ? 0 : void 0,
					bottom: 0
				}
			}, _ctx.$parent?.$props), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["style"])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaCornerImpl.vue
var ScrollAreaCornerImpl_default = ScrollAreaCornerImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaCornerImpl_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaCornerImpl_default;
  }
});
//# sourceMappingURL=ScrollAreaCornerImpl.cjs.map