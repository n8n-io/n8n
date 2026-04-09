const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_YearPicker_YearPickerRoot = require('./YearPickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/YearPicker/YearPickerCellTrigger.vue?vue&type=script&setup=true&lang.ts
var YearPickerCellTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const kbd = require_shared_useKbd.useKbd();
		const rootContext = require_YearPicker_YearPickerRoot.injectYearPickerRootContext();
		const { primitiveElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const yearValue = (0, vue.computed)(() => {
			rootContext.locale.value;
			return rootContext.formatter.fullYear(require_date_comparators.toDate(props.year));
		});
		const labelText = (0, vue.computed)(() => {
			rootContext.locale.value;
			return rootContext.formatter.custom(require_date_comparators.toDate(props.year), { year: "numeric" });
		});
		const isUnavailable = (0, vue.computed)(() => rootContext.isYearUnavailable?.(props.year) ?? false);
		const isCurrentYear = (0, vue.computed)(() => {
			const todayDate = (0, __internationalized_date.toCalendar)((0, __internationalized_date.today)((0, __internationalized_date.getLocalTimeZone)()), props.year.calendar);
			return require_date_comparators.isSameYear(props.year, todayDate);
		});
		const isDisabled = (0, vue.computed)(() => rootContext.isYearDisabled(props.year));
		const isFocusedYear = (0, vue.computed)(() => {
			return !rootContext.disabled.value && require_date_comparators.isSameYear(props.year, rootContext.placeholder.value);
		});
		const isSelectedYear = (0, vue.computed)(() => rootContext.isYearSelected(props.year));
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
				if (rootContext.minValue.value && (0, __internationalized_date.endOfYear)(candidateYearValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && (0, __internationalized_date.startOfYear)(candidateYearValue).compare(rootContext.maxValue.value) > 0) return;
				const candidateYear = parentElement.querySelector(`[data-value='${candidateYearValue.toString()}']`);
				if (!candidateYear) {
					if (add > 0) {
						if (rootContext.isNextButtonDisabled()) return;
						rootContext.nextPage();
					} else {
						if (rootContext.isPrevButtonDisabled()) return;
						rootContext.prevPage();
					}
					(0, vue.nextTick)(() => {
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
				if (rootContext.minValue.value && (0, __internationalized_date.endOfYear)(candidateYearValue).compare(rootContext.minValue.value) < 0 || rootContext.maxValue.value && (0, __internationalized_date.startOfYear)(candidateYearValue).compare(rootContext.maxValue.value) > 0) return;
				if (direction > 0) {
					if (rootContext.isNextButtonDisabled()) return;
					rootContext.nextPage();
				} else {
					if (rootContext.isPrevButtonDisabled()) return;
					rootContext.prevPage();
				}
				(0, vue.nextTick)(() => {
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
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
					yearValue: yearValue.value,
					disabled: isDisabled.value,
					today: isCurrentYear.value,
					selected: isSelectedYear.value,
					unavailable: isUnavailable.value
				}, () => [(0, vue.createTextVNode)((0, vue.toDisplayString)(yearValue.value), 1)])]),
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
Object.defineProperty(exports, 'YearPickerCellTrigger_default', {
  enumerable: true,
  get: function () {
    return YearPickerCellTrigger_default;
  }
});
//# sourceMappingURL=YearPickerCellTrigger.cjs.map