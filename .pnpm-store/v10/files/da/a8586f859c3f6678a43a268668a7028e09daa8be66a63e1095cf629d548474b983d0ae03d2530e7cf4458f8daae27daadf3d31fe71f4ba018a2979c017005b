import { defineComponent, getCurrentInstance, inject, ref, computed, resolveComponent, openBlock, createBlock, normalizeClass, withCtx, createElementBlock, Fragment, renderList, createVNode, createTextVNode, toDisplayString, createCommentVNode } from 'vue';
import { ElScrollbar } from '../../scrollbar/index.mjs';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import { Loading } from '@element-plus/icons-vue';
import { ElIcon } from '../../icon/index.mjs';
import ElCascaderNode from './node2.mjs';
import { CASCADER_PANEL_INJECTION_KEY } from './types.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { generateId } from '../../../utils/rand.mjs';

const _sfc_main = defineComponent({
  name: "ElCascaderMenu",
  components: {
    Loading,
    ElIcon,
    ElScrollbar,
    ElCascaderNode
  },
  props: {
    nodes: {
      type: Array,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const instance = getCurrentInstance();
    const ns = useNamespace("cascader-menu");
    const { t } = useLocale();
    const id = generateId();
    let activeNode = null;
    let hoverTimer = null;
    const panel = inject(CASCADER_PANEL_INJECTION_KEY);
    const hoverZone = ref(null);
    const isEmpty = computed(() => !props.nodes.length);
    const isLoading = computed(() => !panel.initialLoaded);
    const menuId = computed(() => `cascader-menu-${id}-${props.index}`);
    const handleExpand = (e) => {
      activeNode = e.target;
    };
    const handleMouseMove = (e) => {
      if (!panel.isHoverMenu || !activeNode || !hoverZone.value)
        return;
      if (activeNode.contains(e.target)) {
        clearHoverTimer();
        const el = instance.vnode.el;
        const { left } = el.getBoundingClientRect();
        const { offsetWidth, offsetHeight } = el;
        const startX = e.clientX - left;
        const top = activeNode.offsetTop;
        const bottom = top + activeNode.offsetHeight;
        hoverZone.value.innerHTML = `
          <path style="pointer-events: auto;" fill="transparent" d="M${startX} ${top} L${offsetWidth} 0 V${top} Z" />
          <path style="pointer-events: auto;" fill="transparent" d="M${startX} ${bottom} L${offsetWidth} ${offsetHeight} V${bottom} Z" />
        `;
      } else if (!hoverTimer) {
        hoverTimer = window.setTimeout(clearHoverZone, panel.config.hoverThreshold);
      }
    };
    const clearHoverTimer = () => {
      if (!hoverTimer)
        return;
      clearTimeout(hoverTimer);
      hoverTimer = null;
    };
    const clearHoverZone = () => {
      if (!hoverZone.value)
        return;
      hoverZone.value.innerHTML = "";
      clearHoverTimer();
    };
    return {
      ns,
      panel,
      hoverZone,
      isEmpty,
      isLoading,
      menuId,
      t,
      handleExpand,
      handleMouseMove,
      clearHoverZone
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_cascader_node = resolveComponent("el-cascader-node");
  const _component_loading = resolveComponent("loading");
  const _component_el_icon = resolveComponent("el-icon");
  const _component_el_scrollbar = resolveComponent("el-scrollbar");
  return openBlock(), createBlock(_component_el_scrollbar, {
    key: _ctx.menuId,
    tag: "ul",
    role: "menu",
    class: normalizeClass(_ctx.ns.b()),
    "wrap-class": _ctx.ns.e("wrap"),
    "view-class": [_ctx.ns.e("list"), _ctx.ns.is("empty", _ctx.isEmpty)],
    onMousemove: _ctx.handleMouseMove,
    onMouseleave: _ctx.clearHoverZone
  }, {
    default: withCtx(() => {
      var _a;
      return [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.nodes, (node) => {
          return openBlock(), createBlock(_component_el_cascader_node, {
            key: node.uid,
            node,
            "menu-id": _ctx.menuId,
            onExpand: _ctx.handleExpand
          }, null, 8, ["node", "menu-id", "onExpand"]);
        }), 128)),
        _ctx.isLoading ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(_ctx.ns.e("empty-text"))
        }, [
          createVNode(_component_el_icon, {
            size: "14",
            class: normalizeClass(_ctx.ns.is("loading"))
          }, {
            default: withCtx(() => [
              createVNode(_component_loading)
            ]),
            _: 1
          }, 8, ["class"]),
          createTextVNode(" " + toDisplayString(_ctx.t("el.cascader.loading")), 1)
        ], 2)) : _ctx.isEmpty ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: normalizeClass(_ctx.ns.e("empty-text"))
        }, toDisplayString(_ctx.t("el.cascader.noData")), 3)) : ((_a = _ctx.panel) == null ? void 0 : _a.isHoverMenu) ? (openBlock(), createElementBlock("svg", {
          key: 2,
          ref: "hoverZone",
          class: normalizeClass(_ctx.ns.e("hover-zone"))
        }, null, 2)) : createCommentVNode("v-if", true)
      ];
    }),
    _: 1
  }, 8, ["class", "wrap-class", "view-class", "onMousemove", "onMouseleave"]);
}
var ElCascaderMenu = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/cascader-panel/src/menu.vue"]]);

export { ElCascaderMenu as default };
//# sourceMappingURL=menu.mjs.map
