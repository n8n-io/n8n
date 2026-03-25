'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var index$1 = require('../../../icon/index.js');
var next = require('./next.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-locale/index.js');

const _hoisted_1 = ["disabled", "aria-label", "aria-disabled"];
const _hoisted_2 = { key: 0 };
const __default__ = vue.defineComponent({
  name: "ElPaginationNext"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: next.paginationNextProps,
  emits: ["click"],
  setup(__props) {
    const props = __props;
    const { t } = index.useLocale();
    const internalDisabled = vue.computed(() => props.disabled || props.currentPage === props.pageCount || props.pageCount === 0);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("button", {
        type: "button",
        class: "btn-next",
        disabled: vue.unref(internalDisabled),
        "aria-label": _ctx.nextText || vue.unref(t)("el.pagination.next"),
        "aria-disabled": vue.unref(internalDisabled),
        onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("click", $event))
      }, [
        _ctx.nextText ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_2, vue.toDisplayString(_ctx.nextText), 1)) : (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), { key: 1 }, {
          default: vue.withCtx(() => [
            (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.nextIcon)))
          ]),
          _: 1
        }))
      ], 8, _hoisted_1);
    };
  }
});
var Next = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/next.vue"]]);

exports["default"] = Next;
//# sourceMappingURL=next2.js.map
