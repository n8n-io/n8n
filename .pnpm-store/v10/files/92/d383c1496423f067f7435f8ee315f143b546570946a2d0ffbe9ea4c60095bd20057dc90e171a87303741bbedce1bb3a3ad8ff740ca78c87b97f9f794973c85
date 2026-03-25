'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
require('../../../../hooks/index.js');
require('../../../time-picker/index.js');
require('../../../../utils/index.js');
var basicMonthTable = require('../props/basic-month-table.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var utils = require('../../../time-picker/src/utils.js');
var index = require('../../../../hooks/use-namespace/index.js');
var index$1 = require('../../../../hooks/use-locale/index.js');
var arrays = require('../../../../utils/arrays.js');
var style = require('../../../../utils/dom/style.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const _hoisted_1 = ["aria-label"];
const _hoisted_2 = ["aria-selected", "aria-label", "tabindex", "onKeydown"];
const _hoisted_3 = { class: "cell" };
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "basic-month-table",
  props: basicMonthTable.basicMonthTableProps,
  emits: ["changerange", "pick", "select"],
  setup(__props, { expose, emit }) {
    const props = __props;
    const datesInMonth = (year, month, lang2) => {
      const firstDay = dayjs__default["default"]().locale(lang2).startOf("month").month(month).year(year);
      const numOfDays = firstDay.daysInMonth();
      return utils.rangeArr(numOfDays).map((n) => firstDay.add(n, "day").toDate());
    };
    const ns = index.useNamespace("month-table");
    const { t, lang } = index$1.useLocale();
    const tbodyRef = vue.ref();
    const currentCellRef = vue.ref();
    const months = vue.ref(props.date.locale("en").localeData().monthsShort().map((_) => _.toLowerCase()));
    const tableRows = vue.ref([
      [],
      [],
      []
    ]);
    const lastRow = vue.ref();
    const lastColumn = vue.ref();
    const rows = vue.computed(() => {
      var _a, _b;
      const rows2 = tableRows.value;
      const now = dayjs__default["default"]().locale(lang.value).startOf("month");
      for (let i = 0; i < 3; i++) {
        const row = rows2[i];
        for (let j = 0; j < 4; j++) {
          const cell = row[j] || (row[j] = {
            row: i,
            column: j,
            type: "normal",
            inRange: false,
            start: false,
            end: false,
            text: -1,
            disabled: false
          });
          cell.type = "normal";
          const index = i * 4 + j;
          const calTime = props.date.startOf("year").month(index);
          const calEndDate = props.rangeState.endDate || props.maxDate || props.rangeState.selecting && props.minDate || null;
          cell.inRange = !!(props.minDate && calTime.isSameOrAfter(props.minDate, "month") && calEndDate && calTime.isSameOrBefore(calEndDate, "month")) || !!(props.minDate && calTime.isSameOrBefore(props.minDate, "month") && calEndDate && calTime.isSameOrAfter(calEndDate, "month"));
          if ((_a = props.minDate) == null ? void 0 : _a.isSameOrAfter(calEndDate)) {
            cell.start = !!(calEndDate && calTime.isSame(calEndDate, "month"));
            cell.end = props.minDate && calTime.isSame(props.minDate, "month");
          } else {
            cell.start = !!(props.minDate && calTime.isSame(props.minDate, "month"));
            cell.end = !!(calEndDate && calTime.isSame(calEndDate, "month"));
          }
          const isToday = now.isSame(calTime);
          if (isToday) {
            cell.type = "today";
          }
          cell.text = index;
          cell.disabled = ((_b = props.disabledDate) == null ? void 0 : _b.call(props, calTime.toDate())) || false;
        }
      }
      return rows2;
    });
    const focus = () => {
      var _a;
      (_a = currentCellRef.value) == null ? void 0 : _a.focus();
    };
    const getCellStyle = (cell) => {
      const style = {};
      const year = props.date.year();
      const today = new Date();
      const month = cell.text;
      style.disabled = props.disabledDate ? datesInMonth(year, month, lang.value).every(props.disabledDate) : false;
      style.current = arrays.castArray(props.parsedValue).findIndex((date) => dayjs__default["default"].isDayjs(date) && date.year() === year && date.month() === month) >= 0;
      style.today = today.getFullYear() === year && today.getMonth() === month;
      if (cell.inRange) {
        style["in-range"] = true;
        if (cell.start) {
          style["start-date"] = true;
        }
        if (cell.end) {
          style["end-date"] = true;
        }
      }
      return style;
    };
    const isSelectedCell = (cell) => {
      const year = props.date.year();
      const month = cell.text;
      return arrays.castArray(props.date).findIndex((date) => date.year() === year && date.month() === month) >= 0;
    };
    const handleMouseMove = (event) => {
      var _a;
      if (!props.rangeState.selecting)
        return;
      let target = event.target;
      if (target.tagName === "A") {
        target = (_a = target.parentNode) == null ? void 0 : _a.parentNode;
      }
      if (target.tagName === "DIV") {
        target = target.parentNode;
      }
      if (target.tagName !== "TD")
        return;
      const row = target.parentNode.rowIndex;
      const column = target.cellIndex;
      if (rows.value[row][column].disabled)
        return;
      if (row !== lastRow.value || column !== lastColumn.value) {
        lastRow.value = row;
        lastColumn.value = column;
        emit("changerange", {
          selecting: true,
          endDate: props.date.startOf("year").month(row * 4 + column)
        });
      }
    };
    const handleMonthTableClick = (event) => {
      var _a;
      const target = (_a = event.target) == null ? void 0 : _a.closest("td");
      if ((target == null ? void 0 : target.tagName) !== "TD")
        return;
      if (style.hasClass(target, "disabled"))
        return;
      const column = target.cellIndex;
      const row = target.parentNode.rowIndex;
      const month = row * 4 + column;
      const newDate = props.date.startOf("year").month(month);
      if (props.selectionMode === "range") {
        if (!props.rangeState.selecting) {
          emit("pick", { minDate: newDate, maxDate: null });
          emit("select", true);
        } else {
          if (props.minDate && newDate >= props.minDate) {
            emit("pick", { minDate: props.minDate, maxDate: newDate });
          } else {
            emit("pick", { minDate: newDate, maxDate: props.minDate });
          }
          emit("select", false);
        }
      } else {
        emit("pick", month);
      }
    };
    vue.watch(() => props.date, async () => {
      var _a, _b;
      if ((_a = tbodyRef.value) == null ? void 0 : _a.contains(document.activeElement)) {
        await vue.nextTick();
        (_b = currentCellRef.value) == null ? void 0 : _b.focus();
      }
    });
    expose({
      focus
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("table", {
        role: "grid",
        "aria-label": vue.unref(t)("el.datepicker.monthTablePrompt"),
        class: vue.normalizeClass(vue.unref(ns).b()),
        onClick: handleMonthTableClick,
        onMousemove: handleMouseMove
      }, [
        vue.createElementVNode("tbody", {
          ref_key: "tbodyRef",
          ref: tbodyRef
        }, [
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(rows), (row, key) => {
            return vue.openBlock(), vue.createElementBlock("tr", { key }, [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(row, (cell, key_) => {
                return vue.openBlock(), vue.createElementBlock("td", {
                  key: key_,
                  ref_for: true,
                  ref: (el) => isSelectedCell(cell) && (currentCellRef.value = el),
                  class: vue.normalizeClass(getCellStyle(cell)),
                  "aria-selected": `${isSelectedCell(cell)}`,
                  "aria-label": vue.unref(t)(`el.datepicker.month${+cell.text + 1}`),
                  tabindex: isSelectedCell(cell) ? 0 : -1,
                  onKeydown: [
                    vue.withKeys(vue.withModifiers(handleMonthTableClick, ["prevent", "stop"]), ["space"]),
                    vue.withKeys(vue.withModifiers(handleMonthTableClick, ["prevent", "stop"]), ["enter"])
                  ]
                }, [
                  vue.createElementVNode("div", null, [
                    vue.createElementVNode("span", _hoisted_3, vue.toDisplayString(vue.unref(t)("el.datepicker.months." + months.value[cell.text])), 1)
                  ])
                ], 42, _hoisted_2);
              }), 128))
            ]);
          }), 128))
        ], 512)
      ], 42, _hoisted_1);
    };
  }
});
var MonthTable = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/date-picker/src/date-picker-com/basic-month-table.vue"]]);

exports["default"] = MonthTable;
//# sourceMappingURL=basic-month-table.js.map
