'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index = require('../../../checkbox/index.js');
require('../../../../utils/index.js');
var config = require('../config.js');
var util = require('../util.js');
var watcherHelper = require('./watcher-helper.js');
var renderHelper = require('./render-helper.js');
var defaults = require('./defaults.js');
var types = require('../../../../utils/types.js');
var shared = require('@vue/shared');

let columnIdSeed = 1;
var ElTableColumn = vue.defineComponent({
  name: "ElTableColumn",
  components: {
    ElCheckbox: index.ElCheckbox
  },
  props: defaults["default"],
  setup(props, { slots }) {
    const instance = vue.getCurrentInstance();
    const columnConfig = vue.ref({});
    const owner = vue.computed(() => {
      let parent2 = instance.parent;
      while (parent2 && !parent2.tableId) {
        parent2 = parent2.parent;
      }
      return parent2;
    });
    const { registerNormalWatchers, registerComplexWatchers } = watcherHelper["default"](owner, props);
    const {
      columnId,
      isSubColumn,
      realHeaderAlign,
      columnOrTableParent,
      setColumnWidth,
      setColumnForcedProps,
      setColumnRenders,
      getPropsData,
      getColumnElIndex,
      realAlign,
      updateColumnOrder
    } = renderHelper["default"](props, slots, owner);
    const parent = columnOrTableParent.value;
    columnId.value = `${parent.tableId || parent.columnId}_column_${columnIdSeed++}`;
    vue.onBeforeMount(() => {
      isSubColumn.value = owner.value !== parent;
      const type = props.type || "default";
      const sortable = props.sortable === "" ? true : props.sortable;
      const showOverflowTooltip = types.isUndefined(props.showOverflowTooltip) ? parent.props.showOverflowTooltip : props.showOverflowTooltip;
      const defaults = {
        ...config.cellStarts[type],
        id: columnId.value,
        type,
        property: props.prop || props.property,
        align: realAlign,
        headerAlign: realHeaderAlign,
        showOverflowTooltip,
        filterable: props.filters || props.filterMethod,
        filteredValue: [],
        filterPlacement: "",
        isColumnGroup: false,
        isSubColumn: false,
        filterOpened: false,
        sortable,
        index: props.index,
        rawColumnKey: instance.vnode.key
      };
      const basicProps = [
        "columnKey",
        "label",
        "className",
        "labelClassName",
        "type",
        "renderHeader",
        "formatter",
        "fixed",
        "resizable"
      ];
      const sortProps = ["sortMethod", "sortBy", "sortOrders"];
      const selectProps = ["selectable", "reserveSelection"];
      const filterProps = [
        "filterMethod",
        "filters",
        "filterMultiple",
        "filterOpened",
        "filteredValue",
        "filterPlacement"
      ];
      let column = getPropsData(basicProps, sortProps, selectProps, filterProps);
      column = util.mergeOptions(defaults, column);
      const chains = util.compose(setColumnRenders, setColumnWidth, setColumnForcedProps);
      column = chains(column);
      columnConfig.value = column;
      registerNormalWatchers();
      registerComplexWatchers();
    });
    vue.onMounted(() => {
      var _a;
      const parent2 = columnOrTableParent.value;
      const children = isSubColumn.value ? parent2.vnode.el.children : (_a = parent2.refs.hiddenColumns) == null ? void 0 : _a.children;
      const getColumnIndex = () => getColumnElIndex(children || [], instance.vnode.el);
      columnConfig.value.getColumnIndex = getColumnIndex;
      const columnIndex = getColumnIndex();
      columnIndex > -1 && owner.value.store.commit("insertColumn", columnConfig.value, isSubColumn.value ? parent2.columnConfig.value : null, updateColumnOrder);
    });
    vue.onBeforeUnmount(() => {
      owner.value.store.commit("removeColumn", columnConfig.value, isSubColumn.value ? parent.columnConfig.value : null, updateColumnOrder);
    });
    instance.columnId = columnId.value;
    instance.columnConfig = columnConfig;
    return;
  },
  render() {
    var _a, _b, _c;
    try {
      const renderDefault = (_b = (_a = this.$slots).default) == null ? void 0 : _b.call(_a, {
        row: {},
        column: {},
        $index: -1
      });
      const children = [];
      if (Array.isArray(renderDefault)) {
        for (const childNode of renderDefault) {
          if (((_c = childNode.type) == null ? void 0 : _c.name) === "ElTableColumn" || childNode.shapeFlag & 2) {
            children.push(childNode);
          } else if (childNode.type === vue.Fragment && Array.isArray(childNode.children)) {
            childNode.children.forEach((vnode2) => {
              if ((vnode2 == null ? void 0 : vnode2.patchFlag) !== 1024 && !shared.isString(vnode2 == null ? void 0 : vnode2.children)) {
                children.push(vnode2);
              }
            });
          }
        }
      }
      const vnode = vue.h("div", children);
      return vnode;
    } catch (e) {
      return vue.h("div", []);
    }
  }
});

exports["default"] = ElTableColumn;
//# sourceMappingURL=index.js.map
