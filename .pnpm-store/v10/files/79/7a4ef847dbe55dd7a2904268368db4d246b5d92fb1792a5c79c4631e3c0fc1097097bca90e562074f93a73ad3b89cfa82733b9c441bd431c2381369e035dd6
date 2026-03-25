import { useForwardExpose } from "../shared/useForwardExpose.js";
import { injectSelectItemAlignedPositionContext } from "./SelectItemAlignedPosition.js";
import { injectSelectContentContext } from "./SelectContentImpl.js";
import { SelectScrollButtonImpl_default } from "./SelectScrollButtonImpl.js";
import { createBlock, createCommentVNode, defineComponent, openBlock, ref, renderSlot, unref, watch, watchEffect, withCtx } from "vue";

//#region src/Select/SelectScrollDownButton.vue?vue&type=script&setup=true&lang.ts
var SelectScrollDownButton_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SelectScrollDownButton",
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
		const contentContext = injectSelectContentContext();
		const alignedPositionContext = contentContext.position === "item-aligned" ? injectSelectItemAlignedPositionContext() : void 0;
		const { forwardRef, currentElement } = useForwardExpose();
		const canScrollDown = ref(false);
		watchEffect((cleanupFn) => {
			if (contentContext.viewport?.value && contentContext.isPositioned?.value) {
				const viewport = contentContext.viewport.value;
				function handleScroll() {
					const maxScroll = viewport.scrollHeight - viewport.clientHeight;
					canScrollDown.value = Math.ceil(viewport.scrollTop) < maxScroll;
				}
				handleScroll();
				viewport.addEventListener("scroll", handleScroll);
				cleanupFn(() => viewport.removeEventListener("scroll", handleScroll));
			}
		});
		watch(currentElement, () => {
			if (currentElement.value) alignedPositionContext?.onScrollButtonChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return canScrollDown.value ? (openBlock(), createBlock(SelectScrollButtonImpl_default, {
				key: 0,
				ref: unref(forwardRef),
				onAutoScroll: _cache[0] || (_cache[0] = () => {
					const { viewport, selectedItem } = unref(contentContext);
					if (viewport?.value && selectedItem?.value) viewport.value.scrollTop = viewport.value.scrollTop + selectedItem.value.offsetHeight;
				})
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 512)) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Select/SelectScrollDownButton.vue
var SelectScrollDownButton_default = SelectScrollDownButton_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectScrollDownButton_default };
//# sourceMappingURL=SelectScrollDownButton.js.map