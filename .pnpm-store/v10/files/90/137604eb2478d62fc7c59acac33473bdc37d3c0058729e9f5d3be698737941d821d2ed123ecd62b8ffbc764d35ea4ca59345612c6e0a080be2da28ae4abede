import { defineComponent, inject, computed, openBlock, createElementBlock, normalizeClass, unref, withModifiers, createElementVNode, normalizeStyle, createBlock, withCtx, resolveDynamicComponent, createCommentVNode, createVNode } from 'vue';
import { ElIcon } from '../../icon/index.mjs';
import { CaretRight } from '@element-plus/icons-vue';
import { ElCheckbox } from '../../checkbox/index.mjs';
import '../../../hooks/index.mjs';
import ElNodeContent from './tree-node-content.mjs';
import { treeNodeProps, treeNodeEmits, ROOT_TREE_INJECTION_KEY, NODE_CONTEXTMENU } from './virtual-tree.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _hoisted_1 = ["aria-expanded", "aria-disabled", "aria-checked", "data-key", "onClick"];
const __default__ = defineComponent({
  name: "ElTreeNode"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: treeNodeProps,
  emits: treeNodeEmits,
  setup(__props, { emit }) {
    const props = __props;
    const tree = inject(ROOT_TREE_INJECTION_KEY);
    const ns = useNamespace("tree");
    const indent = computed(() => {
      var _a;
      return (_a = tree == null ? void 0 : tree.props.indent) != null ? _a : 16;
    });
    const icon = computed(() => {
      var _a;
      return (_a = tree == null ? void 0 : tree.props.icon) != null ? _a : CaretRight;
    });
    const handleClick = (e) => {
      emit("click", props.node, e);
    };
    const handleExpandIconClick = () => {
      emit("toggle", props.node);
    };
    const handleCheckChange = (value) => {
      emit("check", props.node, value);
    };
    const handleContextMenu = (event) => {
      var _a, _b, _c, _d;
      if ((_c = (_b = (_a = tree == null ? void 0 : tree.instance) == null ? void 0 : _a.vnode) == null ? void 0 : _b.props) == null ? void 0 : _c["onNodeContextmenu"]) {
        event.stopPropagation();
        event.preventDefault();
      }
      tree == null ? void 0 : tree.ctx.emit(NODE_CONTEXTMENU, event, (_d = props.node) == null ? void 0 : _d.data, props.node);
    };
    return (_ctx, _cache) => {
      var _a, _b, _c;
      return openBlock(), createElementBlock("div", {
        ref: "node$",
        class: normalizeClass([
          unref(ns).b("node"),
          unref(ns).is("expanded", _ctx.expanded),
          unref(ns).is("current", _ctx.current),
          unref(ns).is("focusable", !_ctx.disabled),
          unref(ns).is("checked", !_ctx.disabled && _ctx.checked)
        ]),
        role: "treeitem",
        tabindex: "-1",
        "aria-expanded": _ctx.expanded,
        "aria-disabled": _ctx.disabled,
        "aria-checked": _ctx.checked,
        "data-key": (_a = _ctx.node) == null ? void 0 : _a.key,
        onClick: withModifiers(handleClick, ["stop"]),
        onContextmenu: handleContextMenu
      }, [
        createElementVNode("div", {
          class: normalizeClass(unref(ns).be("node", "content")),
          style: normalizeStyle({
            paddingLeft: `${(_ctx.node.level - 1) * unref(indent)}px`,
            height: _ctx.itemSize + "px"
          })
        }, [
          unref(icon) ? (openBlock(), createBlock(unref(ElIcon), {
            key: 0,
            class: normalizeClass([
              unref(ns).is("leaf", !!((_b = _ctx.node) == null ? void 0 : _b.isLeaf)),
              unref(ns).is("hidden", _ctx.hiddenExpandIcon),
              {
                expanded: !((_c = _ctx.node) == null ? void 0 : _c.isLeaf) && _ctx.expanded
              },
              unref(ns).be("node", "expand-icon")
            ]),
            onClick: withModifiers(handleExpandIconClick, ["stop"])
          }, {
            default: withCtx(() => [
              (openBlock(), createBlock(resolveDynamicComponent(unref(icon))))
            ]),
            _: 1
          }, 8, ["class", "onClick"])) : createCommentVNode("v-if", true),
          _ctx.showCheckbox ? (openBlock(), createBlock(unref(ElCheckbox), {
            key: 1,
            "model-value": _ctx.checked,
            indeterminate: _ctx.indeterminate,
            disabled: _ctx.disabled,
            onChange: handleCheckChange,
            onClick: _cache[0] || (_cache[0] = withModifiers(() => {
            }, ["stop"]))
          }, null, 8, ["model-value", "indeterminate", "disabled"])) : createCommentVNode("v-if", true),
          createVNode(unref(ElNodeContent), { node: _ctx.node }, null, 8, ["node"])
        ], 6)
      ], 42, _hoisted_1);
    };
  }
});
var ElTreeNode = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tree-v2/src/tree-node.vue"]]);

export { ElTreeNode as default };
//# sourceMappingURL=tree-node.mjs.map
