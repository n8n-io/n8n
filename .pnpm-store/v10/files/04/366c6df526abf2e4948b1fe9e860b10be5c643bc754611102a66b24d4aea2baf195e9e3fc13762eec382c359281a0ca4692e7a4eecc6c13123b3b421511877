import { useForwardExpose } from "../shared/useForwardExpose.js";
import { BACK_KEYS, linearScale, provideSliderOrientationContext } from "./utils.js";
import { SliderImpl_default } from "./SliderImpl.js";
import { injectSliderRootContext } from "./SliderRoot.js";
import { computed, createBlock, defineComponent, normalizeStyle, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Slider/SliderHorizontal.vue?vue&type=script&setup=true&lang.ts
var SliderHorizontal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SliderHorizontal",
	props: {
		dir: {
			type: String,
			required: false
		},
		min: {
			type: Number,
			required: true
		},
		max: {
			type: Number,
			required: true
		},
		inverted: {
			type: Boolean,
			required: true
		}
	},
	emits: [
		"slideEnd",
		"slideStart",
		"slideMove",
		"homeKeyDown",
		"endKeyDown",
		"stepKeyDown"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { max, min, dir, inverted } = toRefs(props);
		const { forwardRef, currentElement: sliderElement } = useForwardExpose();
		const rootContext = injectSliderRootContext();
		const offsetPosition = ref();
		const rectRef = ref();
		const isSlidingFromLeft = computed(() => dir?.value !== "rtl" && !inverted.value || dir?.value !== "ltr" && inverted.value);
		function getValueFromPointerEvent(event, slideStart) {
			const rect = rectRef.value || sliderElement.value.getBoundingClientRect();
			const thumb = [...rootContext.thumbElements.value][rootContext.valueIndexToChangeRef.value];
			const thumbWidth = rootContext.thumbAlignment.value === "contain" ? thumb.clientWidth : 0;
			if (!offsetPosition.value && !slideStart && rootContext.thumbAlignment.value === "contain") offsetPosition.value = event.clientX - thumb.getBoundingClientRect().left;
			const input = [0, rect.width - thumbWidth];
			const output = isSlidingFromLeft.value ? [min.value, max.value] : [max.value, min.value];
			const value = linearScale(input, output);
			rectRef.value = rect;
			const position = slideStart ? event.clientX - rect.left - thumbWidth / 2 : event.clientX - rect.left - (offsetPosition.value ?? 0);
			return value(position);
		}
		const startEdge = computed(() => isSlidingFromLeft.value ? "left" : "right");
		const endEdge = computed(() => isSlidingFromLeft.value ? "right" : "left");
		const direction = computed(() => isSlidingFromLeft.value ? 1 : -1);
		provideSliderOrientationContext({
			startEdge,
			endEdge,
			direction,
			size: "width"
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(SliderImpl_default, {
				ref: unref(forwardRef),
				dir: unref(dir),
				"data-orientation": "horizontal",
				style: normalizeStyle({ ["--reka-slider-thumb-transform"]: !isSlidingFromLeft.value && unref(rootContext).thumbAlignment.value === "overflow" ? "translateX(50%)" : "translateX(-50%)" }),
				onSlideStart: _cache[0] || (_cache[0] = (event) => {
					const value = getValueFromPointerEvent(event, true);
					emits("slideStart", value);
				}),
				onSlideMove: _cache[1] || (_cache[1] = (event) => {
					const value = getValueFromPointerEvent(event);
					emits("slideMove", value);
				}),
				onSlideEnd: _cache[2] || (_cache[2] = () => {
					rectRef.value = void 0;
					offsetPosition.value = void 0;
					emits("slideEnd");
				}),
				onStepKeyDown: _cache[3] || (_cache[3] = (event) => {
					const slideDirection = isSlidingFromLeft.value ? "from-left" : "from-right";
					const isBackKey = unref(BACK_KEYS)[slideDirection].includes(event.key);
					emits("stepKeyDown", event, isBackKey ? -1 : 1);
				}),
				onEndKeyDown: _cache[4] || (_cache[4] = ($event) => emits("endKeyDown", $event)),
				onHomeKeyDown: _cache[5] || (_cache[5] = ($event) => emits("homeKeyDown", $event))
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["dir", "style"]);
		};
	}
});

//#endregion
//#region src/Slider/SliderHorizontal.vue
var SliderHorizontal_default = SliderHorizontal_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SliderHorizontal_default };
//# sourceMappingURL=SliderHorizontal.js.map