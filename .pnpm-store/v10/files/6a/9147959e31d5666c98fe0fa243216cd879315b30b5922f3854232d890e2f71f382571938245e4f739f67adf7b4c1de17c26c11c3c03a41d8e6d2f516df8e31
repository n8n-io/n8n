import { defineComponent, ref, computed, watch, nextTick, openBlock, createElementBlock, unref, normalizeClass, createElementVNode, Fragment, renderList, withKeys, withModifiers, toDisplayString } from 'vue';
import dayjs from 'dayjs';
import '../../../../hooks/index.mjs';
import '../../../time-picker/index.mjs';
import '../../../../utils/index.mjs';
import { basicYearTableProps } from '../props/basic-year-table.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { rangeArr } from '../../../time-picker/src/utils.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { useLocale } from '../../../../hooks/use-locale/index.mjs';
import { castArray } from '../../../../utils/arrays.mjs';
import { hasClass } from '../../../../utils/dom/style.mjs';

const _hoisted_1 = ["aria-label"];
const _hoisted_2 = ["aria-selected", "tabindex", "onKeydown"];
const _hoisted_3 = { class: "cell" };
const _hoisted_4 = { key: 1 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "basic-year-table",
  props: basicYearTableProps,
  emits: ["pick"],
  setup(__props, { expose, emit }) {
    const props = __props;
    const datesInYear = (year, lang2) => {
      const firstDay = dayjs(String(year)).locale(lang2).startOf("year");
      const lastDay = firstDay.endOf("year");
      const numOfDays = lastDay.dayOfYear();
      return rangeArr(numOfDays).map((n) => firstDay.add(n, "day").toDate());
    };
    const ns = useNamespace("year-table");
    const { t, lang } = useLocale();
    const tbodyRef = ref();
    const currentCellRef = ref();
    const startYear = computed(() => {
      return Math.floor(props.date.year() / 10) * 10;
    });
    const focus = () => {
      var _a;
      (_a = currentCellRef.value) == null ? void 0 : _a.focus();
    };
    const getCellKls = (year) => {
      const kls = {};
      const today = dayjs().locale(lang.value);
      kls.disabled = props.disabledDate ? datesInYear(year, lang.value).every(props.disabledDate) : false;
      kls.current = castArray(props.parsedValue).findIndex((d) => d.year() === year) >= 0;
      kls.today = today.year() === year;
      return kls;
    };
    const isSelectedCell = (year) => {
      return year === startYear.value && props.date.year() < startYear.value && props.date.year() > startYear.value + 9 || castArray(props.date).findIndex((date) => date.year() === year) >= 0;
    };
    const handleYearTableClick = (event) => {
      const clickTarget = event.target;
      const target = clickTarget.closest("td");
      if (target && target.textContent) {
        if (hasClass(target, "disabled"))
          return;
        const year = target.textContent || target.innerText;
        emit("pick", Number(year));
      }
    };
    watch(() => props.date, async () => {
      var _a, _b;
      if ((_a = tbodyRef.value) == null ? void 0 : _a.contains(document.activeElement)) {
        await nextTick();
        (_b = currentCellRef.value) == null ? void 0 : _b.focus();
      }
    });
    expose({
      focus
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("table", {
        role: "grid",
        "aria-label": unref(t)("el.datepicker.yearTablePrompt"),
        class: normalizeClass(unref(ns).b()),
        onClick: handleYearTableClick
      }, [
        createElementVNode("tbody", {
          ref_key: "tbodyRef",
          ref: tbodyRef
        }, [
          (openBlock(), createElementBlock(Fragment, null, renderList(3, (_, i) => {
            return createElementVNode("tr", { key: i }, [
              (openBlock(), createElementBlock(Fragment, null, renderList(4, (__, j) => {
                return openBlock(), createElementBlock(Fragment, {
                  key: i + "_" + j
                }, [
                  i * 4 + j < 10 ? (openBlock(), createElementBlock("td", {
                    key: 0,
                    ref_for: true,
                    ref: (el) => isSelectedCell(unref(startYear) + i * 4 + j) && (currentCellRef.value = el),
                    class: normalizeClass(["available", getCellKls(unref(startYear) + i * 4 + j)]),
                    "aria-selected": `${isSelectedCell(unref(startYear) + i * 4 + j)}`,
                    tabindex: isSelectedCell(unref(startYear) + i * 4 + j) ? 0 : -1,
                    onKeydown: [
                      withKeys(withModifiers(handleYearTableClick, ["prevent", "stop"]), ["space"]),
                      withKeys(withModifiers(handleYearTableClick, ["prevent", "stop"]), ["enter"])
                    ]
                  }, [
                    createElementVNode("span", _hoisted_3, toDisplayString(unref(startYear) + i * 4 + j), 1)
                  ], 42, _hoisted_2)) : (openBlock(), createElementBlock("td", _hoisted_4))
                ], 64);
              }), 64))
            ]);
          }), 64))
        ], 512)
      ], 10, _hoisted_1);
    };
  }
});
var YearTable = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/date-picker/src/date-picker-com/basic-year-table.vue"]]);

export { YearTable as default };
//# sourceMappingURL=basic-year-table.mjs.map
