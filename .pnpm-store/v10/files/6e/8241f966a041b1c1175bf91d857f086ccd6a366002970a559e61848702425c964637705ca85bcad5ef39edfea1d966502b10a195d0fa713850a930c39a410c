'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var index$1 = require('../../../icon/index.js');
var prev = require('./prev.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-locale/index.js');

const _hoisted_1 = ["disabled", "aria-label", "aria-disabled"];
const _hoisted_2 = { key: 0 };
const __default__ = vue.defineComponent({
  name: "ElPaginationPrev"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: prev.paginationPrevProps,
  emits: prev.paginationPrevEmits,
  setup(__props) {
    const props = __props;
    const { t } = index.useLocale();
    const internalDisabled = vue.computed(() => props.disabled || props.currentPage <= 1);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("button", {
        type: "button",
        class: "btn-prev",
        disabled: vue.unref(internalDisabled),
        "aria-label": _ctx.prevText || vue.unref(t)("el.pagination.prev"),
        "aria-disabled": vue.unref(internalDisabled),
        onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("click", $event))
      }, [
        _ctx.prevText ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_2, vue.toDisplayString(_ctx.prevText), 1)) : (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), { key: 1 }, {
          default: vue.withCtx(() => [
            (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.prevIcon)))
          ]),
          _: 1
        }))
      ], 8, _hoisted_1);
    };
  }
});
var Prev = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/prev.vue"]]);

exports["default"] = Prev;
//# sourceMappingURL=prev2.js.map
