import { isSameYear, toDate } from "../date/comparators.js";
import { useKbd } from "../shared/useKbd.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectYearPickerRootContext } from "./YearPickerRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, nextTick, openBlock, renderSlot, toDisplayString, unref, withCtx, withKeys, withModifiers } from "vue";
import { endOfYear, getLocalTimeZone, startOfYear, toCalendar, today } from "@internationalized/date";

//#region src/YearPicker/YearPickerCellTrigger.vue?vue&type=script&setup=true&lang.ts
var YearPickerCellTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "YearPickerCellTrigger",
	props: {
		year: {
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
		const rootContext = injectYearPickerRootContext();
		const { primitiveElement } = usePrimitiveElement();
		const yearValue = computed(() => {
			rootContext.locale.value;
			return rootContext.formatter.fullYear(toDate(props.year));
		});
		const labelText = computed(() => {
			rootContext.locale.value;
			return rootContext.formatter.custom(toDate(props.year), { year: "numeric" });
		});
		const isUnavailable = computed(() => rootContext.isYearUnavailable?.(props.year) ?? false);
		const isCurrentYear = computed(() => {
			const todayDate = toCalendar(today(getLocalTimeZone()), props.year.calendar);
			return isSameYear(props.year, todayDate);
		});
		const isDisabled = computed(() => rootContext.isYearDisabled(props.year));
		const isFocusedYear = computed(() => {
			return !rootContext.disabled.value && isSameYear(props.year, rootContext.placeholder.value);
		});
		const isSelectedYear = computed(() => rootContext.isYearSelected(props.year));
		function changeYear(date) {
			if (rootContext.readonly.value) return;
			if (rootContext.isYearDisabled(date) || rootContext.isYearUnavailable?.(date)) return;
			rootContext.onYearChange(date);
		}
		function handleClick() {
			if (isDisabled.value) return;
			changeYear(props.year);
		}
		function handleArrowKey(e) {
			if (isDisabled.value) return;
			e.preventDefault();
			e.stopPropagation();
			const parentElement = rootContext.parentElement.value;
			const sign = rootContext.dir.value === "rtl" ? -1 : 1;
			switch (e.code) {
				case kbd.ARROW_RIGHT:
					shiftFocus(props.year, sign);
					break;
				case kbd.ARROW_LEFT:
					shiftFocus(props.year, -sign);
					break;
				case kbd.ARROW_UP:
					shiftFocus(props.year, -4);
					break;
				case kbd.ARROW_DOWN:
					shiftFocus(props.year, 4);
					break;
				case kbd.PAGE_UP:
					shiftFocusPage(-1);
					break;
				case kbd.PAGE_DOWN:
					shiftFocusPage(1);
					break;
				case kbd.ENTER:
				case kbd.SPACE_CODE: changeYear(props.year);
			}
			function shiftFocus(currentYear, add, depth = 0) {
				if (depth > 48) return;
				const candidateYearValue = currentYear.add({ years: add });
				if (rootContext.minValue.value && endOfYear(candidateYearValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && startOfYear(candidateYearValue).compare(rootContext.maxValue.value) > 0) return;
				const candidateYear = parentElement.querySelector(`[data-value='${candidateYearValue.toString()}']`);
				if (!candidateYear) {
					if (add > 0) {
						if (rootContext.isNextButtonDisabled()) return;
						rootContext.nextPage();
					} else {
						if (rootContext.isPrevButtonDisabled()) return;
						rootContext.prevPage();
					}
					nextTick(() => {
						shiftFocus(currentYear, add, depth + 1);
					});
					return;
				}
				if (candidateYear && candidateYear.hasAttribute("data-disabled")) return shiftFocus(candidateYearValue, add, depth + 1);
				rootContext.onPlaceholderChange(candidateYearValue);
				candidateYear?.focus();
			}
			function shiftFocusPage(direction) {
				const yearsPerPage = rootContext.yearsPerPage.value;
				const candidateYearValue = props.year.add({ years: direction * yearsPerPage });
				if (rootContext.minValue.value && endOfYear(candidateYearValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && startOfYear(candidateYearValue).compare(rootContext.maxValue.value) > 0) return;
				if (direction > 0) {
					if (rootContext.isNextButtonDisabled()) return;
					rootContext.nextPage();
				} else {
					if (rootContext.isPrevButtonDisabled()) return;
					rootContext.prevPage();
				}
				nextTick(() => {
					const candidateYear = parentElement.querySelector(`[data-value='${candidateYearValue.toString()}']`);
					if (candidateYear && !candidateYear.hasAttribute("data-disabled")) {
						rootContext.onPlaceholderChange(candidateYearValue);
						candidateYear?.focus();
						return;
					}
					if (!candidateYear || candidateYear.hasAttribute("data-disabled")) shiftFocus(candidateYearValue, direction > 0 ? 1 : -1, 1);
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
				"data-reka-year-picker-cell-trigger": "",
				"aria-disabled": isDisabled.value || isUnavailable.value ? true : void 0,
				"data-selected": isSelectedYear.value ? "" : void 0,
				"data-value": _ctx.year.toString(),
				"data-disabled": isDisabled.value ? "" : void 0,
				"data-unavailable": isUnavailable.value ? "" : void 0,
				"data-today": isCurrentYear.value ? "" : void 0,
				"data-focused": isFocusedYear.value ? "" : void 0,
				tabindex: isFocusedYear.value ? 0 : isDisabled.value ? void 0 : -1,
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
					yearValue: yearValue.value,
					disabled: isDisabled.value,
					today: isCurrentYear.value,
					selected: isSelectedYear.value,
					unavailable: isUnavailable.value
				}, () => [createTextVNode(toDisplayString(yearValue.value), 1)])]),
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
//#region src/YearPicker/YearPickerCellTrigger.vue
var YearPickerCellTrigger_default = YearPickerCellTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { YearPickerCellTrigger_default };
//# sourceMappingURL=YearPickerCellTrigger.js.map