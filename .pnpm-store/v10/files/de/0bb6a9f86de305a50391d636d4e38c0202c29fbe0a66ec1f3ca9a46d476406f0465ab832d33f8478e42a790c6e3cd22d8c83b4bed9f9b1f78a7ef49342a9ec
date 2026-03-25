import { defineComponent, createVNode } from 'vue';
import '../../../../utils/index.mjs';
import { tableV2HeaderRowProps } from '../header-row.mjs';
import { isArray } from '@vue/shared';

const TableV2HeaderRow = defineComponent({
  name: "ElTableV2HeaderRow",
  props: tableV2HeaderRowProps,
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
            if (isArray(node) && node.length === 1) {
              return node[0];
            }
            return node;
          }),
          columns,
          headerIndex
        });
      }
      return createVNode("div", {
        "class": props.class,
        "style": style,
        "role": "row"
      }, [Cells]);
    };
  }
});

export { TableV2HeaderRow as default };
//# sourceMappingURL=header-row.mjs.map
