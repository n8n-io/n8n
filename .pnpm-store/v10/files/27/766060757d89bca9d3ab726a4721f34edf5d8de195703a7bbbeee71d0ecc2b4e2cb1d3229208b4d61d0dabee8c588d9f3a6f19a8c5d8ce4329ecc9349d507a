'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index = require('../../../checkbox/index.js');
require('../../../../hooks/index.js');
var filterPanel = require('../filter-panel.js');
var layoutObserver = require('../layout-observer.js');
var tokens = require('../tokens.js');
var eventHelper = require('./event-helper.js');
var style_helper = require('./style.helper.js');
var utilsHelper = require('./utils-helper.js');
var index$1 = require('../../../../hooks/use-namespace/index.js');

var TableHeader = vue.defineComponent({
  name: "ElTableHeader",
  components: {
    ElCheckbox: index.ElCheckbox
  },
  props: {
    fixed: {
      type: String,
      default: ""
    },
    store: {
      required: true,
      type: Object
    },
    border: Boolean,
    defaultSort: {
      type: Object,
      default: () => {
        return {
          prop: "",
          order: ""
        };
      }
    }
  },
  setup(props, { emit }) {
    const instance = vue.getCurrentInstance();
    const parent = vue.inject(tokens.TABLE_INJECTION_KEY);
    const ns = index$1.useNamespace("table");
    const filterPanels = vue.ref({});
    const { onColumnsChange, onScrollableChange } = layoutObserver["default"](parent);
    vue.onMounted(async () => {
      await vue.nextTick();
      await vue.nextTick();
      const { prop, order } = props.defaultSort;
      parent == null ? void 0 : parent.store.commit("sort", { prop, order, init: true });
    });
    const {
      handleHeaderClick,
      handleHeaderContextMenu,
      handleMouseDown,
      handleMouseMove,
      handleMouseOut,
      handleSortClick,
      handleFilterClick
    } = eventHelper["default"](props, emit);
    const {
      getHeaderRowStyle,
      getHeaderRowClass,
      getHeaderCellStyle,
      getHeaderCellClass
    } = style_helper["default"](props);
    const { isGroup, toggleAllSelection, columnRows } = utilsHelper["default"](props);
    instance.state = {
      onColumnsChange,
      onScrollableChange
    };
    instance.filterPanels = filterPanels;
    return {
      ns,
      filterPanels,
      onColumnsChange,
      onScrollableChange,
      columnRows,
      getHeaderRowClass,
      getHeaderRowStyle,
      getHeaderCellClass,
      getHeaderCellStyle,
      handleHeaderClick,
      handleHeaderContextMenu,
      handleMouseDown,
      handleMouseMove,
      handleMouseOut,
      handleSortClick,
      handleFilterClick,
      isGroup,
      toggleAllSelection
    };
  },
  render() {
    const {
      ns,
      isGroup,
      columnRows,
      getHeaderCellStyle,
      getHeaderCellClass,
      getHeaderRowClass,
      getHeaderRowStyle,
      handleHeaderClick,
      handleHeaderContextMenu,
      handleMouseDown,
      handleMouseMove,
      handleSortClick,
      handleMouseOut,
      store,
      $parent
    } = this;
    let rowSpan = 1;
    return vue.h("thead", {
      class: { [ns.is("group")]: isGroup }
    }, columnRows.map((subColumns, rowIndex) => vue.h("tr", {
      class: getHeaderRowClass(rowIndex),
      key: rowIndex,
      style: getHeaderRowStyle(rowIndex)
    }, subColumns.map((column, cellIndex) => {
      if (column.rowSpan > rowSpan) {
        rowSpan = column.rowSpan;
      }
      return vue.h("th", {
        class: getHeaderCellClass(rowIndex, cellIndex, subColumns, column),
        colspan: column.colSpan,
        key: `${column.id}-thead`,
        rowspan: column.rowSpan,
        style: getHeaderCellStyle(rowIndex, cellIndex, subColumns, column),
        onClick: ($event) => handleHeaderClick($event, column),
        onContextmenu: ($event) => handleHeaderContextMenu($event, column),
        onMousedown: ($event) => handleMouseDown($event, column),
        onMousemove: ($event) => handleMouseMove($event, column),
        onMouseout: handleMouseOut
      }, [
        vue.h("div", {
          class: [
            "cell",
            column.filteredValue && column.filteredValue.length > 0 ? "highlight" : ""
          ]
        }, [
          column.renderHeader ? column.renderHeader({
            column,
            $index: cellIndex,
            store,
            _self: $parent
          }) : column.label,
          column.sortable && vue.h("span", {
            onClick: ($event) => handleSortClick($event, column),
            class: "caret-wrapper"
          }, [
            vue.h("i", {
              onClick: ($event) => handleSortClick($event, column, "ascending"),
              class: "sort-caret ascending"
            }),
            vue.h("i", {
              onClick: ($event) => handleSortClick($event, column, "descending"),
              class: "sort-caret descending"
            })
          ]),
          column.filterable && vue.h(filterPanel["default"], {
            store,
            placement: column.filterPlacement || "bottom-start",
            column,
            upDataColumn: (key, value) => {
              column[key] = value;
            }
          })
        ])
      ]);
    }))));
  }
});

exports["default"] = TableHeader;
//# sourceMappingURL=index.js.map
