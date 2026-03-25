'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var statistic = require('./statistic.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');

const __default__ = vue.defineComponent({
  name: "ElStatistic"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: statistic.statisticProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = index.useNamespace("statistic");
    const displayValue = vue.computed(() => {
      const { value, formatter, precision, decimalSeparator, groupSeparator } = props;
      if (shared.isFunction(formatter))
        return formatter(value);
      if (!types.isNumber(value))
        return value;
      let [integer, decimal = ""] = String(value).split(".");
      decimal = decimal.padEnd(precision, "0").slice(0, precision > 0 ? precision : 0);
      integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
      return [integer, decimal].join(decimal ? decimalSeparator : "");
    });
    expose({
      displayValue
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(ns).b())
      }, [
        _ctx.$slots.title || _ctx.title ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).e("head"))
        }, [
          vue.renderSlot(_ctx.$slots, "title", {}, () => [
            vue.createTextVNode(vue.toDisplayString(_ctx.title), 1)
          ])
        ], 2)) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("content"))
        }, [
          _ctx.$slots.prefix || _ctx.prefix ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).e("prefix"))
          }, [
            vue.renderSlot(_ctx.$slots, "prefix", {}, () => [
              vue.createElementVNode("span", null, vue.toDisplayString(_ctx.prefix), 1)
            ])
          ], 2)) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("span", {
            class: vue.normalizeClass(vue.unref(ns).e("number")),
            style: vue.normalizeStyle(_ctx.valueStyle)
          }, vue.toDisplayString(vue.unref(displayValue)), 7),
          _ctx.$slots.suffix || _ctx.suffix ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 1,
            class: vue.normalizeClass(vue.unref(ns).e("suffix"))
          }, [
            vue.renderSlot(_ctx.$slots, "suffix", {}, () => [
              vue.createElementVNode("span", null, vue.toDisplayString(_ctx.suffix), 1)
            ])
          ], 2)) : vue.createCommentVNode("v-if", true)
        ], 2)
      ], 2);
    };
  }
});
var Statistic = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/statistic/src/statistic.vue"]]);

exports["default"] = Statistic;
//# sourceMappingURL=statistic2.js.map
