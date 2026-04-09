import { createContext } from "../shared/createContext.js";
import { isNullish } from "../shared/nullish.js";
import { areAllDaysBetweenValid, getDefaultTime, isBefore, isBeforeOrSame } from "../date/comparators.js";
import { normalizeDateStep, normalizeHourCycle } from "../date/utils.js";
import { useDateFormatter } from "../shared/useDateFormatter.js";
import { useDirection } from "../shared/useDirection.js";
import { useKbd } from "../shared/useKbd.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { createContent, initializeTimeSegmentValues, syncSegmentValues, syncTimeSegmentValues } from "../date/parser.js";
import { getTimeFieldSegmentElements, isSegmentNavigationKey } from "../date/segment.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx, withKeys } from "vue";
import { useVModel } from "@vueuse/core";
import { Time, getLocalTimeZone, toCalendarDateTime, today } from "@internationalized/date";

//#region src/TimeRangeField/TimeRangeFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTimeRangeFieldRootContext, provideTimeRangeFieldRootContext] = createContext("TimeRangeFieldRoot");
function convertValue(value, date = today(getLocalTimeZone())) {
	if (value && "day" in value) return value;
	return toCalendarDateTime(date, value);
}
var TimeRangeFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "TimeRangeFieldRoot",
	props: {
		defaultValue: {
			type: Object,
			required: false,
			default: void 0
		},
		defaultPlaceholder: {
			type: Object,
			required: false
		},
		placeholder: {
			type: Object,
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
			type: Object,
			required: false
		},
		minValue: {
			type: Object,
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
		id: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		isTimeUnavailable: {
			type: Function,
			required: false,
			default: void 0
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
		const { disabled, readonly, granularity, defaultValue, minValue, maxValue, dir: propDir, locale: propLocale, isTimeUnavailable: propsIsTimeUnavailable } = toRefs(props);
		const locale = useLocale(propLocale);
		const dir = useDirection(propDir);
		const formatter = useDateFormatter(locale.value, { hourCycle: normalizeHourCycle(props.hourCycle) });
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const segmentElements = ref(/* @__PURE__ */ new Set());
		const step = computed(() => normalizeDateStep(props));
		const convertedMinValue = computed(() => minValue.value ? convertValue(minValue.value) : void 0);
		const convertedMaxValue = computed(() => maxValue.value ? convertValue(maxValue.value) : void 0);
		onMounted(() => {
			getTimeFieldSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
		});
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: defaultValue.value ?? {
				start: void 0,
				end: void 0
			},
			passive: props.modelValue === void 0
		});
		const isStartInvalid = computed(() => {
			if (!modelValue.value?.start) return false;
			const convertedStartValue$1 = convertValue(modelValue.value.start);
			if (propsIsTimeUnavailable.value?.(convertedStartValue$1)) return true;
			if (convertedMinValue.value && isBefore(convertedStartValue$1, convertedMinValue.value)) return true;
			if (convertedMaxValue.value && isBefore(convertedMaxValue.value, convertedStartValue$1)) return true;
			return false;
		});
		const isEndInvalid = computed(() => {
			if (!modelValue.value?.end) return false;
			const convertedEndValue$1 = convertValue(modelValue.value.end);
			if (propsIsTimeUnavailable.value?.(convertedEndValue$1)) return true;
			if (convertedMinValue.value && isBefore(convertedEndValue$1, convertedMinValue.value)) return true;
			if (convertedMaxValue.value && isBefore(convertedMaxValue.value, convertedEndValue$1)) return true;
			return false;
		});
		const isInvalid = computed(() => {
			if (isStartInvalid.value || isEndInvalid.value) return true;
			if (!modelValue.value?.start || !modelValue.value?.end) return false;
			const convertedModelValue$1 = {
				start: convertValue(modelValue.value.start),
				end: convertValue(modelValue.value.end)
			};
			if (!isBeforeOrSame(convertedModelValue$1.start, convertedModelValue$1.end)) return true;
			if (propsIsTimeUnavailable.value !== void 0) {
				const allValid = areAllDaysBetweenValid(convertedModelValue$1.start, convertedModelValue$1.end, propsIsTimeUnavailable.value, void 0);
				if (!allValid) return true;
			}
			return false;
		});
		const startValue = ref(modelValue.value?.start?.copy());
		const endValue = ref(modelValue.value?.end?.copy());
		watch([startValue, endValue], ([_startValue, _endValue]) => {
			modelValue.value = {
				start: _startValue?.copy(),
				end: _endValue?.copy()
			};
		});
		const convertedStartValue = computed({
			get() {
				if (isNullish(startValue.value)) return startValue.value;
				return convertValue(startValue.value);
			},
			set(newValue) {
				if (newValue) startValue.value = startValue.value && "day" in startValue.value ? newValue : new Time(newValue.hour, newValue.minute, newValue.second, startValue.value?.millisecond);
				else startValue.value = newValue;
				return newValue;
			}
		});
		const convertedEndValue = computed({
			get() {
				if (isNullish(endValue.value)) return endValue.value;
				return convertValue(endValue.value);
			},
			set(newValue) {
				if (newValue) endValue.value = endValue.value && "day" in endValue.value ? newValue : new Time(newValue.hour, newValue.minute, newValue.second, endValue.value?.millisecond);
				else endValue.value = newValue;
				return newValue;
			}
		});
		const convertedModelValue = computed(() => ({
			start: convertedStartValue.value,
			end: convertedEndValue.value
		}));
		const defaultDate = getDefaultTime({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value?.start
		});
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		const convertedPlaceholder = computed({
			get() {
				return convertValue(placeholder.value);
			},
			set(newValue) {
				if (newValue) placeholder.value = "day" in placeholder.value ? newValue.copy() : new Time(newValue.hour, newValue.minute, newValue.second, placeholder.value?.millisecond);
				return newValue;
			}
		});
		const inferredGranularity = computed(() => {
			if (granularity.value) return granularity.value;
			return "minute";
		});
		const initialSegments = initializeTimeSegmentValues(inferredGranularity.value);
		const startSegmentValues = ref(convertedStartValue.value ? { ...syncTimeSegmentValues({
			value: convertedStartValue.value,
			formatter
		}) } : { ...initialSegments });
		const endSegmentValues = ref(convertedEndValue.value ? { ...syncTimeSegmentValues({
			value: convertedEndValue.value,
			formatter
		}) } : { ...initialSegments });
		const startSegmentContent = computed(() => createContent({
			granularity: inferredGranularity.value,
			dateRef: convertedPlaceholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: startSegmentValues.value,
			locale,
			isTimeValue: true
		}));
		const endSegmentContent = computed(() => createContent({
			granularity: inferredGranularity.value,
			dateRef: convertedPlaceholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: endSegmentValues.value,
			locale,
			isTimeValue: true
		}));
		const segmentContents = computed(() => ({
			start: startSegmentContent.value.arr,
			end: endSegmentContent.value.arr
		}));
		const editableSegmentContents = computed(() => ({
			start: segmentContents.value.start.filter(({ part }) => part !== "literal"),
			end: segmentContents.value.end.filter(({ part }) => part !== "literal")
		}));
		watch(convertedModelValue, (_modelValue) => {
			const isStartChanged = _modelValue?.start && convertedStartValue.value ? _modelValue.start.compare(convertedStartValue.value) !== 0 : _modelValue?.start !== convertedStartValue.value;
			if (isStartChanged) convertedStartValue.value = _modelValue?.start?.copy();
			const isEndChanged = _modelValue?.end && convertedEndValue.value ? _modelValue.end.compare(convertedEndValue.value) !== 0 : _modelValue?.end !== convertedEndValue.value;
			if (isEndChanged) convertedEndValue.value = _modelValue?.end?.copy();
		});
		watch([convertedStartValue, locale], ([_startValue]) => {
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
					getTimeFieldSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
				});
			}
		});
		watch(convertedModelValue, (_modelValue) => {
			if (_modelValue && _modelValue.start !== void 0 && placeholder.value.compare(_modelValue.start) !== 0) placeholder.value = _modelValue.start.copy();
		});
		watch([convertedEndValue, locale], ([_endValue]) => {
			if (_endValue !== void 0) endSegmentValues.value = { ...syncSegmentValues({
				value: _endValue,
				formatter
			}) };
			else if (Object.values(endSegmentValues.value).every((value) => value !== null) && _endValue === void 0) endSegmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = ref(null);
		const currentSegmentIndex = computed(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-time-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-time-field-segment") && el.getAttribute("data-reka-time-range-field-segment-type") === currentFocusedElement.value?.getAttribute("data-reka-time-range-field-segment-type")));
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
		provideTimeRangeFieldRootContext({
			locale,
			startValue: convertedStartValue,
			endValue: convertedEndValue,
			placeholder: convertedPlaceholder,
			disabled,
			formatter,
			hourCycle: props.hourCycle,
			step,
			readonly,
			isInvalid,
			segmentValues: {
				start: startSegmentValues,
				end: endSegmentValues
			},
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
					segments: segmentContents.value,
					isInvalid: isInvalid.value
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
//#region src/TimeRangeField/TimeRangeFieldRoot.vue
var TimeRangeFieldRoot_default = TimeRangeFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TimeRangeFieldRoot_default, injectTimeRangeFieldRootContext };
//# sourceMappingURL=TimeRangeFieldRoot.js.map