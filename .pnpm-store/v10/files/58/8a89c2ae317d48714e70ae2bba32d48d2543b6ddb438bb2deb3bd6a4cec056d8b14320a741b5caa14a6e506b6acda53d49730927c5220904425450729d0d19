'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var buttonGroup = require('./button-group.js');
var constants = require('./constants.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElButtonGroup"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: buttonGroup.buttonGroupProps,
  setup(__props) {
    const props = __props;
    vue.provide(constants.buttonGroupContextKey, vue.reactive({
      size: vue.toRef(props, "size"),
      type: vue.toRef(props, "type")
    }));
    const ns = index.useNamespace("button");
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(`${vue.unref(ns).b("group")}`)
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var ButtonGroup = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/button/src/button-group.vue"]]);

exports["default"] = ButtonGroup;
//# sourceMappingURL=button-group2.js.map
