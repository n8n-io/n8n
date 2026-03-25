import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { createBlock, defineComponent, normalizeStyle, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaRoot.vue?vue&type=script&setup=true&lang.ts
const [injectScrollAreaRootContext, provideScrollAreaRootContext] = createContext("ScrollAreaRoot");
var ScrollAreaRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const cornerWidth = ref(0);
		const cornerHeight = ref(0);
		const viewport = ref();
		const content = ref();
		const scrollbarX = ref();
		const scrollbarY = ref();
		const scrollbarXEnabled = ref(false);
		const scrollbarYEnabled = ref(false);
		const { type, dir: propDir, scrollHideDelay } = toRefs(props);
		const dir = useDirection(propDir);
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
		const { forwardRef, currentElement: scrollArea } = useForwardExpose();
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
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				"as-child": props.asChild,
				as: _ctx.as,
				dir: unref(dir),
				style: normalizeStyle({
					position: "relative",
					["--reka-scroll-area-corner-width"]: `${cornerWidth.value}px`,
					["--reka-scroll-area-corner-height"]: `${cornerHeight.value}px`
				})
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { ScrollAreaRoot_default, injectScrollAreaRootContext };
//# sourceMappingURL=ScrollAreaRoot.js.map