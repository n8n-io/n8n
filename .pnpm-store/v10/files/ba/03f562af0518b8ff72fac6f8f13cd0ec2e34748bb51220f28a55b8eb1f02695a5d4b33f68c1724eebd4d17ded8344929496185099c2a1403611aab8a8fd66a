import { defineComponent, openBlock, createElementBlock, unref, normalizeClass, withModifiers, createElementVNode, toDisplayString, createCommentVNode, Fragment, renderList, createVNode } from 'vue';
import { basicDateTableProps, basicDateTableEmits } from '../props/basic-date-table.mjs';
import { useBasicDateTable, useBasicDateTableDOM } from '../composables/use-basic-date-table.mjs';
import ElDatePickerCell from './basic-cell-render.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';

const _hoisted_1 = ["aria-label"];
const _hoisted_2 = {
  key: 0,
  scope: "col"
};
const _hoisted_3 = ["aria-label"];
const _hoisted_4 = ["aria-current", "aria-selected", "tabindex"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "basic-date-table",
  props: basicDateTableProps,
  emits: basicDateTableEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const {
      WEEKS,
      rows,
      tbodyRef,
      currentCellRef,
      focus,
      isCurrent,
      isWeekActive,
      isSelectedCell,
      handlePickDate,
      handleMouseUp,
      handleMouseDown,
      handleMouseMove,
      handleFocus
    } = useBasicDateTable(props, emit);
    const { tableLabel, tableKls, weekLabel, getCellClasses, getRowKls, t } = useBasicDateTableDOM(props, {
      isCurrent,
      isWeekActive
    });
    expose({
      focus
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("table", {
        "aria-label": unref(tableLabel),
        class: normalizeClass(unref(tableKls)),
        cellspacing: "0",
        cellpadding: "0",
        role: "grid",
        onClick: _cache[1] || (_cache[1] = (...args) => unref(handlePickDate) && unref(handlePickDate)(...args)),
        onMousemove: _cache[2] || (_cache[2] = (...args) => unref(handleMouseMove) && unref(handleMouseMove)(...args)),
        onMousedown: _cache[3] || (_cache[3] = withModifiers((...args) => unref(handleMouseDown) && unref(handleMouseDown)(...args), ["prevent"])),
        onMouseup: _cache[4] || (_cache[4] = (...args) => unref(handleMouseUp) && unref(handleMouseUp)(...args))
      }, [
        createElementVNode("tbody", {
          ref_key: "tbodyRef",
          ref: tbodyRef
        }, [
          createElementVNode("tr", null, [
            _ctx.showWeekNumber ? (openBlock(), createElementBlock("th", _hoisted_2, toDisplayString(unref(weekLabel)), 1)) : createCommentVNode("v-if", true),
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(WEEKS), (week, key) => {
              return openBlock(), createElementBlock("th", {
                key,
                "aria-label": unref(t)("el.datepicker.weeksFull." + week),
                scope: "col"
              }, toDisplayString(unref(t)("el.datepicker.weeks." + week)), 9, _hoisted_3);
            }), 128))
          ]),
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(rows), (row, rowKey) => {
            return openBlock(), createElementBlock("tr", {
              key: rowKey,
              class: normalizeClass(unref(getRowKls)(row[1]))
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(row, (cell, columnKey) => {
                return openBlock(), createElementBlock("td", {
                  key: `${rowKey}.${columnKey}`,
                  ref_for: true,
                  ref: (el) => unref(isSelectedCell)(cell) && (currentCellRef.value = el),
                  class: normalizeClass(unref(getCellClasses)(cell)),
                  "aria-current": cell.isCurrent ? "date" : void 0,
                  "aria-selected": cell.isCurrent,
                  tabindex: unref(isSelectedCell)(cell) ? 0 : -1,
                  onFocus: _cache[0] || (_cache[0] = (...args) => unref(handleFocus) && unref(handleFocus)(...args))
                }, [
                  createVNode(unref(ElDatePickerCell), { cell }, null, 8, ["cell"])
                ], 42, _hoisted_4);
              }), 128))
            ], 2);
          }), 128))
        ], 512)
      ], 42, _hoisted_1);
    };
  }
});
var DateTable = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/date-picker/src/date-picker-com/basic-date-table.vue"]]);

export { DateTable as default };
//# sourceMappingURL=basic-date-table.mjs.map
