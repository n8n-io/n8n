const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_MonthPicker_MonthPickerRoot = require('./MonthPickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/MonthPicker/MonthPickerCellTrigger.vue?vue&type=script&setup=true&lang.ts
var MonthPickerCellTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const kbd = require_shared_useKbd.useKbd();
		const rootContext = require_MonthPicker_MonthPickerRoot.injectMonthPickerRootContext();
		const { primitiveElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const shortMonthValue = (0, vue.computed)(() => {
			rootContext.locale.value;
			return rootContext.formatter.custom(require_date_comparators.toDate(props.month), { month: "short" });
		});
		const labelText = (0, vue.computed)(() => {
			rootContext.locale.value;
			return rootContext.formatter.custom(require_date_comparators.toDate(props.month), {
				month: "long",
				year: "numeric"
			});
		});
		const isUnavailable = (0, vue.computed)(() => rootContext.isMonthUnavailable?.(props.month) ?? false);
		const isCurrentMonth = (0, vue.computed)(() => {
			const todayDate = (0, __internationalized_date.toCalendar)((0, __internationalized_date.today)((0, __internationalized_date.getLocalTimeZone)()), props.month.calendar);
			return require_date_comparators.isSameYearMonth(props.month, todayDate);
		});
		const isDisabled = (0, vue.computed)(() => rootContext.isMonthDisabled(props.month));
		const isFocusedMonth = (0, vue.computed)(() => {
			return !rootContext.disabled.value && require_date_comparators.isSameYearMonth(props.month, rootContext.placeholder.value);
		});
		const isSelectedMonth = (0, vue.computed)(() => rootContext.isMonthSelected(props.month));
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
				if (rootContext.minValue.value && (0, __internationalized_date.endOfMonth)(candidateMonthValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && candidateMonthValue.set({ day: 1 }).compare(rootContext.maxValue.value) > 0) return;
				const candidateMonth = parentElement.querySelector(`[data-value='${candidateMonthValue.toString()}']`);
				if (!candidateMonth) {
					if (add > 0) {
						if (rootContext.isNextButtonDisabled()) return;
						rootContext.nextPage();
					} else {
						if (rootContext.isPrevButtonDisabled()) return;
						rootContext.prevPage();
					}
					(0, vue.nextTick)(() => {
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
				if (rootContext.minValue.value && (0, __internationalized_date.endOfMonth)(candidateMonthValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && candidateMonthValue.set({ day: 1 }).compare(rootContext.maxValue.value) > 0) return;
				if (years > 0) {
					if (rootContext.isNextButtonDisabled()) return;
					rootContext.nextPage();
				} else {
					if (rootContext.isPrevButtonDisabled()) return;
					rootContext.prevPage();
				}
				(0, vue.nextTick)(() => {
					const candidateMonth = parentElement.querySelector(`[data-value='${candidateMonthValue.toString()}']`);
					if (candidateMonth && !candidateMonth.hasAttribute("data-disabled")) {
						rootContext.onPlaceholderChange(candidateMonthValue);
						candidateMonth?.focus();
					}
				});
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
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
				onKeydown: [(0, vue.withKeys)(handleArrowKey, [
					"up",
					"down",
					"left",
					"right",
					"space",
					"enter",
					"page-up",
					"page-down"
				]), _cache[0] || (_cache[0] = (0, vue.withKeys)((0, vue.withModifiers)(() => {}, ["prevent"]), ["enter"]))]
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					monthValue: shortMonthValue.value,
					disabled: isDisabled.value,
					today: isCurrentMonth.value,
					selected: isSelectedMonth.value,
					unavailable: isUnavailable.value
				}, () => [(0, vue.createTextVNode)((0, vue.toDisplayString)(shortMonthValue.value), 1)])]),
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
Object.defineProperty(exports, 'MonthPickerCellTrigger_default', {
  enumerable: true,
  get: function () {
    return MonthPickerCellTrigger_default;
  }
});
//# sourceMappingURL=MonthPickerCellTrigger.cjs.map