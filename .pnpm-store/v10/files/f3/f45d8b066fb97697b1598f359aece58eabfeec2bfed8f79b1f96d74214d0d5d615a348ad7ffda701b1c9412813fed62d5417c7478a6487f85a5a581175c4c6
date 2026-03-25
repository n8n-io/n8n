'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
require('../../../directives/index.js');
require('../../../hooks/index.js');
var index$4 = require('../../scrollbar/index.js');
var helper = require('./store/helper.js');
var tableLayout = require('./table-layout.js');
var index$1 = require('./table-header/index.js');
var index$2 = require('./table-body/index.js');
var index$3 = require('./table-footer/index.js');
var utilsHelper = require('./table/utils-helper.js');
var styleHelper = require('./table/style-helper.js');
var keyRenderHelper = require('./table/key-render-helper.js');
var defaults = require('./table/defaults.js');
var tokens = require('./tokens.js');
var hHelper = require('./h-helper.js');
var useScrollbar = require('./composables/use-scrollbar.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../directives/mousewheel/index.js');
var index$5 = require('../../../hooks/use-locale/index.js');
var index$6 = require('../../../hooks/use-namespace/index.js');

let tableIdSeed = 1;
const _sfc_main = vue.defineComponent({
  name: "ElTable",
  directives: {
    Mousewheel: index["default"]
  },
  components: {
    TableHeader: index$1["default"],
    TableBody: index$2["default"],
    TableFooter: index$3["default"],
    ElScrollbar: index$4.ElScrollbar,
    hColgroup: hHelper.hColgroup
  },
  props: defaults["default"],
  emits: [
    "select",
    "select-all",
    "selection-change",
    "cell-mouse-enter",
    "cell-mouse-leave",
    "cell-contextmenu",
    "cell-click",
    "cell-dblclick",
    "row-click",
    "row-contextmenu",
    "row-dblclick",
    "header-click",
    "header-contextmenu",
    "sort-change",
    "filter-change",
    "current-change",
    "header-dragend",
    "expand-change"
  ],
  setup(props) {
    const { t } = index$5.useLocale();
    const ns = index$6.useNamespace("table");
    const table = vue.getCurrentInstance();
    vue.provide(tokens.TABLE_INJECTION_KEY, table);
    const store = helper.createStore(table, props);
    table.store = store;
    const layout = new tableLayout["default"]({
      store: table.store,
      table,
      fit: props.fit,
      showHeader: props.showHeader
    });
    table.layout = layout;
    const isEmpty = vue.computed(() => (store.states.data.value || []).length === 0);
    const {
      setCurrentRow,
      getSelectionRows,
      toggleRowSelection,
      clearSelection,
      clearFilter,
      toggleAllSelection,
      toggleRowExpansion,
      clearSort,
      sort
    } = utilsHelper["default"](store);
    const {
      isHidden,
      renderExpanded,
      setDragVisible,
      isGroup,
      handleMouseLeave,
      handleHeaderFooterMousewheel,
      tableSize,
      emptyBlockStyle,
      handleFixedMousewheel,
      resizeProxyVisible,
      bodyWidth,
      resizeState,
      doLayout,
      tableBodyStyles,
      tableLayout: tableLayout$1,
      scrollbarViewStyle,
      tableInnerStyle,
      scrollbarStyle
    } = styleHelper["default"](props, layout, store, table);
    const { scrollBarRef, scrollTo, setScrollLeft, setScrollTop } = useScrollbar.useScrollbar();
    const debouncedUpdateLayout = lodashUnified.debounce(doLayout, 50);
    const tableId = `${ns.namespace.value}-table_${tableIdSeed++}`;
    table.tableId = tableId;
    table.state = {
      isGroup,
      resizeState,
      doLayout,
      debouncedUpdateLayout
    };
    const computedSumText = vue.computed(() => props.sumText || t("el.table.sumText"));
    const computedEmptyText = vue.computed(() => {
      return props.emptyText || t("el.table.emptyText");
    });
    keyRenderHelper["default"](table);
    return {
      ns,
      layout,
      store,
      handleHeaderFooterMousewheel,
      handleMouseLeave,
      tableId,
      tableSize,
      isHidden,
      isEmpty,
      renderExpanded,
      resizeProxyVisible,
      resizeState,
      isGroup,
      bodyWidth,
      tableBodyStyles,
      emptyBlockStyle,
      debouncedUpdateLayout,
      handleFixedMousewheel,
      setCurrentRow,
      getSelectionRows,
      toggleRowSelection,
      clearSelection,
      clearFilter,
      toggleAllSelection,
      toggleRowExpansion,
      clearSort,
      doLayout,
      sort,
      t,
      setDragVisible,
      context: table,
      computedSumText,
      computedEmptyText,
      tableLayout: tableLayout$1,
      scrollbarViewStyle,
      tableInnerStyle,
      scrollbarStyle,
      scrollBarRef,
      scrollTo,
      setScrollLeft,
      setScrollTop
    };
  }
});
const _hoisted_1 = ["data-prefix"];
const _hoisted_2 = {
  ref: "hiddenColumns",
  class: "hidden-columns"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_hColgroup = vue.resolveComponent("hColgroup");
  const _component_table_header = vue.resolveComponent("table-header");
  const _component_table_body = vue.resolveComponent("table-body");
  const _component_table_footer = vue.resolveComponent("table-footer");
  const _component_el_scrollbar = vue.resolveComponent("el-scrollbar");
  const _directive_mousewheel = vue.resolveDirective("mousewheel");
  return vue.openBlock(), vue.createElementBlock("div", {
    ref: "tableWrapper",
    class: vue.normalizeClass([
      {
        [_ctx.ns.m("fit")]: _ctx.fit,
        [_ctx.ns.m("striped")]: _ctx.stripe,
        [_ctx.ns.m("border")]: _ctx.border || _ctx.isGroup,
        [_ctx.ns.m("hidden")]: _ctx.isHidden,
        [_ctx.ns.m("group")]: _ctx.isGroup,
        [_ctx.ns.m("fluid-height")]: _ctx.maxHeight,
        [_ctx.ns.m("scrollable-x")]: _ctx.layout.scrollX.value,
        [_ctx.ns.m("scrollable-y")]: _ctx.layout.scrollY.value,
        [_ctx.ns.m("enable-row-hover")]: !_ctx.store.states.isComplex.value,
        [_ctx.ns.m("enable-row-transition")]: (_ctx.store.states.data.value || []).length !== 0 && (_ctx.store.states.data.value || []).length < 100,
        "has-footer": _ctx.showSummary
      },
      _ctx.ns.m(_ctx.tableSize),
      _ctx.className,
      _ctx.ns.b(),
      _ctx.ns.m(`layout-${_ctx.tableLayout}`)
    ]),
    style: vue.normalizeStyle(_ctx.style),
    "data-prefix": _ctx.ns.namespace.value,
    onMouseleave: _cache[0] || (_cache[0] = (...args) => _ctx.handleMouseLeave && _ctx.handleMouseLeave(...args))
  }, [
    vue.createElementVNode("div", {
      class: vue.normalizeClass(_ctx.ns.e("inner-wrapper")),
      style: vue.normalizeStyle(_ctx.tableInnerStyle)
    }, [
      vue.createElementVNode("div", _hoisted_2, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 512),
      _ctx.showHeader && _ctx.tableLayout === "fixed" ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", {
        key: 0,
        ref: "headerWrapper",
        class: vue.normalizeClass(_ctx.ns.e("header-wrapper"))
      }, [
        vue.createElementVNode("table", {
          ref: "tableHeader",
          class: vue.normalizeClass(_ctx.ns.e("header")),
          style: vue.normalizeStyle(_ctx.tableBodyStyles),
          border: "0",
          cellpadding: "0",
          cellspacing: "0"
        }, [
          vue.createVNode(_component_hColgroup, {
            columns: _ctx.store.states.columns.value,
            "table-layout": _ctx.tableLayout
          }, null, 8, ["columns", "table-layout"]),
          vue.createVNode(_component_table_header, {
            ref: "tableHeaderRef",
            border: _ctx.border,
            "default-sort": _ctx.defaultSort,
            store: _ctx.store,
            onSetDragVisible: _ctx.setDragVisible
          }, null, 8, ["border", "default-sort", "store", "onSetDragVisible"])
        ], 6)
      ], 2)), [
        [_directive_mousewheel, _ctx.handleHeaderFooterMousewheel]
      ]) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("div", {
        ref: "bodyWrapper",
        class: vue.normalizeClass(_ctx.ns.e("body-wrapper"))
      }, [
        vue.createVNode(_component_el_scrollbar, {
          ref: "scrollBarRef",
          "view-style": _ctx.scrollbarViewStyle,
          "wrap-style": _ctx.scrollbarStyle,
          always: _ctx.scrollbarAlwaysOn
        }, {
          default: vue.withCtx(() => [
            vue.createElementVNode("table", {
              ref: "tableBody",
              class: vue.normalizeClass(_ctx.ns.e("body")),
              cellspacing: "0",
              cellpadding: "0",
              border: "0",
              style: vue.normalizeStyle({
                width: _ctx.bodyWidth,
                tableLayout: _ctx.tableLayout
              })
            }, [
              vue.createVNode(_component_hColgroup, {
                columns: _ctx.store.states.columns.value,
                "table-layout": _ctx.tableLayout
              }, null, 8, ["columns", "table-layout"]),
              _ctx.showHeader && _ctx.tableLayout === "auto" ? (vue.openBlock(), vue.createBlock(_component_table_header, {
                key: 0,
                ref: "tableHeaderRef",
                class: vue.normalizeClass(_ctx.ns.e("body-header")),
                border: _ctx.border,
                "default-sort": _ctx.defaultSort,
                store: _ctx.store,
                onSetDragVisible: _ctx.setDragVisible
              }, null, 8, ["class", "border", "default-sort", "store", "onSetDragVisible"])) : vue.createCommentVNode("v-if", true),
              vue.createVNode(_component_table_body, {
                context: _ctx.context,
                highlight: _ctx.highlightCurrentRow,
                "row-class-name": _ctx.rowClassName,
                "tooltip-effect": _ctx.tooltipEffect,
                "tooltip-options": _ctx.tooltipOptions,
                "row-style": _ctx.rowStyle,
                store: _ctx.store,
                stripe: _ctx.stripe
              }, null, 8, ["context", "highlight", "row-class-name", "tooltip-effect", "tooltip-options", "row-style", "store", "stripe"]),
              _ctx.showSummary && _ctx.tableLayout === "auto" ? (vue.openBlock(), vue.createBlock(_component_table_footer, {
                key: 1,
                class: vue.normalizeClass(_ctx.ns.e("body-footer")),
                border: _ctx.border,
                "default-sort": _ctx.defaultSort,
                store: _ctx.store,
                "sum-text": _ctx.computedSumText,
                "summary-method": _ctx.summaryMethod
              }, null, 8, ["class", "border", "default-sort", "store", "sum-text", "summary-method"])) : vue.createCommentVNode("v-if", true)
            ], 6),
            _ctx.isEmpty ? (vue.openBlock(), vue.createElementBlock("div", {
              key: 0,
              ref: "emptyBlock",
              style: vue.normalizeStyle(_ctx.emptyBlockStyle),
              class: vue.normalizeClass(_ctx.ns.e("empty-block"))
            }, [
              vue.createElementVNode("span", {
                class: vue.normalizeClass(_ctx.ns.e("empty-text"))
              }, [
                vue.renderSlot(_ctx.$slots, "empty", {}, () => [
                  vue.createTextVNode(vue.toDisplayString(_ctx.computedEmptyText), 1)
                ])
              ], 2)
            ], 6)) : vue.createCommentVNode("v-if", true),
            _ctx.$slots.append ? (vue.openBlock(), vue.createElementBlock("div", {
              key: 1,
              ref: "appendWrapper",
              class: vue.normalizeClass(_ctx.ns.e("append-wrapper"))
            }, [
              vue.renderSlot(_ctx.$slots, "append")
            ], 2)) : vue.createCommentVNode("v-if", true)
          ]),
          _: 3
        }, 8, ["view-style", "wrap-style", "always"])
      ], 2),
      _ctx.showSummary && _ctx.tableLayout === "fixed" ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", {
        key: 1,
        ref: "footerWrapper",
        class: vue.normalizeClass(_ctx.ns.e("footer-wrapper"))
      }, [
        vue.createElementVNode("table", {
          class: vue.normalizeClass(_ctx.ns.e("footer")),
          cellspacing: "0",
          cellpadding: "0",
          border: "0",
          style: vue.normalizeStyle(_ctx.tableBodyStyles)
        }, [
          vue.createVNode(_component_hColgroup, {
            columns: _ctx.store.states.columns.value,
            "table-layout": _ctx.tableLayout
          }, null, 8, ["columns", "table-layout"]),
          vue.createVNode(_component_table_footer, {
            border: _ctx.border,
            "default-sort": _ctx.defaultSort,
            store: _ctx.store,
            "sum-text": _ctx.computedSumText,
            "summary-method": _ctx.summaryMethod
          }, null, 8, ["border", "default-sort", "store", "sum-text", "summary-method"])
        ], 6)
      ], 2)), [
        [vue.vShow, !_ctx.isEmpty],
        [_directive_mousewheel, _ctx.handleHeaderFooterMousewheel]
      ]) : vue.createCommentVNode("v-if", true),
      _ctx.border || _ctx.isGroup ? (vue.openBlock(), vue.createElementBlock("div", {
        key: 2,
        class: vue.normalizeClass(_ctx.ns.e("border-left-patch"))
      }, null, 2)) : vue.createCommentVNode("v-if", true)
    ], 6),
    vue.withDirectives(vue.createElementVNode("div", {
      ref: "resizeProxy",
      class: vue.normalizeClass(_ctx.ns.e("column-resize-proxy"))
    }, null, 2), [
      [vue.vShow, _ctx.resizeProxyVisible]
    ])
  ], 46, _hoisted_1);
}
var Table = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/table/src/table.vue"]]);

exports["default"] = Table;
//# sourceMappingURL=table.js.map
