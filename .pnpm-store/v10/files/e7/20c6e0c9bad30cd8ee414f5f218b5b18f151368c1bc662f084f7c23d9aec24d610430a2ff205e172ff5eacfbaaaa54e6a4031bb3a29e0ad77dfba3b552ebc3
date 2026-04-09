import { isSameYearMonth, toDate } from "../date/comparators.js";
import { useKbd } from "../shared/useKbd.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectMonthPickerRootContext } from "./MonthPickerRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, nextTick, openBlock, renderSlot, toDisplayString, unref, withCtx, withKeys, withModifiers } from "vue";
import { endOfMonth, getLocalTimeZone, toCalendar, today } from "@internationalized/date";

//#region src/MonthPicker/MonthPickerCellTrigger.vue?vue&type=script&setup=true&lang.ts
var MonthPickerCellTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MonthPickerCellTrigger",
	props: {
		month: {
			type: null,
			required: true
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
	setup(__props) {
		const props = __props;
		const kbd = useKbd();
		const rootContext = injectMonthPickerRootContext();
		const { primitiveElement } = usePrimitiveElement();
		const shortMonthValue = computed(() => {
			rootContext.locale.value;
			return rootContext.formatter.custom(toDate(props.month), { month: "short" });
		});
		const labelText = computed(() => {
			rootContext.locale.value;
			return rootContext.formatter.custom(toDate(props.month), {
				month: "long",
				year: "numeric"
			});
		});
		const isUnavailable = computed(() => rootContext.isMonthUnavailable?.(props.month) ?? false);
		const isCurrentMonth = computed(() => {
			const todayDate = toCalendar(today(getLocalTimeZone()), props.month.calendar);
			return isSameYearMonth(props.month, todayDate);
		});
		const isDisabled = computed(() => rootContext.isMonthDisabled(props.month));
		const isFocusedMonth = computed(() => {
			return !rootContext.disabled.value && isSameYearMonth(props.month, rootContext.placeholder.value);
		});
		const isSelectedMonth = computed(() => rootContext.isMonthSelected(props.month));
		function changeMonth(date) {
			if (rootContext.readonly.value) return;
			if (rootContext.isMonthDisabled(date) || rootContext.isMonthUnavailable?.(date)) return;
			rootContext.onMonthChange(date);
		}
		function handleClick() {
			if (isDisabled.value) return;
			changeMonth(props.month);
		}
		function handleArrowKey(e) {
			if (isDisabled.value) return;
			e.preventDefault();
			e.stopPropagation();
			const parentElement = rootContext.parentElement.value;
			const sign = rootContext.dir.value === "rtl" ? -1 : 1;
			switch (e.code) {
				case kbd.ARROW_RIGHT:
					shiftFocus(props.month, sign);
					break;
				case kbd.ARROW_LEFT:
					shiftFocus(props.month, -sign);
					break;
				case kbd.ARROW_UP:
					shiftFocus(props.month, -4);
					break;
				case kbd.ARROW_DOWN:
					shiftFocus(props.month, 4);
					break;
				case kbd.PAGE_UP:
					shiftFocusYear(-1);
					break;
				case kbd.PAGE_DOWN:
					shiftFocusYear(1);
					break;
				case kbd.ENTER:
				case kbd.SPACE_CODE: changeMonth(props.month);
			}
			function shiftFocus(currentMonth, add, depth = 0) {
				if (depth > 48) return;
				const candidateMonthValue = currentMonth.add({ months: add });
				if (rootContext.minValue.value && endOfMonth(candidateMonthValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && candidateMonthValue.set({ day: 1 }).compare(rootContext.maxValue.value) > 0) return;
				const candidateMonth = parentElement.querySelector(`[data-value='${candidateMonthValue.toString()}']`);
				if (!candidateMonth) {
					if (add > 0) {
						if (rootContext.isNextButtonDisabled()) return;
						rootContext.nextPage();
					} else {
						if (rootContext.isPrevButtonDisabled()) return;
						rootContext.prevPage();
					}
					nextTick(() => {
						shiftFocus(currentMonth, add, depth + 1);
					});
					return;
				}
				if (candidateMonth && candidateMonth.hasAttribute("data-disabled")) return shiftFocus(candidateMonthValue, add, depth + 1);
				rootContext.onPlaceholderChange(candidateMonthValue);
				candidateMonth?.focus();
			}
			function shiftFocusYear(years) {
				const candidateMonthValue = props.month.add({ years });
				if (rootContext.minValue.value && endOfMonth(candidateMonthValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && candidateMonthValue.set({ day: 1 }).compare(rootContext.maxValue.value) > 0) return;
				if (years > 0) {
					if (rootContext.isNextButtonDisabled()) return;
					rootContext.nextPage();
				} else {
					if (rootContext.isPrevButtonDisabled()) return;
					rootContext.prevPage();
				}
				nextTick(() => {
					const candidateMonth = parentElement.querySelector(`[data-value='${candidateMonthValue.toString()}']`);
					if (candidateMonth && !candidateMonth.hasAttribute("data-disabled")) {
						rootContext.onPlaceholderChange(candidateMonthValue);
						candidateMonth?.focus();
					}
				});
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: props.as,
				"as-child": props.asChild,
				role: "button",
				"aria-label": labelText.value,
				"data-reka-month-picker-cell-trigger": "",
				"aria-disabled": isDisabled.value || isUnavailable.value ? true : void 0,
				"data-selected": isSelectedMonth.value ? true : void 0,
				"data-value": _ctx.month.toString(),
				"data-disabled": isDisabled.value ? "" : void 0,
				"data-unavailable": isUnavailable.value ? "" : void 0,
				"data-today": isCurrentMonth.value ? "" : void 0,
				"data-focused": isFocusedMonth.value ? "" : void 0,
				tabindex: isFocusedMonth.value ? 0 : isDisabled.value ? void 0 : -1,
				onClick: handleClick,
				onKeydown: [withKeys(handleArrowKey, [
					"up",
					"down",
					"left",
					"right",
					"space",
					"enter",
					"page-up",
					"page-down"
				]), _cache[0] || (_cache[0] = withKeys(withModifiers(() => {}, ["prevent"]), ["enter"]))]
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					monthValue: shortMonthValue.value,
					disabled: isDisabled.value,
					today: isCurrentMonth.value,
					selected: isSelectedMonth.value,
					unavailable: isUnavailable.value
				}, () => [createTextVNode(toDisplayString(shortMonthValue.value), 1)])]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-label",
				"aria-disabled",
				"data-selected",
				"data-value",
				"data-disabled",
				"data-unavailable",
				"data-today",
				"data-focused",
				"tabindex"
			]);
		};
	}
});

//#endregion
//#region src/MonthPicker/MonthPickerCellTrigger.vue
var MonthPickerCellTrigger_default = MonthPickerCellTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MonthPickerCellTrigger_default };
//# sourceMappingURL=MonthPickerCellTrigger.js.map