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

//#region src/DateField/DateFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDateFieldRootContext, provideDateFieldRootContext] = require_shared_createContext.createContext("DateFieldRoot");
var DateFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "DateFieldRoot",
	props: {
		defaultValue: {
			type: null,
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
			type: null,
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
		const { disabled, readonly, isDateUnavailable: propsIsDateUnavailable, granularity, defaultValue, dir: propDir, locale: propLocale } = (0, vue.toRefs)(props);
		const locale = require_shared_useLocale.useLocale(propLocale);
		const dir = require_shared_useDirection.useDirection(propDir);
		const formatter = require_shared_useDateFormatter.useDateFormatter(locale.value, { hourCycle: require_date_utils.normalizeHourCycle(props.hourCycle) });
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const segmentElements = (0, vue.ref)(/* @__PURE__ */ new Set());
		(0, vue.onMounted)(() => {
			require_date_segment.getSegmentElements(parentElement.value).forEach((item) => segmentElements.value.add(item));
		});
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: defaultValue.value,
			passive: props.modelValue === void 0
		});
		const defaultDate = require_date_comparators.getDefaultDate({
			defaultPlaceholder: props.placeholder,
			granularity: granularity.value,
			defaultValue: modelValue.value,
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
		const isInvalid = (0, vue.computed)(() => {
			if (!modelValue.value) return false;
			if (propsIsDateUnavailable.value?.(modelValue.value)) return true;
			if (props.minValue && require_date_comparators.isBefore(modelValue.value, props.minValue)) return true;
			if (props.maxValue && require_date_comparators.isBefore(props.maxValue, modelValue.value)) return true;
			return false;
		});
		const initialSegments = require_date_parser.initializeSegmentValues(inferredGranularity.value);
		const segmentValues = (0, vue.ref)(modelValue.value ? { ...require_date_parser.syncSegmentValues({
			value: modelValue.value,
			formatter
		}) } : { ...initialSegments });
		const allSegmentContent = (0, vue.computed)(() => require_date_parser.createContent({
			granularity: inferredGranularity.value,
			dateRef: placeholder.value,
			formatter,
			hideTimeZone: props.hideTimeZone,
			hourCycle: props.hourCycle,
			segmentValues: segmentValues.value,
			locale
		}));
		const segmentContents = (0, vue.computed)(() => allSegmentContent.value.arr);
		const editableSegmentContents = (0, vue.computed)(() => segmentContents.value.filter(({ part }) => part !== "literal"));
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
			if (!require_shared_nullish.isNullish(_modelValue) && placeholder.value.compare(_modelValue) !== 0) placeholder.value = _modelValue.copy();
		});
		(0, vue.watch)([modelValue, locale], ([_modelValue]) => {
			if (!require_shared_nullish.isNullish(_modelValue)) segmentValues.value = { ...require_date_parser.syncSegmentValues({
				value: _modelValue,
				formatter
			}) };
			else if (Object.values(segmentValues.value).every((value) => value !== null) && require_shared_nullish.isNullish(_modelValue)) segmentValues.value = { ...initialSegments };
		});
		const currentFocusedElement = (0, vue.ref)(null);
		const currentSegmentIndex = (0, vue.computed)(() => Array.from(segmentElements.value).findIndex((el) => el.getAttribute("data-reka-date-field-segment") === currentFocusedElement.value?.getAttribute("data-reka-date-field-segment")));
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
		provideDateFieldRootContext({
			isDateUnavailable: propsIsDateUnavailable.value,
			locale,
			modelValue,
			placeholder,
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
//#region src/DateField/DateFieldRoot.vue
var DateFieldRoot_default = DateFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DateFieldRoot_default', {
  enumerable: true,
  get: function () {
    return DateFieldRoot_default;
  }
});
Object.defineProperty(exports, 'injectDateFieldRootContext', {
  enumerable: true,
  get: function () {
    return injectDateFieldRootContext;
  }
});
//# sourceMappingURL=DateFieldRoot.cjs.map