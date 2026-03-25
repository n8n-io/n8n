'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var index = require('../../select/index.js');
var index$1 = require('../../tree/index.js');
var select = require('./select.js');
var tree = require('./tree.js');
var cacheOptions = require('./cache-options.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const _sfc_main = vue.defineComponent({
  name: "ElTreeSelect",
  inheritAttrs: false,
  props: {
    ...index.ElSelect.props,
    ...index$1["default"].props,
    cacheData: {
      type: Array,
      default: () => []
    }
  },
  setup(props, context) {
    const { slots, expose } = context;
    const select$1 = vue.ref();
    const tree$1 = vue.ref();
    const key = vue.computed(() => props.nodeKey || props.valueKey || "value");
    const selectProps = select.useSelect(props, context, { select: select$1, tree: tree$1, key });
    const { cacheOptions: cacheOptions$1, ...treeProps } = tree.useTree(props, context, {
      select: select$1,
      tree: tree$1,
      key
    });
    const methods = vue.reactive({});
    expose(methods);
    vue.onMounted(() => {
      Object.assign(methods, {
        ...lodashUnified.pick(tree$1.value, [
          "filter",
          "updateKeyChildren",
          "getCheckedNodes",
          "setCheckedNodes",
          "getCheckedKeys",
          "setCheckedKeys",
          "setChecked",
          "getHalfCheckedNodes",
          "getHalfCheckedKeys",
          "getCurrentKey",
          "getCurrentNode",
          "setCurrentKey",
          "setCurrentNode",
          "getNode",
          "remove",
          "append",
          "insertBefore",
          "insertAfter"
        ]),
        ...lodashUnified.pick(select$1.value, ["focus", "blur"])
      });
    });
    return () => vue.h(index.ElSelect, vue.reactive({
      ...selectProps,
      ref: (ref2) => select$1.value = ref2
    }), {
      ...slots,
      default: () => [
        vue.h(cacheOptions["default"], { data: cacheOptions$1.value }),
        vue.h(index$1["default"], vue.reactive({
          ...treeProps,
          ref: (ref2) => tree$1.value = ref2
        }))
      ]
    });
  }
});
var TreeSelect = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tree-select/src/tree-select.vue"]]);

exports["default"] = TreeSelect;
//# sourceMappingURL=tree-select.js.map
