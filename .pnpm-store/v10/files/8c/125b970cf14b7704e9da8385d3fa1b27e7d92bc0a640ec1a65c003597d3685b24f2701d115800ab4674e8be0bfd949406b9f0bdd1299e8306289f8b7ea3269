import { createContext } from "../shared/createContext.js";
import { getDefaultDate } from "../date/comparators.js";
import { useDirection } from "../shared/useDirection.js";
import { PopoverRoot_default } from "../Popover/PopoverRoot.js";
import { computed, createBlock, defineComponent, isRef, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/DatePicker/DatePickerRoot.vue?vue&type=script&setup=true&lang.ts
const [injectDatePickerRootContext, provideDatePickerRootContext] = createContext("DatePickerRoot");
var DatePickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "DatePickerRoot",
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
		closeOnSelect: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: [
		"update:modelValue",
		"update:placeholder",
		"update:open"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { locale, disabled, readonly, pagedNavigation, weekStartsOn, weekdayFormat, fixedWeeks, numberOfMonths, preventDeselect, isDateDisabled: propsIsDateDisabled, isDateUnavailable: propsIsDateUnavailable, defaultOpen, modal, id, name, required, minValue, maxValue, granularity, hideTimeZone, hourCycle, defaultValue, dir: propDir, step, closeOnSelect } = toRefs(props);
		const dir = useDirection(propDir);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: defaultValue.value,
			passive: props.modelValue === void 0
		});
		const defaultDate = computed(() => getDefaultDate({
			defaultPlaceholder: props.placeholder,
			granularity: props.granularity,
			defaultValue: modelValue.value,
			locale: props.locale
		}));
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.value.copy(),
			passive: props.placeholder === void 0
		});
		const open = useVModel(props, "open", emits, {
			defaultValue: defaultOpen.value,
			passive: props.open === void 0
		});
		const dateFieldRef = ref();
		watch(modelValue, (value) => {
			if (value && value.compare(placeholder.value) !== 0) placeholder.value = value.copy();
			if (closeOnSelect.value) open.value = false;
		});
		provideDatePickerRootContext({
			isDateUnavailable: propsIsDateUnavailable.value,
			isDateDisabled: propsIsDateDisabled.value,
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
			step,
			onDateChange(date) {
				if (!date || !modelValue.value) modelValue.value = date?.copy() ?? void 0;
				else if (!preventDeselect.value && date && modelValue.value.compare(date) === 0) modelValue.value = void 0;
				else modelValue.value = date.copy();
			},
			onPlaceholderChange(date) {
				placeholder.value = date.copy();
			},
			closeOnSelect
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopoverRoot_default), {
				open: unref(open),
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isRef(open) ? open.value = $event : null),
				"default-open": unref(defaultOpen),
				modal: unref(modal)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
//#region src/DatePicker/DatePickerRoot.vue
var DatePickerRoot_default = DatePickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DatePickerRoot_default, injectDatePickerRootContext };
//# sourceMappingURL=DatePickerRoot.js.map