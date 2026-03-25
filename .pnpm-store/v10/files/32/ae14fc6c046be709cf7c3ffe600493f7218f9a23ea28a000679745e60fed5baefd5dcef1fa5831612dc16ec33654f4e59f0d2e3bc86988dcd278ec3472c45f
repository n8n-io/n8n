'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
require('../../form/index.js');
require('../../virtual-list/index.js');
var useTree = require('./composables/useTree.js');
var treeNode = require('./tree-node.js');
var virtualTree = require('./virtual-tree.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var constants = require('../../form/src/constants.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var fixedSizeList = require('../../virtual-list/src/components/fixed-size-list.js');

const __default__ = vue.defineComponent({
  name: "ElTreeV2"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: virtualTree.treeProps,
  emits: virtualTree.treeEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const slots = vue.useSlots();
    const treeNodeSize = vue.computed(() => props.itemSize);
    vue.provide(virtualTree.ROOT_TREE_INJECTION_KEY, {
      ctx: {
        emit,
        slots
      },
      props,
      instance: vue.getCurrentInstance()
    });
    vue.provide(constants.formItemContextKey, void 0);
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("tree");
    const {
      flattenTree,
      isNotEmpty,
      toggleExpand,
      isExpanded,
      isIndeterminate,
      isChecked,
      isDisabled,
      isCurrent,
      isForceHiddenExpandIcon,
      handleNodeClick,
      handleNodeCheck,
      toggleCheckbox,
      getCurrentNode,
      getCurrentKey,
      setCurrentKey,
      getCheckedKeys,
      getCheckedNodes,
      getHalfCheckedKeys,
      getHalfCheckedNodes,
      setChecked,
      setCheckedKeys,
      filter,
      setData,
      getNode,
      expandNode,
      collapseNode,
      setExpandedKeys
    } = useTree.useTree(props, emit);
    expose({
      toggleCheckbox,
      getCurrentNode,
      getCurrentKey,
      setCurrentKey,
      getCheckedKeys,
      getCheckedNodes,
      getHalfCheckedKeys,
      getHalfCheckedNodes,
      setChecked,
      setCheckedKeys,
      filter,
      setData,
      getNode,
      expandNode,
      collapseNode,
      setExpandedKeys
    });
    return (_ctx, _cache) => {
      var _a;
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([vue.unref(ns).b(), { [vue.unref(ns).m("highlight-current")]: _ctx.highlightCurrent }]),
        role: "tree"
      }, [
        vue.unref(isNotEmpty) ? (vue.openBlock(), vue.createBlock(vue.unref(fixedSizeList["default"]), {
          key: 0,
          "class-name": vue.unref(ns).b("virtual-list"),
          data: vue.unref(flattenTree),
          total: vue.unref(flattenTree).length,
          height: _ctx.height,
          "item-size": vue.unref(treeNodeSize),
          "perf-mode": _ctx.perfMode
        }, {
          default: vue.withCtx(({ data, index, style }) => [
            (vue.openBlock(), vue.createBlock(treeNode["default"], {
              key: data[index].key,
              style: vue.normalizeStyle(style),
              node: data[index],
              expanded: vue.unref(isExpanded)(data[index]),
              "show-checkbox": _ctx.showCheckbox,
              checked: vue.unref(isChecked)(data[index]),
              indeterminate: vue.unref(isIndeterminate)(data[index]),
              "item-size": vue.unref(treeNodeSize),
              disabled: vue.unref(isDisabled)(data[index]),
              current: vue.unref(isCurrent)(data[index]),
              "hidden-expand-icon": vue.unref(isForceHiddenExpandIcon)(data[index]),
              onClick: vue.unref(handleNodeClick),
              onToggle: vue.unref(toggleExpand),
              onCheck: vue.unref(handleNodeCheck)
            }, null, 8, ["style", "node", "expanded", "show-checkbox", "checked", "indeterminate", "item-size", "disabled", "current", "hidden-expand-icon", "onClick", "onToggle", "onCheck"]))
          ]),
          _: 1
        }, 8, ["class-name", "data", "total", "height", "item-size", "perf-mode"])) : (vue.openBlock(), vue.createElementBlock("div", {
          key: 1,
          class: vue.normalizeClass(vue.unref(ns).e("empty-block"))
        }, [
          vue.createElementVNode("span", {
            class: vue.normalizeClass(vue.unref(ns).e("empty-text"))
          }, vue.toDisplayString((_a = _ctx.emptyText) != null ? _a : vue.unref(t)("el.tree.emptyText")), 3)
        ], 2))
      ], 2);
    };
  }
});
var TreeV2 = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tree-v2/src/tree.vue"]]);

exports["default"] = TreeV2;
//# sourceMappingURL=tree.js.map
