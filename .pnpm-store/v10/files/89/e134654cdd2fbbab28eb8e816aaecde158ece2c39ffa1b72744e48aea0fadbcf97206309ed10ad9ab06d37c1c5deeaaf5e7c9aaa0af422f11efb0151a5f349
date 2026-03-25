import { createContext } from "../shared/createContext.js";
import { getDefaultDate } from "../date/comparators.js";
import { handleCalendarInitialFocus } from "../date/utils.js";
import { useDirection } from "../shared/useDirection.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { useCalendar, useCalendarState } from "./useCalendar.js";
import { createBlock, createElementVNode, defineComponent, onMounted, openBlock, renderSlot, toDisplayString, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";
import { isEqualDay, isSameDay } from "@internationalized/date";

//#region src/Calendar/CalendarRoot.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = { style: {
	"border": "0px",
	"clip": "rect(0px, 0px, 0px, 0px)",
	"clip-path": "inset(50%)",
	"height": "1px",
	"margin": "-1px",
	"overflow": "hidden",
	"padding": "0px",
	"position": "absolute",
	"white-space": "nowrap",
	"width": "1px"
} };
const _hoisted_2 = {
	role: "heading",
	"aria-level": "2"
};
const [injectCalendarRootContext, provideCalendarRootContext] = createContext("CalendarRoot");
var CalendarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "CalendarRoot",
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
		pagedNavigation: {
			type: Boolean,
			required: false,
			default: false
		},
		preventDeselect: {
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
		calendarLabel: {
			type: String,
			required: false
		},
		fixedWeeks: {
			type: Boolean,
			required: false,
			default: false
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
		numberOfMonths: {
			type: Number,
			required: false,
			default: 1
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
		initialFocus: {
			type: Boolean,
			required: false,
			default: false
		},
		isDateDisabled: {
			type: Function,
			required: false,
			default: void 0
		},
		isDateUnavailable: {
			type: Function,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		nextPage: {
			type: Function,
			required: false
		},
		prevPage: {
			type: Function,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false,
			default: false
		},
		disableDaysOutsideCurrentView: {
			type: Boolean,
			required: false,
			default: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	emits: ["update:modelValue", "update:placeholder"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, readonly, initialFocus, pagedNavigation, weekStartsOn, weekdayFormat, fixedWeeks, multiple, minValue, maxValue, numberOfMonths, preventDeselect, isDateDisabled: propsIsDateDisabled, isDateUnavailable: propsIsDateUnavailable, calendarLabel, defaultValue, nextPage: propsNextPage, prevPage: propsPrevPage, dir: propDir, locale: propLocale, disableDaysOutsideCurrentView } = toRefs(props);
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const locale = useLocale(propLocale);
		const dir = useDirection(propDir);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: defaultValue.value,
			passive: props.modelValue === void 0
		});
		const defaultDate = getDefaultDate({
			defaultPlaceholder: props.placeholder,
			defaultValue: modelValue.value,
			locale: props.locale
		});
		const placeholder = useVModel(props, "placeholder", emits, {
			defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
			passive: props.placeholder === void 0
		});
		function onPlaceholderChange(value) {
			placeholder.value = value.copy();
		}
		const { fullCalendarLabel, headingValue, isDateDisabled, isDateUnavailable, isNextButtonDisabled, isPrevButtonDisabled, weekdays, isOutsideVisibleView, nextPage, prevPage, formatter, grid } = useCalendar({
			locale,
			placeholder,
			weekStartsOn,
			fixedWeeks,
			numberOfMonths,
			minValue,
			maxValue,
			disabled,
			weekdayFormat,
			pagedNavigation,
			isDateDisabled: propsIsDateDisabled.value,
			isDateUnavailable: propsIsDateUnavailable.value,
			calendarLabel,
			nextPage: propsNextPage,
			prevPage: propsPrevPage
		});
		const { isInvalid, isDateSelected } = useCalendarState({
			date: modelValue,
			isDateDisabled,
			isDateUnavailable
		});
		watch(modelValue, (_modelValue) => {
			if (Array.isArray(_modelValue) && _modelValue.length) {
				const lastValue = _modelValue[_modelValue.length - 1];
				if (lastValue && !isEqualDay(placeholder.value, lastValue)) onPlaceholderChange(lastValue);
			} else if (!Array.isArray(_modelValue) && _modelValue && !isEqualDay(placeholder.value, _modelValue)) onPlaceholderChange(_modelValue);
		});
		function onDateChange(value) {
			if (!multiple.value) {
				if (!modelValue.value) {
					modelValue.value = value.copy();
					return;
				}
				if (!preventDeselect.value && isEqualDay(modelValue.value, value)) {
					placeholder.value = value.copy();
					modelValue.value = void 0;
				} else modelValue.value = value.copy();
			} else if (!modelValue.value) modelValue.value = [value.copy()];
			else if (Array.isArray(modelValue.value)) {
				const index = modelValue.value.findIndex((date) => isSameDay(date, value));
				if (index === -1) modelValue.value = [...modelValue.value, value];
				else if (!preventDeselect.value) {
					const next = modelValue.value.filter((date) => !isSameDay(date, value));
					if (!next.length) {
						placeholder.value = value.copy();
						modelValue.value = void 0;
						return;
					}
					modelValue.value = next.map((date) => date.copy());
				}
			}
		}
		onMounted(() => {
			if (initialFocus.value) handleCalendarInitialFocus(parentElement.value);
		});
		provideCalendarRootContext({
			isDateUnavailable,
			dir,
			isDateDisabled,
			locale,
			formatter,
			modelValue,
			placeholder,
			disabled,
			initialFocus,
			pagedNavigation,
			grid,
			weekDays: weekdays,
			weekStartsOn,
			weekdayFormat,
			fixedWeeks,
			multiple,
			numberOfMonths,
			readonly,
			preventDeselect,
			fullCalendarLabel,
			headingValue,
			isInvalid,
			isDateSelected,
			isNextButtonDisabled,
			isPrevButtonDisabled,
			isOutsideVisibleView,
			nextPage,
			prevPage,
			parentElement,
			onPlaceholderChange,
			onDateChange,
			disableDaysOutsideCurrentView
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "application",
				"aria-label": unref(fullCalendarLabel),
				"data-readonly": unref(readonly) ? "" : void 0,
				"data-disabled": unref(disabled) ? "" : void 0,
				"data-invalid": unref(isInvalid) ? "" : void 0,
				dir: unref(dir)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					date: unref(placeholder),
					grid: unref(grid),
					weekDays: unref(weekdays),
					weekStartsOn: unref(weekStartsOn),
					locale: unref(locale),
					fixedWeeks: unref(fixedWeeks),
					modelValue: unref(modelValue)
				}), createElementVNode("div", _hoisted_1, [createElementVNode("div", _hoisted_2, toDisplayString(unref(fullCalendarLabel)), 1)])]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-label",
				"data-readonly",
				"data-disabled",
				"data-invalid",
				"dir"
			]);
		};
	}
});

//#endregion
//#region src/Calendar/CalendarRoot.vue
var CalendarRoot_default = CalendarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { CalendarRoot_default, injectCalendarRootContext };
//# sourceMappingURL=CalendarRoot.js.map