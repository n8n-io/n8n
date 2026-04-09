const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_nullish = require('../shared/nullish.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useDateFormatter = require('../shared/useDateFormatter.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const require_date_parser = require('../date/parser.cjs');
const require_date_segment = require('../date/segment.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/TimeRangeField/TimeRangeFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTimeRangeFieldRootContext, provideTimeRangeFieldRootContext] = require_shared_createContext.createContext("TimeRangeFieldRoot");
function convertValue(value, date = (0, __internationalized_date.today)((0, __internationalized_date.getLocalTimeZone)())) {
	if (value && "day" in value) return value;
	return (0, __internationalized_date.toCalendarDateTime)(date, value);
}
var TimeRangeFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { disabled, readonly, granularity, defaultValue, minValue, maxValue, dir: propDir, locale: propLocale, isTimeUnavailable: propsIsTimeUnavailable } = (0, vue.toRefs)(props);
		const locale = require_shared_useLocale.useLocale(propLocale);
		const dir = require_shared_useDirection.useDirection(propDir);
		const formatter = require_shared_useDateFormatter.useDateFormatter(locale.value, { hourCycle: require_date_utils.normalizeHourCycle(props.hourCycle) });
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const segmentElements = (0, vue.ref)(/* @__PURE__ */ new Set());
		const step = (0, vue.computed)(() => require_date_utils.normalizeDateStep(props));
		const convertedMinValue = (0, vue.computed)(() => minValue.value ? convertValue(minValue.value) : void 0);
		const convertedMaxValue = (0, vue.computed)(() => maxValue.value ? convertValue(maxValue.value) : void 0);
		(0, vue.onMounted)(() => {
			require_date_segment.getTimeFieldSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
		});
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: defaultValue.value ?? {
				start: void 0,
				end: void 0
			},
			passive: props.modelValue === void 0
		});
		const isStartInvalid = (0, vue.computed)(() => {
			if (!modelValue.value?.start) return false;
			const convertedStartValue$1 = convertValue(modelValue.value.start);
			if (propsIsTimeUnavailable.value?.(convertedStartValue$1)) return true;
			if (convertedMinValue.value && require_date_comparators.isBefore(convertedStartValue$1, convertedMinValue.value)) return true;
			if (convertedMaxValue.value && require_date_comparators.isBefore(convertedMaxValue.value, convertedStartValue$1)) return true;
			return false;
		});
		const isEndInvalid = (0, vue.computed)(() => {
			if (!modelValue.value?.end) return false;
			const convertedEndValue$1 = convertValue(modelValue.value.end);
			if (propsIsTimeUnavailable.value?.(convertedEndValue$1)) return true;
			if (convertedMinValue.value && require_date_comparators.isBefore(convertedEndValue$1, convertedMinValue.value)) return true;
			if (convertedMaxValue.value && require_date_comparators.isBefore(convertedMaxValue.value, convertedEndValue$1)) return true;
			return false;
		});
		const isInvalid = (0, vue.computed)(() => {
			if (isStartInvalid.value || isEndInvalid.value) return true;
			if (!modelValue.value?.start || !modelValue.value?.end) return false;
			const convertedModelValue$1 = {
				start: convertValue(modelValue.value.start),
				end: convertValue(modelValue.value.end)
			};
			if (!require_date_comparators.isBeforeOrSame(convertedModelValue$1.start, convertedModelValue$1.end)) return true;
			if (propsIsTimeUnavailable.value !== void 0) {
				const allValid = require_date_comparators.areAllDaysBetweenValid(convertedModelValue$1.start, convertedModelValue$1.end, propsIsTimeUnavailable.value, void 0);
				if (!allValid) return true;
			}
			return false;
		});
		const startValue = (0, vue.ref)(modelValue.value?.start?.copy());
		const endValue = (0, vue.ref)(modelValue.value?.end?.copy());
		(0, vue.watch)([startValue, endValue], ([_startValue, _endValue]) => {
			modelValue.value = {
				start: _startValue?.copy(),
				end: _endValue?.copy()
			};
		});
		const convertedStartValue = (0, vue.computed)({
			get() {
				if (require_shared_nullish.isNullish(startValue.value)) return startValue.value;
				return convertValue(startValue.value);
			},
			set(newValue) {
				if (newValue) startValue.value = startValue.value && "day" in startValue.value ? newValue : new __internationalized_date.Time(newValue.hour, newValue.minute, newValue.second, startValue.value?.millisecond);
				else startValue.value = newValue;
				return newValue;
			}
		});
		const convertedEndValue = (0, vue.computed)({
			get() {
				if (require_shared_nullish.isNullish(endValue.value)) return endValue.value;
				return convertValue(endValue.value);
			},
			set(newValue) {
				if (newValue) endValue.value = endValue.value && "day" in endValue.value ? newValue : new __internationalized_date.Time(newValue.hour, newValue.minute, newValue.second, endValue.value?.millisecond);
				else endValue.value = newValue;
				return newValue;
			}
		});
		const convertedModelValue = (0, vue.computed)(() => ({
			start: convertedStartValue.value,
			end: convertedEndValue.value
		}));
		const defaultDate = require_date_comparators.getDefaultTime({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value?.start
		});
		const placeholder = (0, __vueuse_core.useVModel)(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		const convertedPlaceholder = (0, vue.computed)({
			get() {
				return convertValue(placeholder.value);
			},
			set(newValue) {
				if (newValue) placeholder.value = "day" in placeholder.value ? newValue.copy() : new __internationalized_date.Time(newValue.hour, newValue.minute, newValue.second, placeholder.value?.millisecond);
				return newValue;
			}
		});
		const inferredGranularity = (0, vue.computed)(() => {
			if (granularity.value) return granularity.value;
			return "minute";
		});
		const initialSegments = require_date_parser.initializeTimeSegmentValues(inferredGranularity.value);
		const startSegmentValues = (0, vue.ref)(convertedStartValue.value ? { ...require_date_parser.syncTimeSegmentValues({
			value: convertedStartValue.value,
			formatter
		}) } : { ...initialSegments });
		const endSegmentValues = (0, vue.ref)(convertedEndValue.value ? { ...require_date_parser.syncTimeSegmentValues({
			value: convertedEndValue.value,
			formatter
		}) } : { ...initialSegments });
		const startSegmentContent = (0, vue.computed)(() => require_date_parser.createContent({
			granularity: inferredGranularity.value,
			dateRef: convertedPlaceholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: startSegmentValues.value,
			locale,
			isTimeValue: true
		}));
		const endSegmentContent = (0, vue.computed)(() => require_date_parser.createContent({
			granularity: inferredGranularity.value,
			dateRef: convertedPlaceholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: endSegmentValues.value,
			locale,
			isTimeValue: true
		}));
		const segmentContents = (0, vue.computed)(() => ({
			start: startSegmentContent.value.arr,
			end: endSegmentContent.value.arr
		}));
		const editableSegmentContents = (0, vue.computed)(() => ({
			start: segmentContents.value.start.filter(({ part }) => part !== "literal"),
			end: segmentContents.value.end.filter(({ part }) => part !== "literal")
		}));
		(0, vue.watch)(convertedModelValue, (_modelValue) => {
			const isStartChanged = _modelValue?.start && convertedStartValue.value ? _modelValue.start.compare(convertedStartValue.value) !== 0 : _modelValue?.start !== convertedStartValue.value;
			if (isStartChanged) convertedStartValue.value = _modelValue?.start?.copy();
			const isEndChanged = _modelValue?.end && convertedEndValue.value ? _modelValue.end.compare(convertedEndValue.value) !== 0 : _modelValue?.end !== convertedEndValue.value;
			if (isEndChanged) convertedEndValue.value = _modelValue?.end?.copy();
		});
		(0, vue.watch)([convertedStartValue, locale], ([_startValue]) => {
			if (_startValue !== void 0) startSegmentValues.value = { ...require_date_parser.syncSegmentValues({
				value: _startValue,
				formatter
			}) };
			else if (Object.values(startSegmentValues.value).every((value) => value !== null) && _startValue === void 0) startSegmentValues.value = { ...initialSegments };
		});
		(0, vue.watch)(locale, (value) => {
			if (formatter.getLocale() !== value) {
				formatter.setLocale(value);
				(0, vue.nextTick)(() => {
					segmentElements.value.clear();
					require_date_segment.getTimeFieldSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
				});
			}
		});
		(0, vue.watch)(convertedModelValue, (_modelValue) => {
			if (_modelValue && _modelValue.start !== void 0 && placeholder.value.compare(_modelValue.start) !== 0) placeholder.value = _modelValue.start.copy();
		});
		(0, vue.watch)([convertedEndValue, locale], ([_endValue]) => {
			if (_endValue !== void 0) endSegmentValues.value = { ...require_date_parser.syncSegmentValues({
				value: _endValue,
				formatter
			}) };
			else if (Object.values(endSegmentValues.value).every((value) => value !== null) && _endValue === void 0) endSegmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = (0, vue.ref)(null);
		const currentSegmentIndex = (0, vue.computed)(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-time-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-time-field-segment") && el.getAttribute("data-reka-time-range-field-segment-type") === currentFocusedElement.value?.getAttribute("data-reka-time-range-field-segment-type")));
		const nextFocusableSegment = (0, vue.computed)(() => {
			const sign = dir.value === "rtl" ? -1 : 1;
			const nextCondition = sign < 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1;
			if (nextCondition) return null;
			const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value + sign];
			return segmentToFocus;
		});
		const prevFocusableSegment = (0, vue.computed)(() => {
			const sign = dir.value === "rtl" ? -1 : 1;
			const prevCondition = sign > 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1;
			if (prevCondition) return null;
			const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value - sign];
			return segmentToFocus;
		});
		const kbd = require_shared_useKbd.useKbd();
		function handleKeydown(e) {
			if (!require_date_segment.isSegmentNavigationKey(e.key)) return;
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				role: "group",
				"aria-disabled": (0, vue.unref)(disabled) ? true : void 0,
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				"data-readonly": (0, vue.unref)(readonly) ? "" : void 0,
				"data-invalid": isInvalid.value ? "" : void 0,
				dir: (0, vue.unref)(dir),
				onKeydown: (0, vue.withKeys)(handleKeydown, ["left", "right"])
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					segments: segmentContents.value,
					isInvalid: isInvalid.value
				}), (0, vue.createVNode)((0, vue.unref)(require_VisuallyHidden_VisuallyHidden.VisuallyHidden_default), {
					id: _ctx.id,
					as: "input",
					feature: "focusable",
					tabindex: "-1",
					value: `${(0, vue.unref)(modelValue)?.start?.toString()} - ${(0, vue.unref)(modelValue)?.end?.toString()}`,
					name: _ctx.name,
					disabled: (0, vue.unref)(disabled),
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
Object.defineProperty(exports, 'TimeRangeFieldRoot_default', {
  enumerable: true,
  get: function () {
    return TimeRangeFieldRoot_default;
  }
});
Object.defineProperty(exports, 'injectTimeRangeFieldRootContext', {
  enumerable: true,
  get: function () {
    return injectTimeRangeFieldRootContext;
  }
});
//# sourceMappingURL=TimeRangeFieldRoot.cjs.map