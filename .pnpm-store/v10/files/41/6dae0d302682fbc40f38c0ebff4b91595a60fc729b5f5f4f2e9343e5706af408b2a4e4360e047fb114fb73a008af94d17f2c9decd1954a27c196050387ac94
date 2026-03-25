'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
require('../../../../hooks/index.js');
require('../../../time-picker/index.js');
require('../../../../utils/index.js');
var basicYearTable = require('../props/basic-year-table.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var utils = require('../../../time-picker/src/utils.js');
var index = require('../../../../hooks/use-namespace/index.js');
var index$1 = require('../../../../hooks/use-locale/index.js');
var arrays = require('../../../../utils/arrays.js');
var style = require('../../../../utils/dom/style.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const _hoisted_1 = ["aria-label"];
const _hoisted_2 = ["aria-selected", "tabindex", "onKeydown"];
const _hoisted_3 = { class: "cell" };
const _hoisted_4 = { key: 1 };
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "basic-year-table",
  props: basicYearTable.basicYearTableProps,
  emits: ["pick"],
  setup(__props, { expose, emit }) {
    const props = __props;
    const datesInYear = (year, lang2) => {
      const firstDay = dayjs__default["default"](String(year)).locale(lang2).startOf("year");
      const lastDay = firstDay.endOf("year");
      const numOfDays = lastDay.dayOfYear();
      return utils.rangeArr(numOfDays).map((n) => firstDay.add(n, "day").toDate());
    };
    const ns = index.useNamespace("year-table");
    const { t, lang } = index$1.useLocale();
    const tbodyRef = vue.ref();
    const currentCellRef = vue.ref();
    const startYear = vue.computed(() => {
      return Math.floor(props.date.year() / 10) * 10;
    });
    const focus = () => {
      var _a;
      (_a = currentCellRef.value) == null ? void 0 : _a.focus();
    };
    const getCellKls = (year) => {
      const kls = {};
      const today = dayjs__default["default"]().locale(lang.value);
      kls.disabled = props.disabledDate ? datesInYear(year, lang.value).every(props.disabledDate) : false;
      kls.current = arrays.castArray(props.parsedValue).findIndex((d) => d.year() === year) >= 0;
      kls.today = today.year() === year;
      return kls;
    };
    const isSelectedCell = (year) => {
      return year === startYear.value && props.date.year() < startYear.value && props.date.year() > startYear.value + 9 || arrays.castArray(props.date).findIndex((date) => date.year() === year) >= 0;
    };
    const handleYearTableClick = (event) => {
      const clickTarget = event.target;
      const target = clickTarget.closest("td");
      if (target && target.textContent) {
        if (style.hasClass(target, "disabled"))
          return;
        const year = target.textContent || target.innerText;
        emit("pick", Number(year));
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
        "aria-label": vue.unref(t)("el.datepicker.yearTablePrompt"),
        class: vue.normalizeClass(vue.unref(ns).b()),
        onClick: handleYearTableClick
      }, [
        vue.createElementVNode("tbody", {
          ref_key: "tbodyRef",
          ref: tbodyRef
        }, [
          (vue.openBlock(), vue.createElementBlock(vue.Fragment, null, vue.renderList(3, (_, i) => {
            return vue.createElementVNode("tr", { key: i }, [
              (vue.openBlock(), vue.createElementBlock(vue.Fragment, null, vue.renderList(4, (__, j) => {
                return vue.openBlock(), vue.createElementBlock(vue.Fragment, {
                  key: i + "_" + j
                }, [
                  i * 4 + j < 10 ? (vue.openBlock(), vue.createElementBlock("td", {
                    key: 0,
                    ref_for: true,
                    ref: (el) => isSelectedCell(vue.unref(startYear) + i * 4 + j) && (currentCellRef.value = el),
                    class: vue.normalizeClass(["available", getCellKls(vue.unref(startYear) + i * 4 + j)]),
                    "aria-selected": `${isSelectedCell(vue.unref(startYear) + i * 4 + j)}`,
                    tabindex: isSelectedCell(vue.unref(startYear) + i * 4 + j) ? 0 : -1,
                    onKeydown: [
                      vue.withKeys(vue.withModifiers(handleYearTableClick, ["prevent", "stop"]), ["space"]),
                      vue.withKeys(vue.withModifiers(handleYearTableClick, ["prevent", "stop"]), ["enter"])
                    ]
                  }, [
                    vue.createElementVNode("span", _hoisted_3, vue.toDisplayString(vue.unref(startYear) + i * 4 + j), 1)
                  ], 42, _hoisted_2)) : (vue.openBlock(), vue.createElementBlock("td", _hoisted_4))
                ], 64);
              }), 64))
            ]);
          }), 64))
        ], 512)
      ], 10, _hoisted_1);
    };
  }
});
var YearTable = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/date-picker/src/date-picker-com/basic-year-table.vue"]]);

exports["default"] = YearTable;
//# sourceMappingURL=basic-year-table.js.map
