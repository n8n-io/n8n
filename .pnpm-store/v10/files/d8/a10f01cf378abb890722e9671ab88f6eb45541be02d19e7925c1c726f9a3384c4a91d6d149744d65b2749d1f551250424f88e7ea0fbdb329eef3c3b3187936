'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index = require('../../checkbox/index.js');
var index$1 = require('../../radio/index.js');
var index$2 = require('../../icon/index.js');
require('../../../hooks/index.js');
var iconsVue = require('@element-plus/icons-vue');
var nodeContent = require('./node-content.js');
var types = require('./types.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index$3 = require('../../../hooks/use-namespace/index.js');

const _sfc_main = vue.defineComponent({
  name: "ElCascaderNode",
  components: {
    ElCheckbox: index.ElCheckbox,
    ElRadio: index$1.ElRadio,
    NodeContent: nodeContent["default"],
    ElIcon: index$2.ElIcon,
    Check: iconsVue.Check,
    Loading: iconsVue.Loading,
    ArrowRight: iconsVue.ArrowRight
  },
  props: {
    node: {
      type: Object,
      required: true
    },
    menuId: String
  },
  emits: ["expand"],
  setup(props, { emit }) {
    const panel = vue.inject(types.CASCADER_PANEL_INJECTION_KEY);
    const ns = index$3.useNamespace("cascader-node");
    const isHoverMenu = vue.computed(() => panel.isHoverMenu);
    const multiple = vue.computed(() => panel.config.multiple);
    const checkStrictly = vue.computed(() => panel.config.checkStrictly);
    const checkedNodeId = vue.computed(() => {
      var _a;
      return (_a = panel.checkedNodes[0]) == null ? void 0 : _a.uid;
    });
    const isDisabled = vue.computed(() => props.node.isDisabled);
    const isLeaf = vue.computed(() => props.node.isLeaf);
    const expandable = vue.computed(() => checkStrictly.value && !isLeaf.value || !isDisabled.value);
    const inExpandingPath = vue.computed(() => isInPath(panel.expandingNode));
    const inCheckedPath = vue.computed(() => checkStrictly.value && panel.checkedNodes.some(isInPath));
    const isInPath = (node) => {
      var _a;
      const { level, uid } = props.node;
      return ((_a = node == null ? void 0 : node.pathNodes[level - 1]) == null ? void 0 : _a.uid) === uid;
    };
    const doExpand = () => {
      if (inExpandingPath.value)
        return;
      panel.expandNode(props.node);
    };
    const doCheck = (checked) => {
      const { node } = props;
      if (checked === node.checked)
        return;
      panel.handleCheckChange(node, checked);
    };
    const doLoad = () => {
      panel.lazyLoad(props.node, () => {
        if (!isLeaf.value)
          doExpand();
      });
    };
    const handleHoverExpand = (e) => {
      if (!isHoverMenu.value)
        return;
      handleExpand();
      !isLeaf.value && emit("expand", e);
    };
    const handleExpand = () => {
      const { node } = props;
      if (!expandable.value || node.loading)
        return;
      node.loaded ? doExpand() : doLoad();
    };
    const handleClick = () => {
      if (isHoverMenu.value && !isLeaf.value)
        return;
      if (isLeaf.value && !isDisabled.value && !checkStrictly.value && !multiple.value) {
        handleCheck(true);
      } else {
        handleExpand();
      }
    };
    const handleSelectCheck = (checked) => {
      if (checkStrictly.value) {
        doCheck(checked);
        if (props.node.loaded) {
          doExpand();
        }
      } else {
        handleCheck(checked);
      }
    };
    const handleCheck = (checked) => {
      if (!props.node.loaded) {
        doLoad();
      } else {
        doCheck(checked);
        !checkStrictly.value && doExpand();
      }
    };
    return {
      panel,
      isHoverMenu,
      multiple,
      checkStrictly,
      checkedNodeId,
      isDisabled,
      isLeaf,
      expandable,
      inExpandingPath,
      inCheckedPath,
      ns,
      handleHoverExpand,
      handleExpand,
      handleClick,
      handleCheck,
      handleSelectCheck
    };
  }
});
const _hoisted_1 = ["id", "aria-haspopup", "aria-owns", "aria-expanded", "tabindex"];
const _hoisted_2 = /* @__PURE__ */ vue.createElementVNode("span", null, null, -1);
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_checkbox = vue.resolveComponent("el-checkbox");
  const _component_el_radio = vue.resolveComponent("el-radio");
  const _component_check = vue.resolveComponent("check");
  const _component_el_icon = vue.resolveComponent("el-icon");
  const _component_node_content = vue.resolveComponent("node-content");
  const _component_loading = vue.resolveComponent("loading");
  const _component_arrow_right = vue.resolveComponent("arrow-right");
  return vue.openBlock(), vue.createElementBlock("li", {
    id: `${_ctx.menuId}-${_ctx.node.uid}`,
    role: "menuitem",
    "aria-haspopup": !_ctx.isLeaf,
    "aria-owns": _ctx.isLeaf ? null : _ctx.menuId,
    "aria-expanded": _ctx.inExpandingPath,
    tabindex: _ctx.expandable ? -1 : void 0,
    class: vue.normalizeClass([
      _ctx.ns.b(),
      _ctx.ns.is("selectable", _ctx.checkStrictly),
      _ctx.ns.is("active", _ctx.node.checked),
      _ctx.ns.is("disabled", !_ctx.expandable),
      _ctx.inExpandingPath && "in-active-path",
      _ctx.inCheckedPath && "in-checked-path"
    ]),
    onMouseenter: _cache[2] || (_cache[2] = (...args) => _ctx.handleHoverExpand && _ctx.handleHoverExpand(...args)),
    onFocus: _cache[3] || (_cache[3] = (...args) => _ctx.handleHoverExpand && _ctx.handleHoverExpand(...args)),
    onClick: _cache[4] || (_cache[4] = (...args) => _ctx.handleClick && _ctx.handleClick(...args))
  }, [
    vue.createCommentVNode(" prefix "),
    _ctx.multiple ? (vue.openBlock(), vue.createBlock(_component_el_checkbox, {
      key: 0,
      "model-value": _ctx.node.checked,
      indeterminate: _ctx.node.indeterminate,
      disabled: _ctx.isDisabled,
      onClick: _cache[0] || (_cache[0] = vue.withModifiers(() => {
      }, ["stop"])),
      "onUpdate:modelValue": _ctx.handleSelectCheck
    }, null, 8, ["model-value", "indeterminate", "disabled", "onUpdate:modelValue"])) : _ctx.checkStrictly ? (vue.openBlock(), vue.createBlock(_component_el_radio, {
      key: 1,
      "model-value": _ctx.checkedNodeId,
      label: _ctx.node.uid,
      disabled: _ctx.isDisabled,
      "onUpdate:modelValue": _ctx.handleSelectCheck,
      onClick: _cache[1] || (_cache[1] = vue.withModifiers(() => {
      }, ["stop"]))
    }, {
      default: vue.withCtx(() => [
        vue.createCommentVNode("\n        Add an empty element to avoid render label,\n        do not use empty fragment here for https://github.com/vuejs/vue-next/pull/2485\n      "),
        _hoisted_2
      ]),
      _: 1
    }, 8, ["model-value", "label", "disabled", "onUpdate:modelValue"])) : _ctx.isLeaf && _ctx.node.checked ? (vue.openBlock(), vue.createBlock(_component_el_icon, {
      key: 2,
      class: vue.normalizeClass(_ctx.ns.e("prefix"))
    }, {
      default: vue.withCtx(() => [
        vue.createVNode(_component_check)
      ]),
      _: 1
    }, 8, ["class"])) : vue.createCommentVNode("v-if", true),
    vue.createCommentVNode(" content "),
    vue.createVNode(_component_node_content),
    vue.createCommentVNode(" postfix "),
    !_ctx.isLeaf ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 3 }, [
      _ctx.node.loading ? (vue.openBlock(), vue.createBlock(_component_el_icon, {
        key: 0,
        class: vue.normalizeClass([_ctx.ns.is("loading"), _ctx.ns.e("postfix")])
      }, {
        default: vue.withCtx(() => [
          vue.createVNode(_component_loading)
        ]),
        _: 1
      }, 8, ["class"])) : (vue.openBlock(), vue.createBlock(_component_el_icon, {
        key: 1,
        class: vue.normalizeClass(["arrow-right", _ctx.ns.e("postfix")])
      }, {
        default: vue.withCtx(() => [
          vue.createVNode(_component_arrow_right)
        ]),
        _: 1
      }, 8, ["class"]))
    ], 64)) : vue.createCommentVNode("v-if", true)
  ], 42, _hoisted_1);
}
var ElCascaderNode = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/cascader-panel/src/node.vue"]]);

exports["default"] = ElCascaderNode;
//# sourceMappingURL=node2.js.map
