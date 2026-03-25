import { Primitive } from "../Primitive/Primitive.js";
import { ARROW_KEYS, PAGE_KEYS } from "./utils.js";
import { injectSliderRootContext } from "./SliderRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Slider/SliderImpl.vue?vue&type=script&setup=true&lang.ts
var SliderImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SliderImpl",
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
	emits: [
		"slideStart",
		"slideMove",
		"slideEnd",
		"homeKeyDown",
		"endKeyDown",
		"stepKeyDown"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectSliderRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({ "data-slider-impl": "" }, props, {
				onKeydown: _cache[0] || (_cache[0] = (event) => {
					if (event.key === "Home") {
						emits("homeKeyDown", event);
						event.preventDefault();
					} else if (event.key === "End") {
						emits("endKeyDown", event);
						event.preventDefault();
					} else if (unref(PAGE_KEYS).concat(unref(ARROW_KEYS)).includes(event.key)) {
						emits("stepKeyDown", event);
						event.preventDefault();
					}
				}),
				onPointerdown: _cache[1] || (_cache[1] = (event) => {
					const target = event.target;
					target.setPointerCapture(event.pointerId);
					event.preventDefault();
					if (unref(rootContext).thumbElements.value.includes(target)) target.focus();
					else emits("slideStart", event);
				}),
				onPointermove: _cache[2] || (_cache[2] = (event) => {
					const target = event.target;
					if (target.hasPointerCapture(event.pointerId)) emits("slideMove", event);
				}),
				onPointerup: _cache[3] || (_cache[3] = (event) => {
					const target = event.target;
					if (target.hasPointerCapture(event.pointerId)) {
						target.releasePointerCapture(event.pointerId);
						emits("slideEnd", event);
					}
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Slider/SliderImpl.vue
var SliderImpl_default = SliderImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SliderImpl_default };
//# sourceMappingURL=SliderImpl.js.map