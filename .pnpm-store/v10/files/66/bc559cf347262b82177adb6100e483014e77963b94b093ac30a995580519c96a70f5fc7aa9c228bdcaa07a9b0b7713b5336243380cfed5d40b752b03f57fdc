'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var row = require('../row.js');
var tokens = require('../tokens.js');
var _private = require('../private.js');
var types = require('../../../../utils/types.js');
var shared = require('@vue/shared');

const useTableRow = (props) => {
  const {
    isScrolling
  } = vue.inject(tokens.TableV2InjectionKey);
  const measured = vue.ref(false);
  const rowRef = vue.ref();
  const measurable = vue.computed(() => {
    return types.isNumber(props.estimatedRowHeight) && props.rowIndex >= 0;
  });
  const doMeasure = (isInit = false) => {
    const $rowRef = vue.unref(rowRef);
    if (!$rowRef)
      return;
    const {
      columns,
      onRowHeightChange,
      rowKey,
      rowIndex,
      style
    } = props;
    const {
      height
    } = $rowRef.getBoundingClientRect();
    measured.value = true;
    vue.nextTick(() => {
      if (isInit || height !== Number.parseInt(style.height)) {
        const firstColumn = columns[0];
        const isPlaceholder = (firstColumn == null ? void 0 : firstColumn.placeholderSign) === _private.placeholderSign;
        onRowHeightChange == null ? void 0 : onRowHeightChange({
          rowKey,
          height,
          rowIndex
        }, firstColumn && !isPlaceholder && firstColumn.fixed);
      }
    });
  };
  const eventHandlers = vue.computed(() => {
    const {
      rowData,
      rowIndex,
      rowKey,
      onRowHover
    } = props;
    const handlers = props.rowEventHandlers || {};
    const eventHandlers2 = {};
    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (shared.isFunction(handler)) {
        eventHandlers2[eventName] = (event) => {
          handler({
            event,
            rowData,
            rowIndex,
            rowKey
          });
        };
      }
    });
    if (onRowHover) {
      ;
      [{
        name: "onMouseleave",
        hovered: false
      }, {
        name: "onMouseenter",
        hovered: true
      }].forEach(({
        name,
        hovered
      }) => {
        const existedHandler = eventHandlers2[name];
        eventHandlers2[name] = (event) => {
          onRowHover({
            event,
            hovered,
            rowData,
            rowIndex,
            rowKey
          });
          existedHandler == null ? void 0 : existedHandler(event);
        };
      });
    }
    return eventHandlers2;
  });
  const onExpand = (expanded) => {
    const {
      onRowExpand,
      rowData,
      rowIndex,
      rowKey
    } = props;
    onRowExpand == null ? void 0 : onRowExpand({
      expanded,
      rowData,
      rowIndex,
      rowKey
    });
  };
  vue.onMounted(() => {
    if (vue.unref(measurable)) {
      doMeasure(true);
    }
  });
  return {
    isScrolling,
    measurable,
    measured,
    rowRef,
    eventHandlers,
    onExpand
  };
};
const COMPONENT_NAME = "ElTableV2TableRow";
const TableV2Row = vue.defineComponent({
  name: COMPONENT_NAME,
  props: row.tableV2RowProps,
  setup(props, {
    expose,
    slots,
    attrs
  }) {
    const {
      eventHandlers,
      isScrolling,
      measurable,
      measured,
      rowRef,
      onExpand
    } = useTableRow(props);
    expose({
      onExpand
    });
    return () => {
      const {
        columns,
        columnsStyles,
        expandColumnKey,
        depth,
        rowData,
        rowIndex,
        style
      } = props;
      let ColumnCells = columns.map((column, columnIndex) => {
        const expandable = shared.isArray(rowData.children) && rowData.children.length > 0 && column.key === expandColumnKey;
        return slots.cell({
          column,
          columns,
          columnIndex,
          depth,
          style: columnsStyles[column.key],
          rowData,
          rowIndex,
          isScrolling: vue.unref(isScrolling),
          expandIconProps: expandable ? {
            rowData,
            rowIndex,
            onExpand
          } : void 0
        });
      });
      if (slots.row) {
        ColumnCells = slots.row({
          cells: ColumnCells.map((node) => {
            if (shared.isArray(node) && node.length === 1) {
              return node[0];
            }
            return node;
          }),
          style,
          columns,
          depth,
          rowData,
          rowIndex,
          isScrolling: vue.unref(isScrolling)
        });
      }
      if (vue.unref(measurable)) {
        const {
          height,
          ...exceptHeightStyle
        } = style || {};
        const _measured = vue.unref(measured);
        return vue.createVNode("div", vue.mergeProps({
          "ref": rowRef,
          "class": props.class,
          "style": _measured ? style : exceptHeightStyle,
          "role": "row"
        }, attrs, vue.unref(eventHandlers)), [ColumnCells]);
      }
      return vue.createVNode("div", vue.mergeProps(attrs, {
        "ref": rowRef,
        "class": props.class,
        "style": style,
        "role": "row"
      }, vue.unref(eventHandlers)), [ColumnCells]);
    };
  }
});

exports["default"] = TableV2Row;
//# sourceMappingURL=row.js.map
