'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var collapse = require('./collapse.js');
var useCollapse = require('./use-collapse.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const __default__ = vue.defineComponent({
  name: "ElCollapse"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: collapse.collapseProps,
  emits: collapse.collapseEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const { activeNames, setActiveNames } = useCollapse.useCollapse(props, emit);
    const { rootKls } = useCollapse.useCollapseDOM();
    expose({
      activeNames,
      setActiveNames
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(rootKls))
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var Collapse = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/collapse/src/collapse.vue"]]);

exports["default"] = Collapse;
//# sourceMappingURL=collapse2.js.map
