const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Slider_utils = require('./utils.cjs');
const require_Slider_SliderImpl = require('./SliderImpl.cjs');
const require_Slider_SliderRoot = require('./SliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Slider/SliderVertical.vue?vue&type=script&setup=true&lang.ts
var SliderVertical_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SliderVertical",
	props: {
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
		const { max, min, inverted } = (0, vue.toRefs)(props);
		const rootContext = require_Slider_SliderRoot.injectSliderRootContext();
		const { forwardRef, currentElement: sliderElement } = require_shared_useForwardExpose.useForwardExpose();
		const offsetPosition = (0, vue.ref)();
		const rectRef = (0, vue.ref)();
		const isSlidingFromBottom = (0, vue.computed)(() => !inverted.value);
		function getValueFromPointerEvent(event, slideStart) {
			const rect = rectRef.value || sliderElement.value.getBoundingClientRect();
			const thumb = [...rootContext.thumbElements.value][rootContext.valueIndexToChangeRef.value];
			const thumbHeight = rootContext.thumbAlignment.value === "contain" ? thumb.clientHeight : 0;
			if (!offsetPosition.value && !slideStart && rootContext.thumbAlignment.value === "contain") offsetPosition.value = event.clientY - thumb.getBoundingClientRect().top;
			const input = [0, rect.height - thumbHeight];
			const output = isSlidingFromBottom.value ? [max.value, min.value] : [min.value, max.value];
			const value = require_Slider_utils.linearScale(input, output);
			const position = slideStart ? event.clientY - rect.top - thumbHeight / 2 : event.clientY - rect.top - (offsetPosition.value ?? 0);
			rectRef.value = rect;
			return value(position);
		}
		const startEdge = (0, vue.computed)(() => isSlidingFromBottom.value ? "bottom" : "top");
		const endEdge = (0, vue.computed)(() => isSlidingFromBottom.value ? "top" : "bottom");
		const direction = (0, vue.computed)(() => isSlidingFromBottom.value ? 1 : -1);
		require_Slider_utils.provideSliderOrientationContext({
			startEdge,
			endEdge,
			direction,
			size: "height"
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Slider_SliderImpl.SliderImpl_default, {
				ref: (0, vue.unref)(forwardRef),
				"data-orientation": "vertical",
				style: (0, vue.normalizeStyle)({ ["--reka-slider-thumb-transform"]: !isSlidingFromBottom.value && (0, vue.unref)(rootContext).thumbAlignment.value === "overflow" ? "translateY(-50%)" : "translateY(50%)" }),
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
					const slideDirection = isSlidingFromBottom.value ? "from-bottom" : "from-top";
					const isBackKey = (0, vue.unref)(require_Slider_utils.BACK_KEYS)[slideDirection].includes(event.key);
					emits("stepKeyDown", event, isBackKey ? -1 : 1);
				}),
				onEndKeyDown: _cache[4] || (_cache[4] = ($event) => emits("endKeyDown", $event)),
				onHomeKeyDown: _cache[5] || (_cache[5] = ($event) => emits("homeKeyDown", $event))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["style"]);
		};
	}
});

//#endregion
//#region src/Slider/SliderVertical.vue
var SliderVertical_default = SliderVertical_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SliderVertical_default', {
  enumerable: true,
  get: function () {
    return SliderVertical_default;
  }
});
//# sourceMappingURL=SliderVertical.cjs.map