import { Primitive } from "../Primitive/Primitive.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, watch, withCtx } from "vue";
import { useResizeObserver } from "@vueuse/core";

//#region src/ScrollArea/ScrollAreaCornerImpl.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaCornerImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ScrollAreaCornerImpl",
	setup(__props) {
		const rootContext = injectScrollAreaRootContext();
		const width = ref(0);
		const height = ref(0);
		const hasSize = computed(() => !!width.value && !!height.value);
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
		useResizeObserver(rootContext.scrollbarX.value, setCornerHeight);
		useResizeObserver(rootContext.scrollbarY.value, setCornerWidth);
		watch(() => rootContext.scrollbarX.value, setCornerHeight);
		watch(() => rootContext.scrollbarY.value, setCornerWidth);
		return (_ctx, _cache) => {
			return hasSize.value ? (openBlock(), createBlock(unref(Primitive), mergeProps({
				key: 0,
				style: {
					width: `${width.value}px`,
					height: `${height.value}px`,
					position: "absolute",
					right: unref(rootContext).dir.value === "ltr" ? 0 : void 0,
					left: unref(rootContext).dir.value === "rtl" ? 0 : void 0,
					bottom: 0
				}
			}, _ctx.$parent?.$props), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["style"])) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaCornerImpl.vue
var ScrollAreaCornerImpl_default = ScrollAreaCornerImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaCornerImpl_default };
//# sourceMappingURL=ScrollAreaCornerImpl.js.map