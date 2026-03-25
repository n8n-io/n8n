import { getDaysInMonth, isBetweenInclusive, toDate } from "../date/comparators.js";
import { useKbd } from "../shared/useKbd.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { getSelectableCells } from "../Calendar/utils.js";
import { injectRangeCalendarRootContext } from "./RangeCalendarRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, nextTick, openBlock, renderSlot, toDisplayString, unref, withCtx, withKeys } from "vue";
import { getLocalTimeZone, isSameDay, isSameMonth, isToday } from "@internationalized/date";

//#region src/RangeCalendar/RangeCalendarCellTrigger.vue?vue&type=script&setup=true&lang.ts
var RangeCalendarCellTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RangeCalendarCellTrigger",
	props: {
		day: {
			type: null,
			required: true
		},
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
		const rootContext = injectRangeCalendarRootContext();
		const kbd = useKbd();
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const labelText = computed(() => rootContext.formatter.custom(toDate(props.day), {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric"
		}));
		const isUnavailable = computed(() => rootContext.isDateUnavailable?.(props.day) ?? false);
		const isSelectedDate = computed(() => rootContext.isSelected(props.day));
		const isSelectionStart = computed(() => rootContext.isSelectionStart(props.day));
		const isSelectionEnd = computed(() => rootContext.isSelectionEnd(props.day));
		const isHighlightStart = computed(() => rootContext.isHighlightedStart(props.day));
		const isHighlightEnd = computed(() => rootContext.isHighlightedEnd(props.day));
		const isHighlighted = computed(() => rootContext.highlightedRange.value ? isBetweenInclusive(props.day, rootContext.highlightedRange.value.start, rootContext.highlightedRange.value.end) : false);
		const allowNonContiguousRanges = computed(() => rootContext.allowNonContiguousRanges.value);
		const isDateToday = computed(() => {
			return isToday(props.day, getLocalTimeZone());
		});
		const isOutsideView = computed(() => {
			return !isSameMonth(props.day, props.month);
		});
		const isOutsideVisibleView = computed(() => rootContext.isOutsideVisibleView(props.day));
		const isDisabled = computed(() => rootContext.isDateDisabled(props.day) || rootContext.disableDaysOutsideCurrentView.value && isOutsideView.value);
		const dayValue = computed(() => props.day.day.toLocaleString(rootContext.locale.value));
		const isFocusedDate = computed(() => {
			return !rootContext.disabled.value && isSameDay(props.day, rootContext.placeholder.value);
		});
		function changeDate(e, date) {
			if (rootContext.readonly.value) return;
			if (rootContext.isDateDisabled(date) || rootContext.isDateUnavailable?.(date)) return;
			rootContext.lastPressedDateValue.value = date.copy();
			if (rootContext.startValue.value && rootContext.highlightedRange.value === null) {
				if (isSameDay(date, rootContext.startValue.value) && !rootContext.preventDeselect.value && !rootContext.endValue.value) {
					rootContext.startValue.value = void 0;
					rootContext.onPlaceholderChange(date);
					return;
				} else if (!rootContext.endValue.value) {
					e.preventDefault();
					if (rootContext.lastPressedDateValue.value && isSameDay(rootContext.lastPressedDateValue.value, date)) rootContext.startValue.value = date.copy();
					return;
				}
			}
			if (rootContext.startValue.value && rootContext.endValue.value && isSameDay(rootContext.endValue.value, date) && !rootContext.preventDeselect.value) {
				rootContext.startValue.value = void 0;
				rootContext.endValue.value = void 0;
				rootContext.onPlaceholderChange(date);
				return;
			}
			if (!rootContext.startValue.value) rootContext.startValue.value = date.copy();
			else if (!rootContext.endValue.value) rootContext.endValue.value = date.copy();
			else if (rootContext.endValue.value && rootContext.startValue.value) {
				if (!rootContext.fixedDate.value) {
					rootContext.endValue.value = void 0;
					rootContext.startValue.value = date.copy();
				} else if (rootContext.fixedDate.value === "start") if (date.compare(rootContext.startValue.value) < 0) rootContext.startValue.value = date.copy();
				else rootContext.endValue.value = date.copy();
				else if (rootContext.fixedDate.value === "end") if (date.compare(rootContext.endValue.value) > 0) rootContext.endValue.value = date.copy();
				else rootContext.startValue.value = date.copy();
			}
		}
		function handleClick(e) {
			if (isDisabled.value) return;
			changeDate(e, props.day);
		}
		function handleFocus() {
			if (isDisabled.value || rootContext.isDateUnavailable?.(props.day)) return;
			rootContext.focusedValue.value = props.day.copy();
		}
		function handleArrowKey(e) {
			if (isDisabled.value) return;
			e.preventDefault();
			e.stopPropagation();
			const parentElement = rootContext.parentElement.value;
			const indexIncrementation = 7;
			const sign = rootContext.dir.value === "rtl" ? -1 : 1;
			switch (e.code) {
				case kbd.ARROW_RIGHT:
					shiftFocus(currentElement.value, sign);
					break;
				case kbd.ARROW_LEFT:
					shiftFocus(currentElement.value, -sign);
					break;
				case kbd.ARROW_UP:
					shiftFocus(currentElement.value, -indexIncrementation);
					break;
				case kbd.ARROW_DOWN:
					shiftFocus(currentElement.value, indexIncrementation);
					break;
				case kbd.ENTER:
				case kbd.SPACE_CODE: changeDate(e, props.day);
			}
			function shiftFocus(node, add) {
				const allCollectionItems = getSelectableCells(parentElement);
				if (!allCollectionItems.length) return;
				const index = allCollectionItems.indexOf(node);
				const newIndex = index + add;
				if (newIndex >= 0 && newIndex < allCollectionItems.length) {
					if (allCollectionItems[newIndex].hasAttribute("data-disabled")) shiftFocus(allCollectionItems[newIndex], add);
					allCollectionItems[newIndex].focus();
					return;
				}
				if (newIndex < 0) {
					if (rootContext.isPrevButtonDisabled()) return;
					rootContext.prevPage();
					nextTick(() => {
						const newCollectionItems = getSelectableCells(parentElement);
						if (!newCollectionItems.length) return;
						if (!rootContext.pagedNavigation.value && rootContext.numberOfMonths.value > 1) {
							const numberOfDays = getDaysInMonth(rootContext.placeholder.value);
							const computedIndex$1 = numberOfDays - Math.abs(newIndex);
							if (newCollectionItems[computedIndex$1].hasAttribute("data-disabled")) shiftFocus(newCollectionItems[computedIndex$1], add);
							newCollectionItems[computedIndex$1].focus();
							return;
						}
						const computedIndex = newCollectionItems.length - Math.abs(newIndex);
						if (newCollectionItems[computedIndex].hasAttribute("data-disabled")) shiftFocus(newCollectionItems[computedIndex], add);
						newCollectionItems[computedIndex].focus();
					});
					return;
				}
				if (newIndex >= allCollectionItems.length) {
					if (rootContext.isNextButtonDisabled()) return;
					rootContext.nextPage();
					nextTick(() => {
						const newCollectionItems = getSelectableCells(parentElement);
						if (!newCollectionItems.length) return;
						if (!rootContext.pagedNavigation.value && rootContext.numberOfMonths.value > 1) {
							const numberOfDays = getDaysInMonth(rootContext.placeholder.value.add({ months: rootContext.numberOfMonths.value - 1 }));
							const computedIndex$1 = newIndex - allCollectionItems.length + (newCollectionItems.length - numberOfDays);
							if (newCollectionItems[computedIndex$1].hasAttribute("data-disabled")) shiftFocus(newCollectionItems[computedIndex$1], add);
							newCollectionItems[computedIndex$1].focus();
							return;
						}
						const computedIndex = newIndex - allCollectionItems.length;
						if (newCollectionItems[computedIndex].hasAttribute("data-disabled")) shiftFocus(newCollectionItems[computedIndex], add);
						newCollectionItems[computedIndex].focus();
					});
				}
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({
				ref_key: "primitiveElement",
				ref: primitiveElement
			}, props, {
				role: "button",
				"aria-label": labelText.value,
				"data-reka-calendar-cell-trigger": "",
				"aria-selected": isSelectedDate.value && (allowNonContiguousRanges.value || !isUnavailable.value) ? true : void 0,
				"aria-disabled": isDisabled.value || isUnavailable.value ? true : void 0,
				"data-highlighted": isHighlighted.value && (allowNonContiguousRanges.value || !isUnavailable.value) ? "" : void 0,
				"data-selection-start": isSelectionStart.value ? true : void 0,
				"data-selection-end": isSelectionEnd.value ? true : void 0,
				"data-highlighted-start": isHighlightStart.value ? true : void 0,
				"data-highlighted-end": isHighlightEnd.value ? true : void 0,
				"data-selected": isSelectedDate.value && (allowNonContiguousRanges.value || !isUnavailable.value) ? true : void 0,
				"data-outside-visible-view": isOutsideVisibleView.value ? "" : void 0,
				"data-value": _ctx.day.toString(),
				"data-disabled": isDisabled.value ? "" : void 0,
				"data-unavailable": isUnavailable.value ? "" : void 0,
				"data-today": isDateToday.value ? "" : void 0,
				"data-outside-view": isOutsideView.value ? "" : void 0,
				"data-focused": isFocusedDate.value ? "" : void 0,
				tabindex: isFocusedDate.value ? 0 : isOutsideView.value || isDisabled.value ? void 0 : -1,
				onClick: handleClick,
				onFocusin: handleFocus,
				onMouseenter: handleFocus,
				onKeydown: withKeys(handleArrowKey, [
					"up",
					"down",
					"left",
					"right",
					"enter",
					"space"
				])
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					dayValue: dayValue.value,
					disabled: isDisabled.value,
					today: isDateToday.value,
					selected: isSelectedDate.value,
					outsideView: isOutsideView.value,
					outsideVisibleView: isOutsideVisibleView.value,
					unavailable: isUnavailable.value,
					highlighted: isHighlighted.value && (allowNonContiguousRanges.value || !isUnavailable.value),
					highlightedStart: isHighlightStart.value,
					highlightedEnd: isHighlightEnd.value,
					selectionStart: isSelectionStart.value,
					selectionEnd: isSelectionEnd.value
				}, () => [createTextVNode(toDisplayString(dayValue.value), 1)])]),
				_: 3
			}, 16, [
				"aria-label",
				"aria-selected",
				"aria-disabled",
				"data-highlighted",
				"data-selection-start",
				"data-selection-end",
				"data-highlighted-start",
				"data-highlighted-end",
				"data-selected",
				"data-outside-visible-view",
				"data-value",
				"data-disabled",
				"data-unavailable",
				"data-today",
				"data-outside-view",
				"data-focused",
				"tabindex"
			]);
		};
	}
});

//#endregion
//#region src/RangeCalendar/RangeCalendarCellTrigger.vue
var RangeCalendarCellTrigger_default = RangeCalendarCellTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RangeCalendarCellTrigger_default };
//# sourceMappingURL=RangeCalendarCellTrigger.js.map