import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { ScrollAreaScrollbarVisible_default } from "./ScrollAreaScrollbarVisible.js";
import { ScrollAreaScrollbarAuto_default } from "./ScrollAreaScrollbarAuto.js";
import { ScrollAreaScrollbarHover_default } from "./ScrollAreaScrollbarHover.js";
import { ScrollAreaScrollbarScroll_default } from "./ScrollAreaScrollbarScroll.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, onUnmounted, openBlock, renderSlot, toRefs, unref, watch, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaScrollbar.vue?vue&type=script&setup=true&lang.ts
const [injectScrollAreaScrollbarContext, provideScrollAreaScrollbarContext] = createContext("ScrollAreaScrollbar");
var ScrollAreaScrollbar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { forwardRef } = useForwardExpose();
		const rootContext = injectScrollAreaRootContext();
		const isHorizontal = computed(() => props.orientation === "horizontal");
		watch(isHorizontal, () => {
			if (isHorizontal.value) rootContext.onScrollbarXEnabledChange(true);
			else rootContext.onScrollbarYEnabledChange(true);
		}, { immediate: true });
		onUnmounted(() => {
			rootContext.onScrollbarXEnabledChange(false);
			rootContext.onScrollbarYEnabledChange(false);
		});
		const { orientation, forceMount, asChild, as } = toRefs(props);
		provideScrollAreaScrollbarContext({
			orientation,
			forceMount,
			isHorizontal,
			as,
			asChild
		});
		return (_ctx, _cache) => {
			return unref(rootContext).type.value === "hover" ? (openBlock(), createBlock(ScrollAreaScrollbarHover_default, mergeProps({ key: 0 }, _ctx.$attrs, {
				ref: unref(forwardRef),
				"force-mount": unref(forceMount)
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["force-mount"])) : unref(rootContext).type.value === "scroll" ? (openBlock(), createBlock(ScrollAreaScrollbarScroll_default, mergeProps({ key: 1 }, _ctx.$attrs, {
				ref: unref(forwardRef),
				"force-mount": unref(forceMount)
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["force-mount"])) : unref(rootContext).type.value === "auto" ? (openBlock(), createBlock(ScrollAreaScrollbarAuto_default, mergeProps({ key: 2 }, _ctx.$attrs, {
				ref: unref(forwardRef),
				"force-mount": unref(forceMount)
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["force-mount"])) : unref(rootContext).type.value === "always" ? (openBlock(), createBlock(ScrollAreaScrollbarVisible_default, mergeProps({ key: 3 }, _ctx.$attrs, {
				ref: unref(forwardRef),
				"data-state": "visible"
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbar.vue
var ScrollAreaScrollbar_default = ScrollAreaScrollbar_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaScrollbar_default, injectScrollAreaScrollbarContext };
//# sourceMappingURL=ScrollAreaScrollbar.js.map