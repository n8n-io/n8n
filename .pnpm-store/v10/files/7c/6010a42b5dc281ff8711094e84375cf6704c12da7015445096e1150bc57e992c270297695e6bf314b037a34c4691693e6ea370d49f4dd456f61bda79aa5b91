'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var row = require('./row.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElRow"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: row.rowProps,
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("row");
    const gutter = vue.computed(() => props.gutter);
    vue.provide(constants.rowContextKey, {
      gutter
    });
    const style = vue.computed(() => {
      const styles = {};
      if (!props.gutter) {
        return styles;
      }
      styles.marginRight = styles.marginLeft = `-${props.gutter / 2}px`;
      return styles;
    });
    const rowKls = vue.computed(() => [
      ns.b(),
      ns.is(`justify-${props.justify}`, props.justify !== "start"),
      ns.is(`align-${props.align}`, !!props.align)
    ]);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.tag), {
        class: vue.normalizeClass(vue.unref(rowKls)),
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
var Row = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/row/src/row.vue"]]);

exports["default"] = Row;
//# sourceMappingURL=row2.js.map
