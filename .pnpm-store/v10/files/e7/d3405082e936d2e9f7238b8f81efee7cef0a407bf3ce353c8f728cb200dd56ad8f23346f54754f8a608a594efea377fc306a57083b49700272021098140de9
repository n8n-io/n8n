import { clamp } from "../shared/clamp.js";
import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useCollection } from "../Collection/Collection.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { ARROW_KEYS, PAGE_KEYS, getClosestValueIndex, getDecimalCount, getNextSortedValues, hasMinStepsBetweenValues, roundValue } from "./utils.js";
import { SliderHorizontal_default } from "./SliderHorizontal.js";
import { SliderVertical_default } from "./SliderVertical.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, resolveDynamicComponent, toRaw, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Slider/SliderRoot.vue?vue&type=script&setup=true&lang.ts
const [injectSliderRootContext, provideSliderRootContext] = createContext("SliderRoot");
var SliderRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { min, max, step, minStepsBetweenThumbs, orientation, disabled, thumbAlignment, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const { forwardRef, currentElement } = useForwardExpose();
		const isFormControl = useFormControl(currentElement);
		const { CollectionSlot } = useCollection({ isProvider: true });
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const currentModelValue = computed(() => Array.isArray(modelValue.value) ? [...modelValue.value] : []);
		const valueIndexToChangeRef = ref(0);
		const valuesBeforeSlideStartRef = ref(currentModelValue.value);
		function handleSlideStart(value) {
			const closestIndex = getClosestValueIndex(currentModelValue.value, value);
			updateValues(value, closestIndex);
		}
		function handleSlideMove(value) {
			updateValues(value, valueIndexToChangeRef.value);
		}
		function handleSlideEnd() {
			const prevValue = valuesBeforeSlideStartRef.value[valueIndexToChangeRef.value];
			const nextValue = currentModelValue.value[valueIndexToChangeRef.value];
			const hasChanged = nextValue !== prevValue;
			if (hasChanged) emits("valueCommit", toRaw(currentModelValue.value));
		}
		function updateValues(value, atIndex, { commit } = { commit: false }) {
			const decimalCount = getDecimalCount(step.value);
			const snapToStep = roundValue(Math.round((value - min.value) / step.value) * step.value + min.value, decimalCount);
			const nextValue = clamp(snapToStep, min.value, max.value);
			const nextValues = getNextSortedValues(currentModelValue.value, nextValue, atIndex);
			if (hasMinStepsBetweenValues(nextValues, minStepsBetweenThumbs.value * step.value)) {
				valueIndexToChangeRef.value = nextValues.indexOf(nextValue);
				const hasChanged = String(nextValues) !== String(modelValue.value);
				if (hasChanged && commit) emits("valueCommit", nextValues);
				if (hasChanged) {
					thumbElements.value[valueIndexToChangeRef.value]?.focus();
					modelValue.value = nextValues;
				}
			}
		}
		const thumbElements = ref([]);
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
			return openBlock(), createBlock(unref(CollectionSlot), null, {
				default: withCtx(() => [(openBlock(), createBlock(resolveDynamicComponent(unref(orientation) === "horizontal" ? SliderHorizontal_default : SliderVertical_default), mergeProps(_ctx.$attrs, {
					ref: unref(forwardRef),
					"as-child": _ctx.asChild,
					as: _ctx.as,
					min: unref(min),
					max: unref(max),
					dir: unref(dir),
					inverted: _ctx.inverted,
					"aria-disabled": unref(disabled),
					"data-disabled": unref(disabled) ? "" : void 0,
					onPointerdown: _cache[0] || (_cache[0] = () => {
						if (!unref(disabled)) valuesBeforeSlideStartRef.value = currentModelValue.value;
					}),
					onSlideStart: _cache[1] || (_cache[1] = ($event) => !unref(disabled) && handleSlideStart($event)),
					onSlideMove: _cache[2] || (_cache[2] = ($event) => !unref(disabled) && handleSlideMove($event)),
					onSlideEnd: _cache[3] || (_cache[3] = ($event) => !unref(disabled) && handleSlideEnd()),
					onHomeKeyDown: _cache[4] || (_cache[4] = ($event) => !unref(disabled) && updateValues(unref(min), 0, { commit: true })),
					onEndKeyDown: _cache[5] || (_cache[5] = ($event) => !unref(disabled) && updateValues(unref(max), currentModelValue.value.length - 1, { commit: true })),
					onStepKeyDown: _cache[6] || (_cache[6] = (event, direction) => {
						if (!unref(disabled)) {
							const isPageKey = unref(PAGE_KEYS).includes(event.key);
							const isSkipKey = isPageKey || event.shiftKey && unref(ARROW_KEYS).includes(event.key);
							const multiplier = isSkipKey ? 10 : 1;
							const atIndex = valueIndexToChangeRef.value;
							const value = currentModelValue.value[atIndex];
							const stepInDirection = unref(step) * multiplier * direction;
							updateValues(value + stepInDirection, atIndex, { commit: true });
						}
					})
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) }), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
						key: 0,
						type: "number",
						value: unref(modelValue),
						name: _ctx.name,
						required: _ctx.required,
						disabled: unref(disabled),
						step: unref(step)
					}, null, 8, [
						"value",
						"name",
						"required",
						"disabled",
						"step"
					])) : createCommentVNode("v-if", true)]),
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
export { SliderRoot_default, injectSliderRootContext };
//# sourceMappingURL=SliderRoot.js.map