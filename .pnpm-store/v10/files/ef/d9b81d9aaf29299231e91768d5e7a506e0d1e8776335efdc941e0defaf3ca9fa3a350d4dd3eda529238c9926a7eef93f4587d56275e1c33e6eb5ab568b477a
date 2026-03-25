'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var headerRow = require('../header-row.js');
var shared = require('@vue/shared');

const TableV2HeaderRow = vue.defineComponent({
  name: "ElTableV2HeaderRow",
  props: headerRow.tableV2HeaderRowProps,
  setup(props, {
    slots
  }) {
    return () => {
      const {
        columns,
        columnsStyles,
        headerIndex,
        style
      } = props;
      let Cells = columns.map((column, columnIndex) => {
        return slots.cell({
          columns,
          column,
          columnIndex,
          headerIndex,
          style: columnsStyles[column.key]
        });
      });
      if (slots.header) {
        Cells = slots.header({
          cells: Cells.map((node) => {
            if (shared.isArray(node) && node.length === 1) {
              return node[0];
            }
            return node;
          }),
          columns,
          headerIndex
        });
      }
      return vue.createVNode("div", {
        "class": props.class,
        "style": style,
        "role": "row"
      }, [Cells]);
    };
  }
});

exports["default"] = TableV2HeaderRow;
//# sourceMappingURL=header-row.js.map
