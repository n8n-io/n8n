'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var usePagination = require('../usePagination.js');
var total = require('./total.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-locale/index.js');
var index$1 = require('../../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["disabled"];
const __default__ = vue.defineComponent({
  name: "ElPaginationTotal"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: total.paginationTotalProps,
  setup(__props) {
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("pagination");
    const { disabled } = usePagination.usePagination();
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("span", {
        class: vue.normalizeClass(vue.unref(ns).e("total")),
        disabled: vue.unref(disabled)
      }, vue.toDisplayString(vue.unref(t)("el.pagination.total", {
        total: _ctx.total
      })), 11, _hoisted_1);
    };
  }
});
var Total = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/total.vue"]]);

exports["default"] = Total;
//# sourceMappingURL=total2.js.map
