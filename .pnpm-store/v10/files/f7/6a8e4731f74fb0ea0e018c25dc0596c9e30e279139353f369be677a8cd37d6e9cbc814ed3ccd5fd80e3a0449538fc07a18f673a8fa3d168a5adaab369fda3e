const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_ScrollAreaCornerImpl = require('./ScrollAreaCornerImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ScrollArea/ScrollAreaCorner.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaCorner_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ScrollAreaCorner",
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
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const hasBothScrollbarsVisible = (0, vue.computed)(() => !!rootContext.scrollbarX.value && !!rootContext.scrollbarY.value);
		const hasCorner = (0, vue.computed)(() => rootContext.type.value !== "scroll" && hasBothScrollbarsVisible.value);
		return (_ctx, _cache) => {
			return hasCorner.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaCornerImpl.ScrollAreaCornerImpl_default, (0, vue.mergeProps)({ key: 0 }, props, { ref: (0, vue.unref)(forwardRef) }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaCorner.vue
var ScrollAreaCorner_default = ScrollAreaCorner_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaCorner_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaCorner_default;
  }
});
//# sourceMappingURL=ScrollAreaCorner.cjs.map