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
const require_date_parser = require('../date/parser.cjs');
const require_date_segment = require('../date/segment.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/TimeField/TimeFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTimeFieldRootContext, provideTimeFieldRootContext] = require_shared_createContext.createContext("TimeFieldRoot");
function convertValue(value, date = (0, __internationalized_date.today)((0, __internationalized_date.getLocalTimeZone)())) {
	if (value && "day" in value) return value;
	return (0, __internationalized_date.toCalendarDateTime)(date, value);
}
var TimeFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "TimeFieldRoot",
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
		const { disabled, readonly, granularity, defaultValue, minValue, maxValue, dir: propDir, locale: propLocale } = (0, vue.toRefs)(props);
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
			defaultValue: defaultValue.value,
			passive: props.modelValue === void 0
		});
		const convertedModelValue = (0, vue.computed)({
			get() {
				if (require_shared_nullish.isNullish(modelValue.value)) return modelValue.value;
				return convertValue(modelValue.value);
			},
			set(newValue) {
				if (newValue) modelValue.value = modelValue.value && "day" in modelValue.value ? newValue : new __internationalized_date.Time(newValue.hour, newValue.minute, newValue.second, modelValue.value?.millisecond);
				else modelValue.value = newValue;
				return newValue;
			}
		});
		const defaultDate = require_date_comparators.getDefaultTime({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value
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
		const isInvalid = (0, vue.computed)(() => {
			if (!modelValue.value) return false;
			if (convertedMinValue.value && require_date_comparators.isBefore(convertedModelValue.value, convertedMinValue.value)) return true;
			if (convertedMaxValue.value && require_date_comparators.isBefore(convertedMaxValue.value, convertedModelValue.value)) return true;
			return false;
		});
		const initialSegments = require_date_parser.initializeTimeSegmentValues(inferredGranularity.value);
		const segmentValues = (0, vue.ref)(modelValue.value ? { ...require_date_parser.syncTimeSegmentValues({
			value: convertedModelValue.value,
			formatter
		}) } : { ...initialSegments });
		const allSegmentContent = (0, vue.computed)(() => require_date_parser.createContent({
			granularity: inferredGranularity.value,
			dateRef: convertedPlaceholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: segmentValues.value,
			locale,
			isTimeValue: true
		}));
		const segmentContents = (0, vue.computed)(() => allSegmentContent.value.arr);
		const editableSegmentContents = (0, vue.computed)(() => segmentContents.value.filter(({ part }) => part !== "literal"));
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
			if (!require_shared_nullish.isNullish(_modelValue) && (!(0, __internationalized_date.isEqualDay)(convertedPlaceholder.value, _modelValue) || convertedPlaceholder.value.compare(_modelValue) !== 0)) placeholder.value = _modelValue.copy();
		});
		(0, vue.watch)([convertedModelValue, locale], ([_modelValue]) => {
			if (!require_shared_nullish.isNullish(_modelValue)) segmentValues.value = { ...require_date_parser.syncTimeSegmentValues({
				value: _modelValue,
				formatter
			}) };
			else if (Object.values(segmentValues.value).every((value) => value !== null) && require_shared_nullish.isNullish(_modelValue)) segmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = (0, vue.ref)(null);
		const currentSegmentIndex = (0, vue.computed)(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-time-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-time-field-segment")));
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
		provideTimeFieldRootContext({
			locale,
			modelValue: convertedModelValue,
			placeholder: convertedPlaceholder,
			disabled,
			formatter,
			hourCycle: props.hourCycle,
			step,
			readonly,
			segmentValues,
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
					segments: segmentContents.value,
					isInvalid: isInvalid.value
				}), (0, vue.createVNode)((0, vue.unref)(require_VisuallyHidden_VisuallyHidden.VisuallyHidden_default), {
					id: _ctx.id,
					as: "input",
					feature: "focusable",
					tabindex: "-1",
					value: (0, vue.unref)(modelValue) ? (0, vue.unref)(modelValue).toString() : "",
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
//#region src/TimeField/TimeFieldRoot.vue
var TimeFieldRoot_default = TimeFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TimeFieldRoot_default', {
  enumerable: true,
  get: function () {
    return TimeFieldRoot_default;
  }
});
Object.defineProperty(exports, 'injectTimeFieldRootContext', {
  enumerable: true,
  get: function () {
    return injectTimeFieldRootContext;
  }
});
//# sourceMappingURL=TimeFieldRoot.cjs.map