import { useForwardExpose } from "../shared/useForwardExpose.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { ScrollAreaCornerImpl_default } from "./ScrollAreaCornerImpl.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaCorner.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaCorner_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { forwardRef } = useForwardExpose();
		const rootContext = injectScrollAreaRootContext();
		const hasBothScrollbarsVisible = computed(() => !!rootContext.scrollbarX.value && !!rootContext.scrollbarY.value);
		const hasCorner = computed(() => rootContext.type.value !== "scroll" && hasBothScrollbarsVisible.value);
		return (_ctx, _cache) => {
			return hasCorner.value ? (openBlock(), createBlock(ScrollAreaCornerImpl_default, mergeProps({ key: 0 }, props, { ref: unref(forwardRef) }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaCorner.vue
var ScrollAreaCorner_default = ScrollAreaCorner_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaCorner_default };
//# sourceMappingURL=ScrollAreaCorner.js.map