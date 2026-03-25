const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_ScrollAreaScrollbarVisible = require('./ScrollAreaScrollbarVisible.cjs');
const require_ScrollArea_ScrollAreaScrollbarAuto = require('./ScrollAreaScrollbarAuto.cjs');
const require_ScrollArea_ScrollAreaScrollbarHover = require('./ScrollAreaScrollbarHover.cjs');
const require_ScrollArea_ScrollAreaScrollbarScroll = require('./ScrollAreaScrollbarScroll.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ScrollArea/ScrollAreaScrollbar.vue?vue&type=script&setup=true&lang.ts
const [injectScrollAreaScrollbarContext, provideScrollAreaScrollbarContext] = require_shared_createContext.createContext("ScrollAreaScrollbar");
var ScrollAreaScrollbar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ScrollAreaScrollbar",
	props: {
		orientation: {
			type: String,
			required: false,
			default: "vertical"
		},
		forceMount: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const isHorizontal = (0, vue.computed)(() => props.orientation === "horizontal");
		(0, vue.watch)(isHorizontal, () => {
			if (isHorizontal.value) rootContext.onScrollbarXEnabledChange(true);
			else rootContext.onScrollbarYEnabledChange(true);
		}, { immediate: true });
		(0, vue.onUnmounted)(() => {
			rootContext.onScrollbarXEnabledChange(false);
			rootContext.onScrollbarYEnabledChange(false);
		});
		const { orientation, forceMount, asChild, as } = (0, vue.toRefs)(props);
		provideScrollAreaScrollbarContext({
			orientation,
			forceMount,
			isHorizontal,
			as,
			asChild
		});
		return (_ctx, _cache) => {
			return (0, vue.unref)(rootContext).type.value === "hover" ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaScrollbarHover.ScrollAreaScrollbarHover_default, (0, vue.mergeProps)({ key: 0 }, _ctx.$attrs, {
				ref: (0, vue.unref)(forwardRef),
				"force-mount": (0, vue.unref)(forceMount)
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["force-mount"])) : (0, vue.unref)(rootContext).type.value === "scroll" ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaScrollbarScroll.ScrollAreaScrollbarScroll_default, (0, vue.mergeProps)({ key: 1 }, _ctx.$attrs, {
				ref: (0, vue.unref)(forwardRef),
				"force-mount": (0, vue.unref)(forceMount)
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["force-mount"])) : (0, vue.unref)(rootContext).type.value === "auto" ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaScrollbarAuto.ScrollAreaScrollbarAuto_default, (0, vue.mergeProps)({ key: 2 }, _ctx.$attrs, {
				ref: (0, vue.unref)(forwardRef),
				"force-mount": (0, vue.unref)(forceMount)
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["force-mount"])) : (0, vue.unref)(rootContext).type.value === "always" ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaScrollbarVisible.ScrollAreaScrollbarVisible_default, (0, vue.mergeProps)({ key: 3 }, _ctx.$attrs, {
				ref: (0, vue.unref)(forwardRef),
				"data-state": "visible"
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbar.vue
var ScrollAreaScrollbar_default = ScrollAreaScrollbar_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaScrollbar_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaScrollbar_default;
  }
});
Object.defineProperty(exports, 'injectScrollAreaScrollbarContext', {
  enumerable: true,
  get: function () {
    return injectScrollAreaScrollbarContext;
  }
});
//# sourceMappingURL=ScrollAreaScrollbar.cjs.map