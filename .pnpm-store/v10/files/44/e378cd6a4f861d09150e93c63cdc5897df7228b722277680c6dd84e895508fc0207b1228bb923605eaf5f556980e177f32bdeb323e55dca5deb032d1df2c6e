const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_Popover_PopoverRoot = require('../Popover/PopoverRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/DateRangePicker/DateRangePickerRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDateRangePickerRootContext, provideDateRangePickerRootContext] = require_shared_createContext.createContext("DateRangePickerRoot");
var DateRangePickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "DateRangePickerRoot",
	props: {
		defaultValue: {
			type: Object,
			required: false,
			default: () => ({
				start: void 0,
				end: void 0
			})
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
			required: false,
			default: "en"
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
		},
		defaultOpen: {
			type: Boolean,
			required: false,
			default: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		modal: {
			type: Boolean,
			required: false,
			default: false
		},
		isDateDisabled: {
			type: Function,
			required: false,
			default: void 0
		},
		pagedNavigation: {
			type: Boolean,
			required: false,
			default: false
		},
		weekStartsOn: {
			type: Number,
			required: false,
			default: 0
		},
		weekdayFormat: {
			type: String,
			required: false,
			default: "narrow"
		},
		fixedWeeks: {
			type: Boolean,
			required: false,
			default: false
		},
		numberOfMonths: {
			type: Number,
			required: false,
			default: 1
		},
		preventDeselect: {
			type: Boolean,
			required: false,
			default: false
		},
		isDateHighlightable: {
			type: Function,
			required: false,
			default: void 0
		},
		allowNonContiguousRanges: {
			type: Boolean,
			required: false,
			default: false
		},
		fixedDate: {
			type: String,
			required: false
		},
		maximumDays: {
			type: Number,
			required: false,
			default: void 0
		},
		closeOnSelect: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: [
		"update:modelValue",
		"update:placeholder",
		"update:startValue",
		"update:open"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { locale, disabled, readonly, pagedNavigation, weekStartsOn, weekdayFormat, fixedWeeks, numberOfMonths, preventDeselect, isDateDisabled: propsIsDateDisabled, isDateUnavailable: propsIsDateUnavailable, isDateHighlightable: propsIsDateHighlightable, defaultOpen, modal, id, name, required, minValue, maxValue, granularity, hideTimeZone, hourCycle, dir: propsDir, allowNonContiguousRanges, fixedDate, maximumDays, step, closeOnSelect } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propsDir);
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
		const open = (0, __vueuse_core.useVModel)(props, "open", emits, {
			defaultValue: defaultOpen.value,
			passive: props.open === void 0
		});
		const dateFieldRef = (0, vue.ref)();
		(0, vue.watch)(modelValue, (value) => {
			if (value && value.start && value.start.compare(placeholder.value) !== 0) placeholder.value = value.start.copy();
			if (value.start && value.end) {
				if (closeOnSelect.value) open.value = false;
			}
		});
		provideDateRangePickerRootContext({
			allowNonContiguousRanges,
			isDateUnavailable: propsIsDateUnavailable.value,
			isDateDisabled: propsIsDateDisabled.value,
			isDateHighlightable: propsIsDateHighlightable.value,
			locale,
			disabled,
			pagedNavigation,
			weekStartsOn,
			weekdayFormat,
			fixedWeeks,
			numberOfMonths,
			readonly,
			preventDeselect,
			modelValue,
			placeholder,
			defaultOpen,
			modal,
			open,
			id,
			name,
			required,
			minValue,
			maxValue,
			granularity,
			hideTimeZone,
			hourCycle,
			dateFieldRef,
			dir,
			fixedDate,
			maximumDays,
			step,
			onStartValueChange(date) {
				emits("update:startValue", date);
			},
			onDateChange(date) {
				modelValue.value = {
					start: date.start?.copy(),
					end: date.end?.copy()
				};
			},
			onPlaceholderChange(date) {
				placeholder.value = date.copy();
			},
			closeOnSelect
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popover_PopoverRoot.PopoverRoot_default), {
				open: (0, vue.unref)(open),
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => (0, vue.isRef)(open) ? open.value = $event : null),
				"default-open": (0, vue.unref)(defaultOpen),
				modal: (0, vue.unref)(modal)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					open: (0, vue.unref)(open)
				})]),
				_: 3
			}, 8, [
				"open",
				"default-open",
				"modal"
			]);
		};
	}
});

//#endregion
//#region src/DateRangePicker/DateRangePickerRoot.vue
var DateRangePickerRoot_default = DateRangePickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DateRangePickerRoot_default', {
  enumerable: true,
  get: function () {
    return DateRangePickerRoot_default;
  }
});
Object.defineProperty(exports, 'injectDateRangePickerRootContext', {
  enumerable: true,
  get: function () {
    return injectDateRangePickerRootContext;
  }
});
//# sourceMappingURL=DateRangePickerRoot.cjs.map