const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Slider_utils = require('./utils.cjs');
const require_Slider_SliderImpl = require('./SliderImpl.cjs');
const require_Slider_SliderRoot = require('./SliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Slider/SliderHorizontal.vue?vue&type=script&setup=true&lang.ts
var SliderHorizontal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { max, min, dir, inverted } = (0, vue.toRefs)(props);
		const { forwardRef, currentElement: sliderElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Slider_SliderRoot.injectSliderRootContext();
		const offsetPosition = (0, vue.ref)();
		const rectRef = (0, vue.ref)();
		const isSlidingFromLeft = (0, vue.computed)(() => dir?.value !== "rtl" && !inverted.value || dir?.value !== "ltr" && inverted.value);
		function getValueFromPointerEvent(event, slideStart) {
			const rect = rectRef.value || sliderElement.value.getBoundingClientRect();
			const thumb = [...rootContext.thumbElements.value][rootContext.valueIndexToChangeRef.value];
			const thumbWidth = rootContext.thumbAlignment.value === "contain" ? thumb.clientWidth : 0;
			if (!offsetPosition.value && !slideStart && rootContext.thumbAlignment.value === "contain") offsetPosition.value = event.clientX - thumb.getBoundingClientRect().left;
			const input = [0, rect.width - thumbWidth];
			const output = isSlidingFromLeft.value ? [min.value, max.value] : [max.value, min.value];
			const value = require_Slider_utils.linearScale(input, output);
			rectRef.value = rect;
			const position = slideStart ? event.clientX - rect.left - thumbWidth / 2 : event.clientX - rect.left - (offsetPosition.value ?? 0);
			return value(position);
		}
		const startEdge = (0, vue.computed)(() => isSlidingFromLeft.value ? "left" : "right");
		const endEdge = (0, vue.computed)(() => isSlidingFromLeft.value ? "right" : "left");
		const direction = (0, vue.computed)(() => isSlidingFromLeft.value ? 1 : -1);
		require_Slider_utils.provideSliderOrientationContext({
			startEdge,
			endEdge,
			direction,
			size: "width"
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Slider_SliderImpl.SliderImpl_default, {
				ref: (0, vue.unref)(forwardRef),
				dir: (0, vue.unref)(dir),
				"data-orientation": "horizontal",
				style: (0, vue.normalizeStyle)({ ["--reka-slider-thumb-transform"]: !isSlidingFromLeft.value && (0, vue.unref)(rootContext).thumbAlignment.value === "overflow" ? "translateX(50%)" : "translateX(-50%)" }),
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
					const isBackKey = (0, vue.unref)(require_Slider_utils.BACK_KEYS)[slideDirection].includes(event.key);
					emits("stepKeyDown", event, isBackKey ? -1 : 1);
				}),
				onEndKeyDown: _cache[4] || (_cache[4] = ($event) => emits("endKeyDown", $event)),
				onHomeKeyDown: _cache[5] || (_cache[5] = ($event) => emits("homeKeyDown", $event))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["dir", "style"]);
		};
	}
});

//#endregion
//#region src/Slider/SliderHorizontal.vue
var SliderHorizontal_default = SliderHorizontal_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SliderHorizontal_default', {
  enumerable: true,
  get: function () {
    return SliderHorizontal_default;
  }
});
//# sourceMappingURL=SliderHorizontal.cjs.map