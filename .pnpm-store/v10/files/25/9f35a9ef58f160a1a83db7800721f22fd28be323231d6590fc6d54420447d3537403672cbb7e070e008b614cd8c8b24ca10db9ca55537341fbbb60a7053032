import { createContext } from "../shared/createContext.js";
import { areAllDaysBetweenValid, getDefaultDate, hasTime, isBefore, isBeforeOrSame } from "../date/comparators.js";
import { normalizeDateStep, normalizeHourCycle } from "../date/utils.js";
import { useDateFormatter } from "../shared/useDateFormatter.js";
import { useDirection } from "../shared/useDirection.js";
import { useKbd } from "../shared/useKbd.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { createContent, initializeSegmentValues, syncSegmentValues } from "../date/parser.js";
import { getSegmentElements, isSegmentNavigationKey } from "../date/segment.js";
import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx, withKeys } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/DateRangeField/DateRangeFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDateRangeFieldRootContext, provideDateRangeFieldRootContext] = createContext("DateRangeFieldRoot");
var DateRangeFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "DateRangeFieldRoot",
	props: {
		defaultValue: {
			type: Object,
			required: false,
			default: void 0
		},
		defaultPlaceholder: {
			type: null,
			required: false
		},
		placeholder: {
			type: null,
			required: false,
			default: void 0
		},
		modelValue: {
			type: [Object, null],
			required: false
		},
		hourCycle: {
			type: null,
			required: false
		},
		step: {
			type: Object,
			required: false
		},
		granularity: {
			type: String,
			required: false
		},
		hideTimeZone: {
			type: Boolean,
			required: false
		},
		maxValue: {
			type: null,
			required: false
		},
		minValue: {
			type: null,
			required: false
		},
		locale: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		readonly: {
			type: Boolean,
			required: false,
			default: false
		},
		isDateUnavailable: {
			type: Function,
			required: false,
			default: void 0
		},
		id: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
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
	emits: ["update:modelValue", "update:placeholder"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, isDateUnavailable: propsIsDateUnavailable, dir: propDir, locale: propLocale } = toRefs(props);
		const locale = useLocale(propLocale);
		const dir = useDirection(propDir);
		const formatter = useDateFormatter(locale.value, { hourCycle: normalizeHourCycle(props.hourCycle) });
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const segmentElements = ref(/* @__PURE__ */ new Set());
		onMounted(() => {
			getSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
		});
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? {
				start: void 0,
				end: void 0
			},
			passive: props.modelValue === void 0
		});
		const defaultDate = getDefaultDate({
			defaultPlaceholder: props.placeholder,
			granularity: props.granularity,
			defaultValue: modelValue.value?.start,
			locale: props.locale
		});
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		const step = computed(() => normalizeDateStep(props));
		const inferredGranularity = computed(() => {
			if (props.granularity) return !hasTime(placeholder.value) ? "day" : props.granularity;
			return hasTime(placeholder.value) ? "minute" : "day";
		});
		const isStartInvalid = computed(() => {
			if (!modelValue.value?.start) return false;
			if (propsIsDateUnavailable.value?.(modelValue.value.start)) return true;
			if (props.minValue && isBefore(modelValue.value.start, props.minValue)) return true;
			if (props.maxValue && isBefore(props.maxValue, modelValue.value.start)) return true;
			return false;
		});
		const isEndInvalid = computed(() => {
			if (!modelValue.value?.end) return false;
			if (propsIsDateUnavailable.value?.(modelValue.value.end)) return true;
			if (props.minValue && isBefore(modelValue.value.end, props.minValue)) return true;
			if (props.maxValue && isBefore(props.maxValue, modelValue.value.end)) return true;
			return false;
		});
		const isInvalid = computed(() => {
			if (isStartInvalid.value || isEndInvalid.value) return true;
			if (!modelValue.value?.start || !modelValue.value?.end) return false;
			if (!isBeforeOrSame(modelValue.value.start, modelValue.value.end)) return true;
			if (propsIsDateUnavailable.value !== void 0) {
				const allValid = areAllDaysBetweenValid(modelValue.value.start, modelValue.value.end, propsIsDateUnavailable.value, void 0);
				if (!allValid) return true;
			}
			return false;
		});
		const initialSegments = initializeSegmentValues(inferredGranularity.value);
		const startSegmentValues = ref(modelValue.value?.start ? { ...syncSegmentValues({
			value: modelValue.value.start,
			formatter
		}) } : { ...initialSegments });
		const endSegmentValues = ref(modelValue.value?.end ? { ...syncSegmentValues({
			value: modelValue.value.end,
			formatter
		}) } : { ...initialSegments });
		const startSegmentContent = computed(() => createContent({
			granularity: inferredGranularity.value,
			dateRef: placeholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: startSegmentValues.value,
			locale
		}));
		const endSegmentContent = computed(() => createContent({
			granularity: inferredGranularity.value,
			dateRef: placeholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: endSegmentValues.value,
			locale
		}));
		const segmentContents = computed(() => ({
			start: startSegmentContent.value.arr,
			end: endSegmentContent.value.arr
		}));
		const editableSegmentContents = computed(() => ({
			start: segmentContents.value.start.filter(({ part }) => part !== "literal"),
			end: segmentContents.value.end.filter(({ part }) => part !== "literal")
		}));
		const startValue = ref(modelValue.value?.start?.copy());
		const endValue = ref(modelValue.value?.end?.copy());
		watch([startValue, endValue], ([_startValue, _endValue]) => {
			modelValue.value = {
				start: _startValue?.copy(),
				end: _endValue?.copy()
			};
		});
		watch(modelValue, (_modelValue) => {
			const isStartChanged = _modelValue?.start && startValue.value ? _modelValue.start.compare(startValue.value) !== 0 : _modelValue?.start !== startValue.value;
			if (isStartChanged) startValue.value = _modelValue?.start?.copy();
			const isEndChanged = _modelValue?.end && endValue.value ? _modelValue.end.compare(endValue.value) !== 0 : _modelValue?.end !== endValue.value;
			if (isEndChanged) endValue.value = _modelValue?.end?.copy();
		});
		watch([startValue, locale], ([_startValue]) => {
			if (_startValue !== void 0) startSegmentValues.value = { ...syncSegmentValues({
				value: _startValue,
				formatter
			}) };
			else if (Object.values(startSegmentValues.value).every((value) => value !== null) && _startValue === void 0) startSegmentValues.value = { ...initialSegments };
		});
		watch(locale, (value) => {
			if (formatter.getLocale() !== value) {
				formatter.setLocale(value);
				nextTick(() => {
					segmentElements.value.clear();
					getSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
				});
			}
		});
		watch(modelValue, (_modelValue) => {
			if (_modelValue && _modelValue.start !== void 0 && placeholder.value.compare(_modelValue.start) !== 0) placeholder.value = _modelValue.start.copy();
		});
		watch([endValue, locale], ([_endValue]) => {
			if (_endValue !== void 0) endSegmentValues.value = { ...syncSegmentValues({
				value: _endValue,
				formatter
			}) };
			else if (Object.values(endSegmentValues.value).every((value) => value !== null) && _endValue === void 0) endSegmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = ref(null);
		const currentSegmentIndex = computed(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-date-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-date-field-segment") && el.getAttribute("data-reka-date-range-field-segment-type") === currentFocusedElement.value?.getAttribute("data-reka-date-range-field-segment-type")));
		const nextFocusableSegment = computed(() => {
			const sign = dir.value === "rtl" ? -1 : 1;
			const nextCondition = sign < 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1;
			if (nextCondition) return null;
			const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value + sign];
			return segmentToFocus;
		});
		const prevFocusableSegment = computed(() => {
			const sign = dir.value === "rtl" ? -1 : 1;
			const prevCondition = sign > 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1;
			if (prevCondition) return null;
			const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value - sign];
			return segmentToFocus;
		});
		const kbd = useKbd();
		function handleKeydown(e) {
			if (!isSegmentNavigationKey(e.key)) return;
			if (e.key === kbd.ARROW_LEFT) prevFocusableSegment.value?.focus();
			if (e.key === kbd.ARROW_RIGHT) nextFocusableSegment.value?.focus();
		}
		function setFocusedElement(el) {
			currentFocusedElement.value = el;
		}
		provideDateRangeFieldRootContext({
			isDateUnavailable: propsIsDateUnavailable.value,
			locale,
			startValue,
			endValue,
			placeholder,
			disabled,
			formatter,
			hourCycle: props.hourCycle,
			step,
			readonly,
			segmentValues: {
				start: startSegmentValues,
				end: endSegmentValues
			},
			isInvalid,
			segmentContents: editableSegmentContents,
			elements: segmentElements,
			setFocusedElement,
			focusNext() {
				nextFocusableSegment.value?.focus();
			}
		});
		__expose({ setFocusedElement });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(_ctx.$attrs, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				role: "group",
				"aria-disabled": unref(disabled) ? true : void 0,
				"data-disabled": unref(disabled) ? "" : void 0,
				"data-readonly": unref(readonly) ? "" : void 0,
				"data-invalid": isInvalid.value ? "" : void 0,
				dir: unref(dir),
				onKeydown: withKeys(handleKeydown, ["left", "right"])
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					modelValue: unref(modelValue),
					segments: segmentContents.value
				}), createVNode(unref(VisuallyHidden_default), {
					id: _ctx.id,
					as: "input",
					feature: "focusable",
					tabindex: "-1",
					value: `${unref(modelValue)?.start?.toString()} - ${unref(modelValue)?.end?.toString()}`,
					name: _ctx.name,
					disabled: unref(disabled),
					required: _ctx.required,
					onFocus: _cache[0] || (_cache[0] = ($event) => Array.from(segmentElements.value)?.[0]?.focus())
				}, null, 8, [
					"id",
					"value",
					"name",
					"disabled",
					"required"
				])]),
				_: 3
			}, 16, [
				"aria-disabled",
				"data-disabled",
				"data-readonly",
				"data-invalid",
				"dir"
			]);
		};
	}
});

//#endregion
//#region src/DateRangeField/DateRangeFieldRoot.vue
var DateRangeFieldRoot_default = DateRangeFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DateRangeFieldRoot_default, injectDateRangeFieldRootContext };
//# sourceMappingURL=DateRangeFieldRoot.js.map