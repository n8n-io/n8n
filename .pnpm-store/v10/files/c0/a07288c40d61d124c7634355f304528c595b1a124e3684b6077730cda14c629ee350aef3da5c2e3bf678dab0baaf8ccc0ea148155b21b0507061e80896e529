const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_clamp = require('../shared/clamp.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_Slider_utils = require('./utils.cjs');
const require_Slider_SliderHorizontal = require('./SliderHorizontal.cjs');
const require_Slider_SliderVertical = require('./SliderVertical.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Slider/SliderRoot.vue?vue&type=script&setup=true&lang.ts
const [injectSliderRootContext, provideSliderRootContext] = require_shared_createContext.createContext("SliderRoot");
var SliderRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "SliderRoot",
	props: {
		defaultValue: {
			type: Array,
			required: false,
			default: () => [0]
		},
		modelValue: {
			type: [Array, null],
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		dir: {
			type: String,
			required: false
		},
		inverted: {
			type: Boolean,
			required: false,
			default: false
		},
		min: {
			type: Number,
			required: false,
			default: 0
		},
		max: {
			type: Number,
			required: false,
			default: 100
		},
		step: {
			type: Number,
			required: false,
			default: 1
		},
		minStepsBetweenThumbs: {
			type: Number,
			required: false,
			default: 0
		},
		thumbAlignment: {
			type: String,
			required: false,
			default: "contain"
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: ["update:modelValue", "valueCommit"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { min, max, step, minStepsBetweenThumbs, orientation, disabled, thumbAlignment, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const { CollectionSlot } = require_Collection_Collection.useCollection({ isProvider: true });
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const currentModelValue = (0, vue.computed)(() => Array.isArray(modelValue.value) ? [...modelValue.value] : []);
		const valueIndexToChangeRef = (0, vue.ref)(0);
		const valuesBeforeSlideStartRef = (0, vue.ref)(currentModelValue.value);
		function handleSlideStart(value) {
			const closestIndex = require_Slider_utils.getClosestValueIndex(currentModelValue.value, value);
			updateValues(value, closestIndex);
		}
		function handleSlideMove(value) {
			updateValues(value, valueIndexToChangeRef.value);
		}
		function handleSlideEnd() {
			const prevValue = valuesBeforeSlideStartRef.value[valueIndexToChangeRef.value];
			const nextValue = currentModelValue.value[valueIndexToChangeRef.value];
			const hasChanged = nextValue !== prevValue;
			if (hasChanged) emits("valueCommit", (0, vue.toRaw)(currentModelValue.value));
		}
		function updateValues(value, atIndex, { commit } = { commit: false }) {
			const decimalCount = require_Slider_utils.getDecimalCount(step.value);
			const snapToStep = require_Slider_utils.roundValue(Math.round((value - min.value) / step.value) * step.value + min.value, decimalCount);
			const nextValue = require_shared_clamp.clamp(snapToStep, min.value, max.value);
			const nextValues = require_Slider_utils.getNextSortedValues(currentModelValue.value, nextValue, atIndex);
			if (require_Slider_utils.hasMinStepsBetweenValues(nextValues, minStepsBetweenThumbs.value * step.value)) {
				valueIndexToChangeRef.value = nextValues.indexOf(nextValue);
				const hasChanged = String(nextValues) !== String(modelValue.value);
				if (hasChanged && commit) emits("valueCommit", nextValues);
				if (hasChanged) {
					thumbElements.value[valueIndexToChangeRef.value]?.focus();
					modelValue.value = nextValues;
				}
			}
		}
		const thumbElements = (0, vue.ref)([]);
		provideSliderRootContext({
			modelValue,
			currentModelValue,
			valueIndexToChangeRef,
			thumbElements,
			orientation,
			min,
			max,
			disabled,
			thumbAlignment
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionSlot), null, {
				default: (0, vue.withCtx)(() => [((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(orientation) === "horizontal" ? require_Slider_SliderHorizontal.SliderHorizontal_default : require_Slider_SliderVertical.SliderVertical_default), (0, vue.mergeProps)(_ctx.$attrs, {
					ref: (0, vue.unref)(forwardRef),
					"as-child": _ctx.asChild,
					as: _ctx.as,
					min: (0, vue.unref)(min),
					max: (0, vue.unref)(max),
					dir: (0, vue.unref)(dir),
					inverted: _ctx.inverted,
					"aria-disabled": (0, vue.unref)(disabled),
					"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
					onPointerdown: _cache[0] || (_cache[0] = () => {
						if (!(0, vue.unref)(disabled)) valuesBeforeSlideStartRef.value = currentModelValue.value;
					}),
					onSlideStart: _cache[1] || (_cache[1] = ($event) => !(0, vue.unref)(disabled) && handleSlideStart($event)),
					onSlideMove: _cache[2] || (_cache[2] = ($event) => !(0, vue.unref)(disabled) && handleSlideMove($event)),
					onSlideEnd: _cache[3] || (_cache[3] = ($event) => !(0, vue.unref)(disabled) && handleSlideEnd()),
					onHomeKeyDown: _cache[4] || (_cache[4] = ($event) => !(0, vue.unref)(disabled) && updateValues((0, vue.unref)(min), 0, { commit: true })),
					onEndKeyDown: _cache[5] || (_cache[5] = ($event) => !(0, vue.unref)(disabled) && updateValues((0, vue.unref)(max), currentModelValue.value.length - 1, { commit: true })),
					onStepKeyDown: _cache[6] || (_cache[6] = (event, direction) => {
						if (!(0, vue.unref)(disabled)) {
							const isPageKey = (0, vue.unref)(require_Slider_utils.PAGE_KEYS).includes(event.key);
							const isSkipKey = isPageKey || event.shiftKey && (0, vue.unref)(require_Slider_utils.ARROW_KEYS).includes(event.key);
							const multiplier = isSkipKey ? 10 : 1;
							const atIndex = valueIndexToChangeRef.value;
							const value = currentModelValue.value[atIndex];
							const stepInDirection = (0, vue.unref)(step) * multiplier * direction;
							updateValues(value + stepInDirection, atIndex, { commit: true });
						}
					})
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) }), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
						key: 0,
						type: "number",
						value: (0, vue.unref)(modelValue),
						name: _ctx.name,
						required: _ctx.required,
						disabled: (0, vue.unref)(disabled),
						step: (0, vue.unref)(step)
					}, null, 8, [
						"value",
						"name",
						"required",
						"disabled",
						"step"
					])) : (0, vue.createCommentVNode)("v-if", true)]),
					_: 3
				}, 16, [
					"as-child",
					"as",
					"min",
					"max",
					"dir",
					"inverted",
					"aria-disabled",
					"data-disabled"
				]))]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Slider/SliderRoot.vue
var SliderRoot_default = SliderRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SliderRoot_default', {
  enumerable: true,
  get: function () {
    return SliderRoot_default;
  }
});
Object.defineProperty(exports, 'injectSliderRootContext', {
  enumerable: true,
  get: function () {
    return injectSliderRootContext;
  }
});
//# sourceMappingURL=SliderRoot.cjs.map