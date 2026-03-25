import { defineComponent, openBlock, createElementBlock, normalizeClass, unref, Fragment, renderList, toDisplayString, createCommentVNode, createElementVNode, renderSlot } from 'vue';
import '../../../hooks/index.mjs';
import { dateTableProps, dateTableEmits } from './date-table.mjs';
import { useDateTable } from './use-date-table.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _hoisted_1 = { key: 0 };
const _hoisted_2 = ["onClick"];
const __default__ = defineComponent({
  name: "DateTable"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: dateTableProps,
  emits: dateTableEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const {
      isInRange,
      now,
      rows,
      weekDays,
      getFormattedDate,
      handlePickDay,
      getSlotData
    } = useDateTable(props, emit);
    const nsTable = useNamespace("calendar-table");
    const nsDay = useNamespace("calendar-day");
    const getCellClass = ({ text, type }) => {
      const classes = [type];
      if (type === "current") {
        const date = getFormattedDate(text, type);
        if (date.isSame(props.selectedDay, "day")) {
          classes.push(nsDay.is("selected"));
        }
        if (date.isSame(now, "day")) {
          classes.push(nsDay.is("today"));
        }
      }
      return classes;
    };
    expose({
      getFormattedDate
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("table", {
        class: normalizeClass([unref(nsTable).b(), unref(nsTable).is("range", unref(isInRange))]),
        cellspacing: "0",
        cellpadding: "0"
      }, [
        !_ctx.hideHeader ? (openBlock(), createElementBlock("thead", _hoisted_1, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(weekDays), (day) => {
            return openBlock(), createElementBlock("th", { key: day }, toDisplayString(day), 1);
          }), 128))
        ])) : createCommentVNode("v-if", true),
        createElementVNode("tbody", null, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(rows), (row, index) => {
            return openBlock(), createElementBlock("tr", {
              key: index,
              class: normalizeClass({
                [unref(nsTable).e("row")]: true,
                [unref(nsTable).em("row", "hide-border")]: index === 0 && _ctx.hideHeader
              })
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(row, (cell, key) => {
                return openBlock(), createElementBlock("td", {
                  key,
                  class: normalizeClass(getCellClass(cell)),
                  onClick: ($event) => unref(handlePickDay)(cell)
                }, [
                  createElementVNode("div", {
                    class: normalizeClass(unref(nsDay).b())
                  }, [
                    renderSlot(_ctx.$slots, "date-cell", {
                      data: unref(getSlotData)(cell)
                    }, () => [
                      createElementVNode("span", null, toDisplayString(cell.text), 1)
                    ])
                  ], 2)
                ], 10, _hoisted_2);
              }), 128))
            ], 2);
          }), 128))
        ])
      ], 2);
    };
  }
});
var DateTable = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/calendar/src/date-table.vue"]]);

export { DateTable as default };
//# sourceMappingURL=date-table2.mjs.map
