const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Slider_utils = require('./utils.cjs');
const require_Slider_SliderRoot = require('./SliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Slider/SliderImpl.vue?vue&type=script&setup=true&lang.ts
var SliderImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Slider_SliderRoot.injectSliderRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({ "data-slider-impl": "" }, props, {
				onKeydown: _cache[0] || (_cache[0] = (event) => {
					if (event.key === "Home") {
						emits("homeKeyDown", event);
						event.preventDefault();
					} else if (event.key === "End") {
						emits("endKeyDown", event);
						event.preventDefault();
					} else if ((0, vue.unref)(require_Slider_utils.PAGE_KEYS).concat((0, vue.unref)(require_Slider_utils.ARROW_KEYS)).includes(event.key)) {
						emits("stepKeyDown", event);
						event.preventDefault();
					}
				}),
				onPointerdown: _cache[1] || (_cache[1] = (event) => {
					const target = event.target;
					target.setPointerCapture(event.pointerId);
					event.preventDefault();
					if ((0, vue.unref)(rootContext).thumbElements.value.includes(target)) target.focus();
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
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Slider/SliderImpl.vue
var SliderImpl_default = SliderImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SliderImpl_default', {
  enumerable: true,
  get: function () {
    return SliderImpl_default;
  }
});
//# sourceMappingURL=SliderImpl.cjs.map