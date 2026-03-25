const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ScrollArea/ScrollAreaRoot.vue?vue&type=script&setup=true&lang.ts
const [injectScrollAreaRootContext, provideScrollAreaRootContext] = require_shared_createContext.createContext("ScrollAreaRoot");
var ScrollAreaRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ScrollAreaRoot",
	props: {
		type: {
			type: String,
			required: false,
			default: "hover"
		},
		dir: {
			type: String,
			required: false
		},
		scrollHideDelay: {
			type: Number,
			required: false,
			default: 600
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const cornerWidth = (0, vue.ref)(0);
		const cornerHeight = (0, vue.ref)(0);
		const viewport = (0, vue.ref)();
		const content = (0, vue.ref)();
		const scrollbarX = (0, vue.ref)();
		const scrollbarY = (0, vue.ref)();
		const scrollbarXEnabled = (0, vue.ref)(false);
		const scrollbarYEnabled = (0, vue.ref)(false);
		const { type, dir: propDir, scrollHideDelay } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		function scrollTop() {
			viewport.value?.scrollTo({ top: 0 });
		}
		function scrollTopLeft() {
			viewport.value?.scrollTo({
				top: 0,
				left: 0
			});
		}
		__expose({
			viewport,
			scrollTop,
			scrollTopLeft
		});
		const { forwardRef, currentElement: scrollArea } = require_shared_useForwardExpose.useForwardExpose();
		provideScrollAreaRootContext({
			type,
			dir,
			scrollHideDelay,
			scrollArea,
			viewport,
			onViewportChange: (el) => {
				viewport.value = el || void 0;
			},
			content,
			onContentChange: (el) => {
				content.value = el;
			},
			scrollbarX,
			scrollbarXEnabled,
			scrollbarY,
			scrollbarYEnabled,
			onScrollbarXChange: (scrollbar) => {
				scrollbarX.value = scrollbar || void 0;
			},
			onScrollbarYChange: (scrollbar) => {
				scrollbarY.value = scrollbar || void 0;
			},
			onScrollbarXEnabledChange: (rendered) => {
				scrollbarXEnabled.value = rendered;
			},
			onScrollbarYEnabledChange: (rendered) => {
				scrollbarYEnabled.value = rendered;
			},
			onCornerWidthChange: (width) => {
				cornerWidth.value = width;
			},
			onCornerHeightChange: (height) => {
				cornerHeight.value = height;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				"as-child": props.asChild,
				as: _ctx.as,
				dir: (0, vue.unref)(dir),
				style: (0, vue.normalizeStyle)({
					position: "relative",
					["--reka-scroll-area-corner-width"]: `${cornerWidth.value}px`,
					["--reka-scroll-area-corner-height"]: `${cornerHeight.value}px`
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"dir",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaRoot.vue
var ScrollAreaRoot_default = ScrollAreaRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaRoot_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaRoot_default;
  }
});
Object.defineProperty(exports, 'injectScrollAreaRootContext', {
  enumerable: true,
  get: function () {
    return injectScrollAreaRootContext;
  }
});
//# sourceMappingURL=ScrollAreaRoot.cjs.map