'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var index$2 = require('../../../select/index.js');
require('../../../../hooks/index.js');
var usePagination = require('../usePagination.js');
var sizes = require('./sizes.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-locale/index.js');
var index$1 = require('../../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElPaginationSizes"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: sizes.paginationSizesProps,
  emits: ["page-size-change"],
  setup(__props, { emit }) {
    const props = __props;
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("pagination");
    const pagination = usePagination.usePagination();
    const innerPageSize = vue.ref(props.pageSize);
    vue.watch(() => props.pageSizes, (newVal, oldVal) => {
      if (lodashUnified.isEqual(newVal, oldVal))
        return;
      if (Array.isArray(newVal)) {
        const pageSize = newVal.includes(props.pageSize) ? props.pageSize : props.pageSizes[0];
        emit("page-size-change", pageSize);
      }
    });
    vue.watch(() => props.pageSize, (newVal) => {
      innerPageSize.value = newVal;
    });
    const innerPageSizes = vue.computed(() => props.pageSizes);
    function handleChange(val) {
      var _a;
      if (val !== innerPageSize.value) {
        innerPageSize.value = val;
        (_a = pagination.handleSizeChange) == null ? void 0 : _a.call(pagination, Number(val));
      }
    }
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("span", {
        class: vue.normalizeClass(vue.unref(ns).e("sizes"))
      }, [
        vue.createVNode(vue.unref(index$2.ElSelect), {
          "model-value": innerPageSize.value,
          disabled: _ctx.disabled,
          "popper-class": _ctx.popperClass,
          size: _ctx.size,
          teleported: _ctx.teleported,
          "validate-event": false,
          onChange: handleChange
        }, {
          default: vue.withCtx(() => [
            (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(innerPageSizes), (item) => {
              return vue.openBlock(), vue.createBlock(vue.unref(index$2.ElOption), {
                key: item,
                value: item,
                label: item + vue.unref(t)("el.pagination.pagesize")
              }, null, 8, ["value", "label"]);
            }), 128))
          ]),
          _: 1
        }, 8, ["model-value", "disabled", "popper-class", "size", "teleported"])
      ], 2);
    };
  }
});
var Sizes = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/sizes.vue"]]);

exports["default"] = Sizes;
//# sourceMappingURL=sizes2.js.map
