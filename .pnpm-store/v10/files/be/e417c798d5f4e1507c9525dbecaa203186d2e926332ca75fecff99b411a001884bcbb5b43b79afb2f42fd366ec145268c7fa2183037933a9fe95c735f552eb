import { defineComponent, ref, computed, unref, nextTick, createVNode } from 'vue';
import '../../../../hooks/index.mjs';
import '../../../../utils/index.mjs';
import { tableV2HeaderProps } from '../header.mjs';
import { enforceUnit } from '../utils.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { castArray } from 'lodash-unified';

const COMPONENT_NAME = "ElTableV2Header";
const TableV2Header = defineComponent({
  name: COMPONENT_NAME,
  props: tableV2HeaderProps,
  setup(props, {
    slots,
    expose
  }) {
    const ns = useNamespace("table-v2");
    const headerRef = ref();
    const headerStyle = computed(() => enforceUnit({
      width: props.width,
      height: props.height
    }));
    const rowStyle = computed(() => enforceUnit({
      width: props.rowWidth,
      height: props.height
    }));
    const headerHeights = computed(() => castArray(unref(props.headerHeight)));
    const scrollToLeft = (left) => {
      const headerEl = unref(headerRef);
      nextTick(() => {
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
        const style = enforceUnit({
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
      return unref(headerHeights).map((rowHeight, rowIndex) => {
        var _a;
        const style = enforceUnit({
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
      return createVNode("div", {
        "ref": headerRef,
        "class": props.class,
        "style": unref(headerStyle),
        "role": "rowgroup"
      }, [createVNode("div", {
        "style": unref(rowStyle),
        "class": ns.e("header")
      }, [renderDynamicRows(), renderFixedRows()])]);
    };
  }
});

export { TableV2Header as default };
//# sourceMappingURL=header.mjs.map
