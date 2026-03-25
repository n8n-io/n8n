import { defineComponent, inject, ref, getCurrentInstance, provide, watch, nextTick, resolveComponent, withDirectives, openBlock, createElementBlock, normalizeClass, withModifiers, createElementVNode, normalizeStyle, createBlock, withCtx, resolveDynamicComponent, createCommentVNode, createVNode, Fragment, renderList, vShow } from 'vue';
import { isFunction, isString } from '@vue/shared';
import _CollapseTransition from '../../collapse-transition/index.mjs';
import { ElCheckbox } from '../../checkbox/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import { Loading, CaretRight } from '@element-plus/icons-vue';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import NodeContent from './tree-node-content.mjs';
import { getNodeKey, handleCurrentChange } from './model/util.mjs';
import { useNodeExpandEventBroadcast } from './model/useNodeExpandEventBroadcast.mjs';
import { dragEventsKey } from './model/useDragNode.mjs';
import Node from './model/node.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { debugWarn } from '../../../utils/error.mjs';

const _sfc_main = defineComponent({
  name: "ElTreeNode",
  components: {
    ElCollapseTransition: _CollapseTransition,
    ElCheckbox,
    NodeContent,
    ElIcon,
    Loading
  },
  props: {
    node: {
      type: Node,
      default: () => ({})
    },
    props: {
      type: Object,
      default: () => ({})
    },
    accordion: Boolean,
    renderContent: Function,
    renderAfterExpand: Boolean,
    showCheckbox: {
      type: Boolean,
      default: false
    }
  },
  emits: ["node-expand"],
  setup(props, ctx) {
    const ns = useNamespace("tree");
    const { broadcastExpanded } = useNodeExpandEventBroadcast(props);
    const tree = inject("RootTree");
    const expanded = ref(false);
    const childNodeRendered = ref(false);
    const oldChecked = ref(null);
    const oldIndeterminate = ref(null);
    const node$ = ref(null);
    const dragEvents = inject(dragEventsKey);
    const instance = getCurrentInstance();
    provide("NodeInstance", instance);
    if (!tree) {
      debugWarn("Tree", "Can not find node's tree.");
    }
    if (props.node.expanded) {
      expanded.value = true;
      childNodeRendered.value = true;
    }
    const childrenKey = tree.props.props["children"] || "children";
    watch(() => {
      const children = props.node.data[childrenKey];
      return children && [...children];
    }, () => {
      props.node.updateChildren();
    });
    watch(() => props.node.indeterminate, (val) => {
      handleSelectChange(props.node.checked, val);
    });
    watch(() => props.node.checked, (val) => {
      handleSelectChange(val, props.node.indeterminate);
    });
    watch(() => props.node.expanded, (val) => {
      nextTick(() => expanded.value = val);
      if (val) {
        childNodeRendered.value = true;
      }
    });
    const getNodeKey$1 = (node) => {
      return getNodeKey(tree.props.nodeKey, node.data);
    };
    const getNodeClass = (node) => {
      const nodeClassFunc = props.props.class;
      if (!nodeClassFunc) {
        return {};
      }
      let className;
      if (isFunction(nodeClassFunc)) {
        const { data } = node;
        className = nodeClassFunc(data, node);
      } else {
        className = nodeClassFunc;
      }
      if (isString(className)) {
        return { [className]: true };
      } else {
        return className;
      }
    };
    const handleSelectChange = (checked, indeterminate) => {
      if (oldChecked.value !== checked || oldIndeterminate.value !== indeterminate) {
        tree.ctx.emit("check-change", props.node.data, checked, indeterminate);
      }
      oldChecked.value = checked;
      oldIndeterminate.value = indeterminate;
    };
    const handleClick = (e) => {
      handleCurrentChange(tree.store, tree.ctx.emit, () => tree.store.value.setCurrentNode(props.node));
      tree.currentNode.value = props.node;
      if (tree.props.expandOnClickNode) {
        handleExpandIconClick();
      }
      if (tree.props.checkOnClickNode && !props.node.disabled) {
        handleCheckChange(null, {
          target: { checked: !props.node.checked }
        });
      }
      tree.ctx.emit("node-click", props.node.data, props.node, instance, e);
    };
    const handleContextMenu = (event) => {
      if (tree.instance.vnode.props["onNodeContextmenu"]) {
        event.stopPropagation();
        event.preventDefault();
      }
      tree.ctx.emit("node-contextmenu", event, props.node.data, props.node, instance);
    };
    const handleExpandIconClick = () => {
      if (props.node.isLeaf)
        return;
      if (expanded.value) {
        tree.ctx.emit("node-collapse", props.node.data, props.node, instance);
        props.node.collapse();
      } else {
        props.node.expand();
        ctx.emit("node-expand", props.node.data, props.node, instance);
      }
    };
    const handleCheckChange = (value, ev) => {
      props.node.setChecked(ev.target.checked, !tree.props.checkStrictly);
      nextTick(() => {
        const store = tree.store.value;
        tree.ctx.emit("check", props.node.data, {
          checkedNodes: store.getCheckedNodes(),
          checkedKeys: store.getCheckedKeys(),
          halfCheckedNodes: store.getHalfCheckedNodes(),
          halfCheckedKeys: store.getHalfCheckedKeys()
        });
      });
    };
    const handleChildNodeExpand = (nodeData, node, instance2) => {
      broadcastExpanded(node);
      tree.ctx.emit("node-expand", nodeData, node, instance2);
    };
    const handleDragStart = (event) => {
      if (!tree.props.draggable)
        return;
      dragEvents.treeNodeDragStart({ event, treeNode: props });
    };
    const handleDragOver = (event) => {
      event.preventDefault();
      if (!tree.props.draggable)
        return;
      dragEvents.treeNodeDragOver({
        event,
        treeNode: { $el: node$.value, node: props.node }
      });
    };
    const handleDrop = (event) => {
      event.preventDefault();
    };
    const handleDragEnd = (event) => {
      if (!tree.props.draggable)
        return;
      dragEvents.treeNodeDragEnd(event);
    };
    return {
      ns,
      node$,
      tree,
      expanded,
      childNodeRendered,
      oldChecked,
      oldIndeterminate,
      getNodeKey: getNodeKey$1,
      getNodeClass,
      handleSelectChange,
      handleClick,
      handleContextMenu,
      handleExpandIconClick,
      handleCheckChange,
      handleChildNodeExpand,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      CaretRight
    };
  }
});
const _hoisted_1 = ["aria-expanded", "aria-disabled", "aria-checked", "draggable", "data-key"];
const _hoisted_2 = ["aria-expanded"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_icon = resolveComponent("el-icon");
  const _component_el_checkbox = resolveComponent("el-checkbox");
  const _component_loading = resolveComponent("loading");
  const _component_node_content = resolveComponent("node-content");
  const _component_el_tree_node = resolveComponent("el-tree-node");
  const _component_el_collapse_transition = resolveComponent("el-collapse-transition");
  return withDirectives((openBlock(), createElementBlock("div", {
    ref: "node$",
    class: normalizeClass([
      _ctx.ns.b("node"),
      _ctx.ns.is("expanded", _ctx.expanded),
      _ctx.ns.is("current", _ctx.node.isCurrent),
      _ctx.ns.is("hidden", !_ctx.node.visible),
      _ctx.ns.is("focusable", !_ctx.node.disabled),
      _ctx.ns.is("checked", !_ctx.node.disabled && _ctx.node.checked),
      _ctx.getNodeClass(_ctx.node)
    ]),
    role: "treeitem",
    tabindex: "-1",
    "aria-expanded": _ctx.expanded,
    "aria-disabled": _ctx.node.disabled,
    "aria-checked": _ctx.node.checked,
    draggable: _ctx.tree.props.draggable,
    "data-key": _ctx.getNodeKey(_ctx.node),
    onClick: _cache[1] || (_cache[1] = withModifiers((...args) => _ctx.handleClick && _ctx.handleClick(...args), ["stop"])),
    onContextmenu: _cache[2] || (_cache[2] = (...args) => _ctx.handleContextMenu && _ctx.handleContextMenu(...args)),
    onDragstart: _cache[3] || (_cache[3] = withModifiers((...args) => _ctx.handleDragStart && _ctx.handleDragStart(...args), ["stop"])),
    onDragover: _cache[4] || (_cache[4] = withModifiers((...args) => _ctx.handleDragOver && _ctx.handleDragOver(...args), ["stop"])),
    onDragend: _cache[5] || (_cache[5] = withModifiers((...args) => _ctx.handleDragEnd && _ctx.handleDragEnd(...args), ["stop"])),
    onDrop: _cache[6] || (_cache[6] = withModifiers((...args) => _ctx.handleDrop && _ctx.handleDrop(...args), ["stop"]))
  }, [
    createElementVNode("div", {
      class: normalizeClass(_ctx.ns.be("node", "content")),
      style: normalizeStyle({ paddingLeft: (_ctx.node.level - 1) * _ctx.tree.props.indent + "px" })
    }, [
      _ctx.tree.props.icon || _ctx.CaretRight ? (openBlock(), createBlock(_component_el_icon, {
        key: 0,
        class: normalizeClass([
          _ctx.ns.be("node", "expand-icon"),
          _ctx.ns.is("leaf", _ctx.node.isLeaf),
          {
            expanded: !_ctx.node.isLeaf && _ctx.expanded
          }
        ]),
        onClick: withModifiers(_ctx.handleExpandIconClick, ["stop"])
      }, {
        default: withCtx(() => [
          (openBlock(), createBlock(resolveDynamicComponent(_ctx.tree.props.icon || _ctx.CaretRight)))
        ]),
        _: 1
      }, 8, ["class", "onClick"])) : createCommentVNode("v-if", true),
      _ctx.showCheckbox ? (openBlock(), createBlock(_component_el_checkbox, {
        key: 1,
        "model-value": _ctx.node.checked,
        indeterminate: _ctx.node.indeterminate,
        disabled: !!_ctx.node.disabled,
        onClick: _cache[0] || (_cache[0] = withModifiers(() => {
        }, ["stop"])),
        onChange: _ctx.handleCheckChange
      }, null, 8, ["model-value", "indeterminate", "disabled", "onChange"])) : createCommentVNode("v-if", true),
      _ctx.node.loading ? (openBlock(), createBlock(_component_el_icon, {
        key: 2,
        class: normalizeClass([_ctx.ns.be("node", "loading-icon"), _ctx.ns.is("loading")])
      }, {
        default: withCtx(() => [
          createVNode(_component_loading)
        ]),
        _: 1
      }, 8, ["class"])) : createCommentVNode("v-if", true),
      createVNode(_component_node_content, {
        node: _ctx.node,
        "render-content": _ctx.renderContent
      }, null, 8, ["node", "render-content"])
    ], 6),
    createVNode(_component_el_collapse_transition, null, {
      default: withCtx(() => [
        !_ctx.renderAfterExpand || _ctx.childNodeRendered ? withDirectives((openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(_ctx.ns.be("node", "children")),
          role: "group",
          "aria-expanded": _ctx.expanded
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.node.childNodes, (child) => {
            return openBlock(), createBlock(_component_el_tree_node, {
              key: _ctx.getNodeKey(child),
              "render-content": _ctx.renderContent,
              "render-after-expand": _ctx.renderAfterExpand,
              "show-checkbox": _ctx.showCheckbox,
              node: child,
              accordion: _ctx.accordion,
              props: _ctx.props,
              onNodeExpand: _ctx.handleChildNodeExpand
            }, null, 8, ["render-content", "render-after-expand", "show-checkbox", "node", "accordion", "props", "onNodeExpand"]);
          }), 128))
        ], 10, _hoisted_2)), [
          [vShow, _ctx.expanded]
        ]) : createCommentVNode("v-if", true)
      ]),
      _: 1
    })
  ], 42, _hoisted_1)), [
    [vShow, _ctx.node.visible]
  ]);
}
var ElTreeNode = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/tree/src/tree-node.vue"]]);

export { ElTreeNode as default };
//# sourceMappingURL=tree-node.mjs.map
