const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Calendar_CalendarRoot = require('./CalendarRoot.cjs');
const require_Calendar_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/Calendar/CalendarCellTrigger.vue?vue&type=script&setup=true&lang.ts
var CalendarCellTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CalendarCellTrigger",
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
		const kbd = require_shared_useKbd.useKbd();
		const rootContext = require_Calendar_CalendarRoot.injectCalendarRootContext();
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const dayValue = (0, vue.computed)(() => props.day.day.toLocaleString(rootContext.locale.value));
		const labelText = (0, vue.computed)(() => {
			return rootContext.formatter.custom(require_date_comparators.toDate(props.day), {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric"
			});
		});
		const isUnavailable = (0, vue.computed)(() => rootContext.isDateUnavailable?.(props.day) ?? false);
		const isDateToday = (0, vue.computed)(() => {
			return (0, __internationalized_date.isToday)(props.day, (0, __internationalized_date.getLocalTimeZone)());
		});
		const isOutsideView = (0, vue.computed)(() => {
			return !(0, __internationalized_date.isSameMonth)(props.day, props.month);
		});
		const isOutsideVisibleView = (0, vue.computed)(() => rootContext.isOutsideVisibleView(props.day));
		const isDisabled = (0, vue.computed)(() => rootContext.isDateDisabled(props.day) || rootContext.disableDaysOutsideCurrentView.value && isOutsideView.value);
		const isFocusedDate = (0, vue.computed)(() => {
			return !rootContext.disabled.value && (0, __internationalized_date.isSameDay)(props.day, rootContext.placeholder.value);
		});
		const isSelectedDate = (0, vue.computed)(() => rootContext.isDateSelected(props.day));
		function changeDate(date) {
			if (rootContext.readonly.value) return;
			if (rootContext.isDateDisabled(date) || rootContext.isDateUnavailable?.(date)) return;
			rootContext.onDateChange(date);
		}
		function handleClick() {
			if (isDisabled.value) return;
			changeDate(props.day);
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
				case kbd.SPACE_CODE: changeDate(props.day);
			}
			function shiftFocus(node, add) {
				const allCollectionItems = require_Calendar_utils.getSelectableCells(parentElement);
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
					(0, vue.nextTick)(() => {
						const newCollectionItems = require_Calendar_utils.getSelectableCells(parentElement);
						if (!newCollectionItems.length) return;
						if (!rootContext.pagedNavigation.value && rootContext.numberOfMonths.value > 1) {
							const numberOfDays = require_date_comparators.getDaysInMonth(rootContext.placeholder.value);
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
					(0, vue.nextTick)(() => {
						const newCollectionItems = require_Calendar_utils.getSelectableCells(parentElement);
						if (!newCollectionItems.length) return;
						if (!rootContext.pagedNavigation.value && rootContext.numberOfMonths.value > 1) {
							const numberOfDays = require_date_comparators.getDaysInMonth(rootContext.placeholder.value.add({ months: rootContext.numberOfMonths.value - 1 }));
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				ref_key: "primitiveElement",
				ref: primitiveElement
			}, props, {
				role: "button",
				"aria-label": labelText.value,
				"data-reka-calendar-cell-trigger": "",
				"aria-disabled": isDisabled.value || isUnavailable.value ? true : void 0,
				"data-selected": isSelectedDate.value ? true : void 0,
				"data-value": _ctx.day.toString(),
				"data-disabled": isDisabled.value ? "" : void 0,
				"data-unavailable": isUnavailable.value ? "" : void 0,
				"data-today": isDateToday.value ? "" : void 0,
				"data-outside-view": isOutsideView.value ? "" : void 0,
				"data-outside-visible-view": isOutsideVisibleView.value ? "" : void 0,
				"data-focused": isFocusedDate.value ? "" : void 0,
				tabindex: isFocusedDate.value ? 0 : isOutsideView.value || isDisabled.value ? void 0 : -1,
				onClick: handleClick,
				onKeydown: [(0, vue.withKeys)(handleArrowKey, [
					"up",
					"down",
					"left",
					"right",
					"space",
					"enter"
				]), _cache[0] || (_cache[0] = (0, vue.withKeys)((0, vue.withModifiers)(() => {}, ["prevent"]), ["enter"]))]
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					dayValue: dayValue.value,
					disabled: isDisabled.value,
					today: isDateToday.value,
					selected: isSelectedDate.value,
					outsideView: isOutsideView.value,
					outsideVisibleView: isOutsideVisibleView.value,
					unavailable: isUnavailable.value
				}, () => [(0, vue.createTextVNode)((0, vue.toDisplayString)(dayValue.value), 1)])]),
				_: 3
			}, 16, [
				"aria-label",
				"aria-disabled",
				"data-selected",
				"data-value",
				"data-disabled",
				"data-unavailable",
				"data-today",
				"data-outside-view",
				"data-outside-visible-view",
				"data-focused",
				"tabindex"
			]);
		};
	}
});

//#endregion
//#region src/Calendar/CalendarCellTrigger.vue
var CalendarCellTrigger_default = CalendarCellTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CalendarCellTrigger_default', {
  enumerable: true,
  get: function () {
    return CalendarCellTrigger_default;
  }
});
//# sourceMappingURL=CalendarCellTrigger.cjs.map