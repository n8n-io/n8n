import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { convertValueToPercentage, injectSliderOrientationContext } from "./utils.js";
import { injectSliderRootContext } from "./SliderRoot.js";
import { computed, createBlock, defineComponent, normalizeStyle, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Slider/SliderRange.vue?vue&type=script&setup=true&lang.ts
var SliderRange_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SliderRange",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const rootContext = injectSliderRootContext();
		const orientation = injectSliderOrientationContext();
		useForwardExpose();
		const percentages = computed(() => rootContext.currentModelValue.value.map((value) => convertValueToPercentage(value, rootContext.min.value, rootContext.max.value)));
		const offsetStart = computed(() => rootContext.currentModelValue.value.length > 1 ? Math.min(...percentages.value) : 0);
		const offsetEnd = computed(() => 100 - Math.max(...percentages.value, 0));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
				"data-orientation": unref(rootContext).orientation.value,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				style: normalizeStyle({
					[unref(orientation).startEdge.value]: `${offsetStart.value}%`,
					[unref(orientation).endEdge.value]: `${offsetEnd.value}%`
				})
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"data-disabled",
				"data-orientation",
				"as-child",
				"as",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/Slider/SliderRange.vue
var SliderRange_default = SliderRange_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SliderRange_default };
//# sourceMappingURL=SliderRange.js.map