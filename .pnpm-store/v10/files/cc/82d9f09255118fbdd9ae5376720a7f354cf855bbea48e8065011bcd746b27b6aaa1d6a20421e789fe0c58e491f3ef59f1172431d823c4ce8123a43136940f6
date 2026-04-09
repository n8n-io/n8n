import { createContext } from "../shared/createContext.js";
import { getDefaultDate, isSameYear } from "../date/comparators.js";
import { handleCalendarInitialFocus } from "../date/utils.js";
import { useDirection } from "../shared/useDirection.js";
import { useId } from "../shared/useId.js";
import { useLocale } from "../shared/useLocale.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { useYearPicker, useYearPickerState } from "./useYearPicker.js";
import { createBlock, createElementVNode, defineComponent, onMounted, openBlock, renderSlot, toDisplayString, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/YearPicker/YearPickerRoot.vue?vue&type=script&setup=true&lang.ts
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
const [injectYearPickerRootContext, provideYearPickerRootContext] = createContext("YearPickerRoot");
var YearPickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "YearPickerRoot",
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
		preventDeselect: {
			type: Boolean,
			required: false,
			default: false
		},
		calendarLabel: {
			type: String,
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
		initialFocus: {
			type: Boolean,
			required: false,
			default: false
		},
		isYearDisabled: {
			type: Function,
			required: false,
			default: void 0
		},
		isYearUnavailable: {
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
		yearsPerPage: {
			type: Number,
			required: false,
			default: 12
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
		const { disabled, readonly, initialFocus, multiple, minValue, maxValue, preventDeselect, isYearDisabled: propsIsYearDisabled, isYearUnavailable: propsIsYearUnavailable, calendarLabel, defaultValue, nextPage: propsNextPage, prevPage: propsPrevPage, dir: propDir, locale: propLocale, yearsPerPage } = toRefs(props);
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const locale = useLocale(propLocale);
		const dir = useDirection(propDir);
		const headingId = useId(void 0, "reka-year-picker-heading");
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
		const { fullCalendarLabel, headingValue, isYearDisabled, isYearUnavailable, isNextButtonDisabled, isPrevButtonDisabled, nextPage, prevPage, formatter, grid } = useYearPicker({
			locale,
			placeholder,
			minValue,
			maxValue,
			disabled,
			yearsPerPage,
			isYearDisabled: propsIsYearDisabled,
			isYearUnavailable: propsIsYearUnavailable,
			calendarLabel,
			nextPage: propsNextPage,
			prevPage: propsPrevPage
		});
		const { isInvalid, isYearSelected } = useYearPickerState({
			date: modelValue,
			isYearDisabled,
			isYearUnavailable
		});
		watch(modelValue, (_modelValue) => {
			if (Array.isArray(_modelValue) && _modelValue.length) {
				const lastValue = _modelValue[_modelValue.length - 1];
				if (lastValue && !isSameYear(placeholder.value, lastValue)) onPlaceholderChange(lastValue);
			} else if (!Array.isArray(_modelValue) && _modelValue && !isSameYear(placeholder.value, _modelValue)) onPlaceholderChange(_modelValue);
		});
		function onYearChange(value) {
			if (!multiple.value) {
				if (!modelValue.value) {
					modelValue.value = value.copy();
					return;
				}
				if (!preventDeselect.value && isSameYear(modelValue.value, value)) {
					placeholder.value = value.copy();
					modelValue.value = void 0;
				} else modelValue.value = value.copy();
			} else if (!modelValue.value) modelValue.value = [value.copy()];
			else if (Array.isArray(modelValue.value)) {
				const index = modelValue.value.findIndex((date) => isSameYear(date, value));
				if (index === -1) modelValue.value = [...modelValue.value, value.copy()];
				else if (!preventDeselect.value) {
					const next = modelValue.value.filter((date) => !isSameYear(date, value));
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
		provideYearPickerRootContext({
			isYearUnavailable,
			dir,
			isYearDisabled,
			locale,
			formatter,
			modelValue,
			placeholder,
			disabled,
			initialFocus,
			grid,
			multiple,
			readonly,
			preventDeselect,
			fullCalendarLabel,
			headingValue,
			headingId,
			isInvalid,
			isYearSelected,
			isNextButtonDisabled,
			isPrevButtonDisabled,
			nextPage,
			prevPage,
			parentElement,
			onPlaceholderChange,
			onYearChange,
			minValue,
			maxValue,
			yearsPerPage
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-label": unref(fullCalendarLabel),
				"data-readonly": unref(readonly) ? "" : void 0,
				"data-disabled": unref(disabled) ? "" : void 0,
				"data-invalid": unref(isInvalid) ? "" : void 0,
				dir: unref(dir)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					date: unref(placeholder),
					grid: unref(grid),
					locale: unref(locale),
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
//#region src/YearPicker/YearPickerRoot.vue
var YearPickerRoot_default = YearPickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { YearPickerRoot_default, injectYearPickerRootContext };
//# sourceMappingURL=YearPickerRoot.js.map