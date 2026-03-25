'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var index$2 = require('../../../input/index.js');
var usePagination = require('../usePagination.js');
var jumper = require('./jumper.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-locale/index.js');
var index$1 = require('../../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["disabled"];
const __default__ = vue.defineComponent({
  name: "ElPaginationJumper"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: jumper.paginationJumperProps,
  setup(__props) {
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("pagination");
    const { pageCount, disabled, currentPage, changeEvent } = usePagination.usePagination();
    const userInput = vue.ref();
    const innerValue = vue.computed(() => {
      var _a;
      return (_a = userInput.value) != null ? _a : currentPage == null ? void 0 : currentPage.value;
    });
    function handleInput(val) {
      userInput.value = val ? +val : "";
    }
    function handleChange(val) {
      val = Math.trunc(+val);
      changeEvent == null ? void 0 : changeEvent(val);
      userInput.value = void 0;
    }
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("span", {
        class: vue.normalizeClass(vue.unref(ns).e("jump")),
        disabled: vue.unref(disabled)
      }, [
        vue.createElementVNode("span", {
          class: vue.normalizeClass([vue.unref(ns).e("goto")])
        }, vue.toDisplayString(vue.unref(t)("el.pagination.goto")), 3),
        vue.createVNode(vue.unref(index$2.ElInput), {
          size: _ctx.size,
          class: vue.normalizeClass([vue.unref(ns).e("editor"), vue.unref(ns).is("in-pagination")]),
          min: 1,
          max: vue.unref(pageCount),
          disabled: vue.unref(disabled),
          "model-value": vue.unref(innerValue),
          "validate-event": false,
          label: vue.unref(t)("el.pagination.page"),
          type: "number",
          "onUpdate:modelValue": handleInput,
          onChange: handleChange
        }, null, 8, ["size", "class", "max", "disabled", "model-value", "label"]),
        vue.createElementVNode("span", {
          class: vue.normalizeClass([vue.unref(ns).e("classifier")])
        }, vue.toDisplayString(vue.unref(t)("el.pagination.pageClassifier")), 3)
      ], 10, _hoisted_1);
    };
  }
});
var Jumper = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/jumper.vue"]]);

exports["default"] = Jumper;
//# sourceMappingURL=jumper2.js.map
