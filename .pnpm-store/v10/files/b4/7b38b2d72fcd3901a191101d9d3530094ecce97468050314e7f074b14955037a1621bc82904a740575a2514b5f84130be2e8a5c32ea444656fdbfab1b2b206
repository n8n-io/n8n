import { defineComponent, useSlots, computed, provide, getCurrentInstance, openBlock, createElementBlock, normalizeClass, unref, createBlock, withCtx, normalizeStyle, createElementVNode, toDisplayString } from 'vue';
import '../../../hooks/index.mjs';
import '../../form/index.mjs';
import '../../virtual-list/index.mjs';
import { useTree } from './composables/useTree.mjs';
import ElTreeNode from './tree-node.mjs';
import { treeProps, treeEmits, ROOT_TREE_INJECTION_KEY } from './virtual-tree.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { formItemContextKey } from '../../form/src/constants.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import FixedSizeList from '../../virtual-list/src/components/fixed-size-list.mjs';

const __default__ = defineComponent({
  name: "ElTreeV2"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: treeProps,
  emits: treeEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const slots = useSlots();
    const treeNodeSize = computed(() => props.itemSize);
    provide(ROOT_TREE_INJECTION_KEY, {
      ctx: {
        emit,
        slots
      },
      props,
      instance: getCurrentInstance()
    });
    provide(formItemContextKey, void 0);
    const { t } = useLocale();
    const ns = useNamespace("tree");
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
    } = useTree(props, emit);
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
      return openBlock(), createElementBlock("div", {
        class: normalizeClass([unref(ns).b(), { [unref(ns).m("highlight-current")]: _ctx.highlightCurrent }]),
        role: "tree"
      }, [
        unref(isNotEmpty) ? (openBlock(), createBlock(unref(FixedSizeList), {
          key: 0,
          "class-name": unref(ns).b("virtual-list"),
          data: unref(flattenTree),
          total: unref(flattenTree).length,
          height: _ctx.height,
          "item-size": unref(treeNodeSize),
          "perf-mode": _ctx.perfMode
        }, {
          default: withCtx(({ data, index, style }) => [
            (openBlock(), createBlock(ElTreeNode, {
              key: data[index].key,
              style: normalizeStyle(style),
              node: data[index],
              expanded: unref(isExpanded)(data[index]),
              "show-checkbox": _ctx.showCheckbox,
              checked: unref(isChecked)(data[index]),
              indeterminate: unref(isIndeterminate)(data[index]),
              "item-size": unref(treeNodeSize),
              disabled: unref(isDisabled)(data[index]),
              current: unref(isCurrent)(data[index]),
              "hidden-expand-icon": unref(isForceHiddenExpandIcon)(data[index]),
              onClick: unref(handleNodeClick),
              onToggle: unref(toggleExpand),
              onCheck: unref(handleNodeCheck)
            }, null, 8, ["style", "node", "expanded", "show-checkbox", "checked", "indeterminate", "item-size", "disabled", "current", "hidden-expand-icon", "onClick", "onToggle", "onCheck"]))
          ]),
          _: 1
        }, 8, ["class-name", "data", "total", "height", "item-size", "perf-mode"])) : (openBlock(), createElementBlock("div", {
          key: 1,
          class: normalizeClass(unref(ns).e("empty-block"))
        }, [
          createElementVNode("span", {
            class: normalizeClass(unref(ns).e("empty-text"))
          }, toDisplayString((_a = _ctx.emptyText) != null ? _a : unref(t)("el.tree.emptyText")), 3)
        ], 2))
      ], 2);
    };
  }
});
var TreeV2 = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tree-v2/src/tree.vue"]]);

export { TreeV2 as default };
//# sourceMappingURL=tree.mjs.map
