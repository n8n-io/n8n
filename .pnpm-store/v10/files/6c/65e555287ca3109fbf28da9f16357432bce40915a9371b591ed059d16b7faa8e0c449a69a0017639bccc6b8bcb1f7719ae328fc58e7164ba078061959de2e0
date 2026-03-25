import { defineComponent, ref, computed, watch, provide, getCurrentInstance, resolveComponent, openBlock, createElementBlock, normalizeClass, Fragment, renderList, createBlock, renderSlot, createElementVNode, toDisplayString, createCommentVNode, withDirectives, vShow } from 'vue';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import '../../form/index.mjs';
import TreeStore from './model/tree-store.mjs';
import { getNodeKey, handleCurrentChange } from './model/util.mjs';
import ElTreeNode from './tree-node.mjs';
import { useNodeExpandEventBroadcast } from './model/useNodeExpandEventBroadcast.mjs';
import { useDragNodeHandler } from './model/useDragNode.mjs';
import { useKeydown } from './model/useKeydown.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { formItemContextKey } from '../../form/src/constants.mjs';

const _sfc_main = defineComponent({
  name: "ElTree",
  components: { ElTreeNode },
  props: {
    data: {
      type: Array,
      default: () => []
    },
    emptyText: {
      type: String
    },
    renderAfterExpand: {
      type: Boolean,
      default: true
    },
    nodeKey: String,
    checkStrictly: Boolean,
    defaultExpandAll: Boolean,
    expandOnClickNode: {
      type: Boolean,
      default: true
    },
    checkOnClickNode: Boolean,
    checkDescendants: {
      type: Boolean,
      default: false
    },
    autoExpandParent: {
      type: Boolean,
      default: true
    },
    defaultCheckedKeys: Array,
    defaultExpandedKeys: Array,
    currentNodeKey: [String, Number],
    renderContent: Function,
    showCheckbox: {
      type: Boolean,
      default: false
    },
    draggable: {
      type: Boolean,
      default: false
    },
    allowDrag: Function,
    allowDrop: Function,
    props: {
      type: Object,
      default: () => ({
        children: "children",
        label: "label",
        disabled: "disabled"
      })
    },
    lazy: {
      type: Boolean,
      default: false
    },
    highlightCurrent: Boolean,
    load: Function,
    filterNodeMethod: Function,
    accordion: Boolean,
    indent: {
      type: Number,
      default: 18
    },
    icon: {
      type: iconPropType
    }
  },
  emits: [
    "check-change",
    "current-change",
    "node-click",
    "node-contextmenu",
    "node-collapse",
    "node-expand",
    "check",
    "node-drag-start",
    "node-drag-end",
    "node-drop",
    "node-drag-leave",
    "node-drag-enter",
    "node-drag-over"
  ],
  setup(props, ctx) {
    const { t } = useLocale();
    const ns = useNamespace("tree");
    const store = ref(new TreeStore({
      key: props.nodeKey,
      data: props.data,
      lazy: props.lazy,
      props: props.props,
      load: props.load,
      currentNodeKey: props.currentNodeKey,
      checkStrictly: props.checkStrictly,
      checkDescendants: props.checkDescendants,
      defaultCheckedKeys: props.defaultCheckedKeys,
      defaultExpandedKeys: props.defaultExpandedKeys,
      autoExpandParent: props.autoExpandParent,
      defaultExpandAll: props.defaultExpandAll,
      filterNodeMethod: props.filterNodeMethod
    }));
    store.value.initialize();
    const root = ref(store.value.root);
    const currentNode = ref(null);
    const el$ = ref(null);
    const dropIndicator$ = ref(null);
    const { broadcastExpanded } = useNodeExpandEventBroadcast(props);
    const { dragState } = useDragNodeHandler({
      props,
      ctx,
      el$,
      dropIndicator$,
      store
    });
    useKeydown({ el$ }, store);
    const isEmpty = computed(() => {
      const { childNodes } = root.value;
      return !childNodes || childNodes.length === 0 || childNodes.every(({ visible }) => !visible);
    });
    watch(() => props.currentNodeKey, (newVal) => {
      store.value.setCurrentNodeKey(newVal);
    });
    watch(() => props.defaultCheckedKeys, (newVal) => {
      store.value.setDefaultCheckedKey(newVal);
    });
    watch(() => props.defaultExpandedKeys, (newVal) => {
      store.value.setDefaultExpandedKeys(newVal);
    });
    watch(() => props.data, (newVal) => {
      store.value.setData(newVal);
    }, { deep: true });
    watch(() => props.checkStrictly, (newVal) => {
      store.value.checkStrictly = newVal;
    });
    const filter = (value) => {
      if (!props.filterNodeMethod)
        throw new Error("[Tree] filterNodeMethod is required when filter");
      store.value.filter(value);
    };
    const getNodeKey$1 = (node) => {
      return getNodeKey(props.nodeKey, node.data);
    };
    const getNodePath = (data) => {
      if (!props.nodeKey)
        throw new Error("[Tree] nodeKey is required in getNodePath");
      const node = store.value.getNode(data);
      if (!node)
        return [];
      const path = [node.data];
      let parent = node.parent;
      while (parent && parent !== root.value) {
        path.push(parent.data);
        parent = parent.parent;
      }
      return path.reverse();
    };
    const getCheckedNodes = (leafOnly, includeHalfChecked) => {
      return store.value.getCheckedNodes(leafOnly, includeHalfChecked);
    };
    const getCheckedKeys = (leafOnly) => {
      return store.value.getCheckedKeys(leafOnly);
    };
    const getCurrentNode = () => {
      const currentNode2 = store.value.getCurrentNode();
      return currentNode2 ? currentNode2.data : null;
    };
    const getCurrentKey = () => {
      if (!props.nodeKey)
        throw new Error("[Tree] nodeKey is required in getCurrentKey");
      const currentNode2 = getCurrentNode();
      return currentNode2 ? currentNode2[props.nodeKey] : null;
    };
    const setCheckedNodes = (nodes, leafOnly) => {
      if (!props.nodeKey)
        throw new Error("[Tree] nodeKey is required in setCheckedNodes");
      store.value.setCheckedNodes(nodes, leafOnly);
    };
    const setCheckedKeys = (keys, leafOnly) => {
      if (!props.nodeKey)
        throw new Error("[Tree] nodeKey is required in setCheckedKeys");
      store.value.setCheckedKeys(keys, leafOnly);
    };
    const setChecked = (data, checked, deep) => {
      store.value.setChecked(data, checked, deep);
    };
    const getHalfCheckedNodes = () => {
      return store.value.getHalfCheckedNodes();
    };
    const getHalfCheckedKeys = () => {
      return store.value.getHalfCheckedKeys();
    };
    const setCurrentNode = (node, shouldAutoExpandParent = true) => {
      if (!props.nodeKey)
        throw new Error("[Tree] nodeKey is required in setCurrentNode");
      handleCurrentChange(store, ctx.emit, () => store.value.setUserCurrentNode(node, shouldAutoExpandParent));
    };
    const setCurrentKey = (key, shouldAutoExpandParent = true) => {
      if (!props.nodeKey)
        throw new Error("[Tree] nodeKey is required in setCurrentKey");
      handleCurrentChange(store, ctx.emit, () => store.value.setCurrentNodeKey(key, shouldAutoExpandParent));
    };
    const getNode = (data) => {
      return store.value.getNode(data);
    };
    const remove = (data) => {
      store.value.remove(data);
    };
    const append = (data, parentNode) => {
      store.value.append(data, parentNode);
    };
    const insertBefore = (data, refNode) => {
      store.value.insertBefore(data, refNode);
    };
    const insertAfter = (data, refNode) => {
      store.value.insertAfter(data, refNode);
    };
    const handleNodeExpand = (nodeData, node, instance) => {
      broadcastExpanded(node);
      ctx.emit("node-expand", nodeData, node, instance);
    };
    const updateKeyChildren = (key, data) => {
      if (!props.nodeKey)
        throw new Error("[Tree] nodeKey is required in updateKeyChild");
      store.value.updateChildren(key, data);
    };
    provide("RootTree", {
      ctx,
      props,
      store,
      root,
      currentNode,
      instance: getCurrentInstance()
    });
    provide(formItemContextKey, void 0);
    return {
      ns,
      store,
      root,
      currentNode,
      dragState,
      el$,
      dropIndicator$,
      isEmpty,
      filter,
      getNodeKey: getNodeKey$1,
      getNodePath,
      getCheckedNodes,
      getCheckedKeys,
      getCurrentNode,
      getCurrentKey,
      setCheckedNodes,
      setCheckedKeys,
      setChecked,
      getHalfCheckedNodes,
      getHalfCheckedKeys,
      setCurrentNode,
      setCurrentKey,
      t,
      getNode,
      remove,
      append,
      insertBefore,
      insertAfter,
      handleNodeExpand,
      updateKeyChildren
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_tree_node = resolveComponent("el-tree-node");
  return openBlock(), createElementBlock("div", {
    ref: "el$",
    class: normalizeClass([
      _ctx.ns.b(),
      _ctx.ns.is("dragging", !!_ctx.dragState.draggingNode),
      _ctx.ns.is("drop-not-allow", !_ctx.dragState.allowDrop),
      _ctx.ns.is("drop-inner", _ctx.dragState.dropType === "inner"),
      { [_ctx.ns.m("highlight-current")]: _ctx.highlightCurrent }
    ]),
    role: "tree"
  }, [
    (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.root.childNodes, (child) => {
      return openBlock(), createBlock(_component_el_tree_node, {
        key: _ctx.getNodeKey(child),
        node: child,
        props: _ctx.props,
        accordion: _ctx.accordion,
        "render-after-expand": _ctx.renderAfterExpand,
        "show-checkbox": _ctx.showCheckbox,
        "render-content": _ctx.renderContent,
        onNodeExpand: _ctx.handleNodeExpand
      }, null, 8, ["node", "props", "accordion", "render-after-expand", "show-checkbox", "render-content", "onNodeExpand"]);
    }), 128)),
    _ctx.isEmpty ? (openBlock(), createElementBlock("div", {
      key: 0,
      class: normalizeClass(_ctx.ns.e("empty-block"))
    }, [
      renderSlot(_ctx.$slots, "empty", {}, () => {
        var _a;
        return [
          createElementVNode("span", {
            class: normalizeClass(_ctx.ns.e("empty-text"))
          }, toDisplayString((_a = _ctx.emptyText) != null ? _a : _ctx.t("el.tree.emptyText")), 3)
        ];
      })
    ], 2)) : createCommentVNode("v-if", true),
    withDirectives(createElementVNode("div", {
      ref: "dropIndicator$",
      class: normalizeClass(_ctx.ns.e("drop-indicator"))
    }, null, 2), [
      [vShow, _ctx.dragState.showDropIndicator]
    ])
  ], 2);
}
var Tree = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/tree/src/tree.vue"]]);

export { Tree as default };
//# sourceMappingURL=tree.mjs.map
