import { getChannelName } from "../color/channel.js";
import { SliderThumb_default } from "../Slider/SliderThumb.js";
import { injectColorSliderRootContext } from "./ColorSliderRoot.js";
import { computed, createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ColorSlider/ColorSliderThumb.vue?vue&type=script&setup=true&lang.ts
var ColorSliderThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ColorSliderThumb",
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
		const ariaLabel = computed(() => {
			return getChannelName(rootContext.channel.value);
		});
		const ariaValueText = computed(() => {
			const value = rootContext.channelValue.value;
			const channel = rootContext.channel.value;
			if (channel === "alpha") return `${Math.round(value)}%`;
			return String(Math.round(value));
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SliderThumb_default), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-label": ariaLabel.value,
				"aria-valuetext": ariaValueText.value
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					channelName: ariaLabel.value,
					channelValue: unref(rootContext).channelValue.value
				})]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-label",
				"aria-valuetext"
			]);
		};
	}
});

//#endregion
//#region src/ColorSlider/ColorSliderThumb.vue
var ColorSliderThumb_default = ColorSliderThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorSliderThumb_default };
//# sourceMappingURL=ColorSliderThumb.js.map