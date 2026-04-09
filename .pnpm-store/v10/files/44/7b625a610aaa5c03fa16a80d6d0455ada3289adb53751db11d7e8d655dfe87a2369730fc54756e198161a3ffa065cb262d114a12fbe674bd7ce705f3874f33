import { getSliderBackgroundStyle } from "../color/gradient.js";
import { SliderTrack_default } from "../Slider/SliderTrack.js";
import { injectColorSliderRootContext } from "./ColorSliderRoot.js";
import { computed, createBlock, defineComponent, normalizeStyle, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ColorSlider/ColorSliderTrack.vue?vue&type=script&setup=true&lang.ts
var ColorSliderTrack_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ColorSliderTrack",
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
		const props = __props;
		const rootContext = injectColorSliderRootContext();
		const backgroundStyle = computed(() => {
			return getSliderBackgroundStyle(rootContext.color.value, rootContext.channel.value, rootContext.colorSpace.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SliderTrack_default), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				style: normalizeStyle(backgroundStyle.value)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/ColorSlider/ColorSliderTrack.vue
var ColorSliderTrack_default = ColorSliderTrack_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorSliderTrack_default };
//# sourceMappingURL=ColorSliderTrack.js.map