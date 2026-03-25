'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
require('../../../../utils/index.js');
var header = require('../header.js');
var utils = require('../utils.js');
var index = require('../../../../hooks/use-namespace/index.js');
var lodashUnified = require('lodash-unified');

const COMPONENT_NAME = "ElTableV2Header";
const TableV2Header = vue.defineComponent({
  name: COMPONENT_NAME,
  props: header.tableV2HeaderProps,
  setup(props, {
    slots,
    expose
  }) {
    const ns = index.useNamespace("table-v2");
    const headerRef = vue.ref();
    const headerStyle = vue.computed(() => utils.enforceUnit({
      width: props.width,
      height: props.height
    }));
    const rowStyle = vue.computed(() => utils.enforceUnit({
      width: props.rowWidth,
      height: props.height
    }));
    const headerHeights = vue.computed(() => lodashUnified.castArray(vue.unref(props.headerHeight)));
    const scrollToLeft = (left) => {
      const headerEl = vue.unref(headerRef);
      vue.nextTick(() => {
        (headerEl == null ? void 0 : headerEl.scroll) && headerEl.scroll({
          left
        });
      });
    };
    const renderFixedRows = () => {
      const fixedRowClassName = ns.e("fixed-header-row");
      const {
        columns,
        fixedHeaderData,
        rowHeight
      } = props;
      return fixedHeaderData == null ? void 0 : fixedHeaderData.map((fixedRowData, fixedRowIndex) => {
        var _a;
        const style = utils.enforceUnit({
          height: rowHeight,
          width: "100%"
        });
        return (_a = slots.fixed) == null ? void 0 : _a.call(slots, {
          class: fixedRowClassName,
          columns,
          rowData: fixedRowData,
          rowIndex: -(fixedRowIndex + 1),
          style
        });
      });
    };
    const renderDynamicRows = () => {
      const dynamicRowClassName = ns.e("dynamic-header-row");
      const {
        columns
      } = props;
      return vue.unref(headerHeights).map((rowHeight, rowIndex) => {
        var _a;
        const style = utils.enforceUnit({
          width: "100%",
          height: rowHeight
        });
        return (_a = slots.dynamic) == null ? void 0 : _a.call(slots, {
          class: dynamicRowClassName,
          columns,
          headerIndex: rowIndex,
          style
        });
      });
    };
    expose({
      scrollToLeft
    });
    return () => {
      if (props.height <= 0)
        return;
      return vue.createVNode("div", {
        "ref": headerRef,
        "class": props.class,
        "style": vue.unref(headerStyle),
        "role": "rowgroup"
      }, [vue.createVNode("div", {
        "style": vue.unref(rowStyle),
        "class": ns.e("header")
      }, [renderDynamicRows(), renderFixedRows()])]);
    };
  }
});

exports["default"] = TableV2Header;
//# sourceMappingURL=header.js.map
