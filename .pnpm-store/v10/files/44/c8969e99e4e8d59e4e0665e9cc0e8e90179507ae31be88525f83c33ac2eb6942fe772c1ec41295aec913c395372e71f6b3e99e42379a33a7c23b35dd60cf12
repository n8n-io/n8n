import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectSliderRootContext } from "./SliderRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Slider/SliderTrack.vue?vue&type=script&setup=true&lang.ts
var SliderTrack_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SliderTrack",
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
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				"as-child": _ctx.asChild,
				as: _ctx.as,
				"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
				"data-orientation": unref(rootContext).orientation.value
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"data-disabled",
				"data-orientation"
			]);
		};
	}
});

//#endregion
//#region src/Slider/SliderTrack.vue
var SliderTrack_default = SliderTrack_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SliderTrack_default };
//# sourceMappingURL=SliderTrack.js.map