import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { computed, createElementBlock, createVNode, defineComponent, mergeProps, normalizeStyle, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/AspectRatio/AspectRatio.vue?vue&type=script&setup=true&lang.ts
var AspectRatio_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AspectRatio",
	props: {
		ratio: {
			type: Number,
			required: false,
			default: 1
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
	setup(__props) {
		const props = __props;
		const { forwardRef } = useForwardExpose();
		const aspect = computed(() => {
			return 1 / props.ratio * 100;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				style: normalizeStyle(`position: relative; width: 100%; padding-bottom: ${aspect.value}%`),
				"data-reka-aspect-ratio-wrapper": ""
			}, [createVNode(unref(Primitive), mergeProps({
				ref: unref(forwardRef),
				"as-child": _ctx.asChild,
				as: _ctx.as,
				style: {
					"position": "absolute",
					"inset": "0px"
				}
			}, _ctx.$attrs), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { aspect: aspect.value })]),
				_: 3
			}, 16, ["as-child", "as"])], 4);
		};
	}
});

//#endregion
//#region src/AspectRatio/AspectRatio.vue
var AspectRatio_default = AspectRatio_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AspectRatio_default };
//# sourceMappingURL=AspectRatio.js.map