'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var dateTable = require('./date-table.js');
var useDateTable = require('./use-date-table.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = { key: 0 };
const _hoisted_2 = ["onClick"];
const __default__ = vue.defineComponent({
  name: "DateTable"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: dateTable.dateTableProps,
  emits: dateTable.dateTableEmits,
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
    } = useDateTable.useDateTable(props, emit);
    const nsTable = index.useNamespace("calendar-table");
    const nsDay = index.useNamespace("calendar-day");
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
      return vue.openBlock(), vue.createElementBlock("table", {
        class: vue.normalizeClass([vue.unref(nsTable).b(), vue.unref(nsTable).is("range", vue.unref(isInRange))]),
        cellspacing: "0",
        cellpadding: "0"
      }, [
        !_ctx.hideHeader ? (vue.openBlock(), vue.createElementBlock("thead", _hoisted_1, [
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(weekDays), (day) => {
            return vue.openBlock(), vue.createElementBlock("th", { key: day }, vue.toDisplayString(day), 1);
          }), 128))
        ])) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("tbody", null, [
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(rows), (row, index) => {
            return vue.openBlock(), vue.createElementBlock("tr", {
              key: index,
              class: vue.normalizeClass({
                [vue.unref(nsTable).e("row")]: true,
                [vue.unref(nsTable).em("row", "hide-border")]: index === 0 && _ctx.hideHeader
              })
            }, [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(row, (cell, key) => {
                return vue.openBlock(), vue.createElementBlock("td", {
                  key,
                  class: vue.normalizeClass(getCellClass(cell)),
                  onClick: ($event) => vue.unref(handlePickDay)(cell)
                }, [
                  vue.createElementVNode("div", {
                    class: vue.normalizeClass(vue.unref(nsDay).b())
                  }, [
                    vue.renderSlot(_ctx.$slots, "date-cell", {
                      data: vue.unref(getSlotData)(cell)
                    }, () => [
                      vue.createElementVNode("span", null, vue.toDisplayString(cell.text), 1)
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
var DateTable = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/calendar/src/date-table.vue"]]);

exports["default"] = DateTable;
//# sourceMappingURL=date-table2.js.map
