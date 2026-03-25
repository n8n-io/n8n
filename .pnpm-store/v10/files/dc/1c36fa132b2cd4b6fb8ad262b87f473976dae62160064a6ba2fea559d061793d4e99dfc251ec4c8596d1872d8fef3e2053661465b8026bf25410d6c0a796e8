'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
require('../../row/index.js');
var col = require('./col.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var constants = require('../../row/src/constants.js');
var index = require('../../../hooks/use-namespace/index.js');
var types = require('../../../utils/types.js');
var shared = require('@vue/shared');

const __default__ = vue.defineComponent({
  name: "ElCol"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: col.colProps,
  setup(__props) {
    const props = __props;
    const { gutter } = vue.inject(constants.rowContextKey, { gutter: vue.computed(() => 0) });
    const ns = index.useNamespace("col");
    const style = vue.computed(() => {
      const styles = {};
      if (gutter.value) {
        styles.paddingLeft = styles.paddingRight = `${gutter.value / 2}px`;
      }
      return styles;
    });
    const colKls = vue.computed(() => {
      const classes = [];
      const pos = ["span", "offset", "pull", "push"];
      pos.forEach((prop) => {
        const size = props[prop];
        if (types.isNumber(size)) {
          if (prop === "span")
            classes.push(ns.b(`${props[prop]}`));
          else if (size > 0)
            classes.push(ns.b(`${prop}-${props[prop]}`));
        }
      });
      const sizes = ["xs", "sm", "md", "lg", "xl"];
      sizes.forEach((size) => {
        if (types.isNumber(props[size])) {
          classes.push(ns.b(`${size}-${props[size]}`));
        } else if (shared.isObject(props[size])) {
          Object.entries(props[size]).forEach(([prop, sizeProp]) => {
            classes.push(prop !== "span" ? ns.b(`${size}-${prop}-${sizeProp}`) : ns.b(`${size}-${sizeProp}`));
          });
        }
      });
      if (gutter.value) {
        classes.push(ns.is("guttered"));
      }
      return [ns.b(), classes];
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.tag), {
        class: vue.normalizeClass(vue.unref(colKls)),
        style: vue.normalizeStyle(vue.unref(style))
      }, {
        default: vue.withCtx(() => [
          vue.renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["class", "style"]);
    };
  }
});
var Col = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/col/src/col.vue"]]);

exports["default"] = Col;
//# sourceMappingURL=col2.js.map
