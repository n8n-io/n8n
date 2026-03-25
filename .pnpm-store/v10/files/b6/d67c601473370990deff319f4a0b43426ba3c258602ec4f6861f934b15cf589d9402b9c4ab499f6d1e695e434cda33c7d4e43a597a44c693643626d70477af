const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useDateFormatter = require('../shared/useDateFormatter.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_date_parser = require('../date/parser.cjs');
const require_date_segment = require('../date/segment.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/DateRangeField/DateRangeFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDateRangeFieldRootContext, provideDateRangeFieldRootContext] = require_shared_createContext.createContext("DateRangeFieldRoot");
var DateRangeFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { disabled, readonly, isDateUnavailable: propsIsDateUnavailable, dir: propDir, locale: propLocale } = (0, vue.toRefs)(props);
		const locale = require_shared_useLocale.useLocale(propLocale);
		const dir = require_shared_useDirection.useDirection(propDir);
		const formatter = require_shared_useDateFormatter.useDateFormatter(locale.value, { hourCycle: require_date_utils.normalizeHourCycle(props.hourCycle) });
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const segmentElements = (0, vue.ref)(/* @__PURE__ */ new Set());
		(0, vue.onMounted)(() => {
			require_date_segment.getSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
		});
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? {
				start: void 0,
				end: void 0
			},
			passive: props.modelValue === void 0
		});
		const defaultDate = require_date_comparators.getDefaultDate({
			defaultPlaceholder: props.placeholder,
			granularity: props.granularity,
			defaultValue: modelValue.value?.start,
			locale: props.locale
		});
		const placeholder = (0, __vueuse_core.useVModel)(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		const step = (0, vue.computed)(() => require_date_utils.normalizeDateStep(props));
		const inferredGranularity = (0, vue.computed)(() => {
			if (props.granularity) return !require_date_comparators.hasTime(placeholder.value) ? "day" : props.granularity;
			return require_date_comparators.hasTime(placeholder.value) ? "minute" : "day";
		});
		const isStartInvalid = (0, vue.computed)(() => {
			if (!modelValue.value?.start) return false;
			if (propsIsDateUnavailable.value?.(modelValue.value.start)) return true;
			if (props.minValue && require_date_comparators.isBefore(modelValue.value.start, props.minValue)) return true;
			if (props.maxValue && require_date_comparators.isBefore(props.maxValue, modelValue.value.start)) return true;
			return false;
		});
		const isEndInvalid = (0, vue.computed)(() => {
			if (!modelValue.value?.end) return false;
			if (propsIsDateUnavailable.value?.(modelValue.value.end)) return true;
			if (props.minValue && require_date_comparators.isBefore(modelValue.value.end, props.minValue)) return true;
			if (props.maxValue && require_date_comparators.isBefore(props.maxValue, modelValue.value.end)) return true;
			return false;
		});
		const isInvalid = (0, vue.computed)(() => {
			if (isStartInvalid.value || isEndInvalid.value) return true;
			if (!modelValue.value?.start || !modelValue.value?.end) return false;
			if (!require_date_comparators.isBeforeOrSame(modelValue.value.start, modelValue.value.end)) return true;
			if (propsIsDateUnavailable.value !== void 0) {
				const allValid = require_date_comparators.areAllDaysBetweenValid(modelValue.value.start, modelValue.value.end, propsIsDateUnavailable.value, void 0);
				if (!allValid) return true;
			}
			return false;
		});
		const initialSegments = require_date_parser.initializeSegmentValues(inferredGranularity.value);
		const startSegmentValues = (0, vue.ref)(modelValue.value?.start ? { ...require_date_parser.syncSegmentValues({
			value: modelValue.value.start,
			formatter
		}) } : { ...initialSegments });
		const endSegmentValues = (0, vue.ref)(modelValue.value?.end ? { ...require_date_parser.syncSegmentValues({
			value: modelValue.value.end,
			formatter
		}) } : { ...initialSegments });
		const startSegmentContent = (0, vue.computed)(() => require_date_parser.createContent({
			granularity: inferredGranularity.value,
			dateRef: placeholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: startSegmentValues.value,
			locale
		}));
		const endSegmentContent = (0, vue.computed)(() => require_date_parser.createContent({
			granularity: inferredGranularity.value,
			dateRef: placeholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: endSegmentValues.value,
			locale
		}));
		const segmentContents = (0, vue.computed)(() => ({
			start: startSegmentContent.value.arr,
			end: endSegmentContent.value.arr
		}));
		const editableSegmentContents = (0, vue.computed)(() => ({
			start: segmentContents.value.start.filter(({ part }) => part !== "literal"),
			end: segmentContents.value.end.filter(({ part }) => part !== "literal")
		}));
		const startValue = (0, vue.ref)(modelValue.value?.start?.copy());
		const endValue = (0, vue.ref)(modelValue.value?.end?.copy());
		(0, vue.watch)([startValue, endValue], ([_startValue, _endValue]) => {
			modelValue.value = {
				start: _startValue?.copy(),
				end: _endValue?.copy()
			};
		});
		(0, vue.watch)(modelValue, (_modelValue) => {
			const isStartChanged = _modelValue?.start && startValue.value ? _modelValue.start.compare(startValue.value) !== 0 : _modelValue?.start !== startValue.value;
			if (isStartChanged) startValue.value = _modelValue?.start?.copy();
			const isEndChanged = _modelValue?.end && endValue.value ? _modelValue.end.compare(endValue.value) !== 0 : _modelValue?.end !== endValue.value;
			if (isEndChanged) endValue.value = _modelValue?.end?.copy();
		});
		(0, vue.watch)([startValue, locale], ([_startValue]) => {
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
					require_date_segment.getSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
				});
			}
		});
		(0, vue.watch)(modelValue, (_modelValue) => {
			if (_modelValue && _modelValue.start !== void 0 && placeholder.value.compare(_modelValue.start) !== 0) placeholder.value = _modelValue.start.copy();
		});
		(0, vue.watch)([endValue, locale], ([_endValue]) => {
			if (_endValue !== void 0) endSegmentValues.value = { ...require_date_parser.syncSegmentValues({
				value: _endValue,
				formatter
			}) };
			else if (Object.values(endSegmentValues.value).every((value) => value !== null) && _endValue === void 0) endSegmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = (0, vue.ref)(null);
		const currentSegmentIndex = (0, vue.computed)(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-date-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-date-field-segment") && el.getAttribute("data-reka-date-range-field-segment-type") === currentFocusedElement.value?.getAttribute("data-reka-date-range-field-segment-type")));
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
					segments: segmentContents.value
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
//#region src/DateRangeField/DateRangeFieldRoot.vue
var DateRangeFieldRoot_default = DateRangeFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DateRangeFieldRoot_default', {
  enumerable: true,
  get: function () {
    return DateRangeFieldRoot_default;
  }
});
Object.defineProperty(exports, 'injectDateRangeFieldRootContext', {
  enumerable: true,
  get: function () {
    return injectDateRangeFieldRootContext;
  }
});
//# sourceMappingURL=DateRangeFieldRoot.cjs.map