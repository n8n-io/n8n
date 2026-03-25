'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var iconsVue = require('@element-plus/icons-vue');
var index = require('../../overlay/index.js');
require('../../focus-trap/index.js');
require('../../dialog/index.js');
require('../../../utils/index.js');
var index$1 = require('../../icon/index.js');
require('../../../hooks/index.js');
var drawer = require('./drawer.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var focusTrap = require('../../focus-trap/src/focus-trap.js');
var index$2 = require('../../../hooks/use-deprecated/index.js');
var index$3 = require('../../../hooks/use-namespace/index.js');
var index$4 = require('../../../hooks/use-locale/index.js');
var style = require('../../../utils/dom/style.js');
var useDialog = require('../../dialog/src/use-dialog.js');

const _sfc_main = vue.defineComponent({
  name: "ElDrawer",
  components: {
    ElOverlay: index.ElOverlay,
    ElFocusTrap: focusTrap["default"],
    ElIcon: index$1.ElIcon,
    Close: iconsVue.Close
  },
  inheritAttrs: false,
  props: drawer.drawerProps,
  emits: drawer.drawerEmits,
  setup(props, { slots }) {
    index$2.useDeprecated({
      scope: "el-drawer",
      from: "the title slot",
      replacement: "the header slot",
      version: "3.0.0",
      ref: "https://element-plus.org/en-US/component/drawer.html#slots"
    }, vue.computed(() => !!slots.title));
    index$2.useDeprecated({
      scope: "el-drawer",
      from: "custom-class",
      replacement: "class",
      version: "2.3.0",
      ref: "https://element-plus.org/en-US/component/drawer.html#attributes",
      type: "Attribute"
    }, vue.computed(() => !!props.customClass));
    const drawerRef = vue.ref();
    const focusStartRef = vue.ref();
    const ns = index$3.useNamespace("drawer");
    const { t } = index$4.useLocale();
    const isHorizontal = vue.computed(() => props.direction === "rtl" || props.direction === "ltr");
    const drawerSize = vue.computed(() => style.addUnit(props.size));
    return {
      ...useDialog.useDialog(props, drawerRef),
      drawerRef,
      focusStartRef,
      isHorizontal,
      drawerSize,
      ns,
      t
    };
  }
});
const _hoisted_1 = ["aria-label", "aria-labelledby", "aria-describedby"];
const _hoisted_2 = ["id", "aria-level"];
const _hoisted_3 = ["aria-label"];
const _hoisted_4 = ["id"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_close = vue.resolveComponent("close");
  const _component_el_icon = vue.resolveComponent("el-icon");
  const _component_el_focus_trap = vue.resolveComponent("el-focus-trap");
  const _component_el_overlay = vue.resolveComponent("el-overlay");
  return vue.openBlock(), vue.createBlock(vue.Teleport, {
    to: "body",
    disabled: !_ctx.appendToBody
  }, [
    vue.createVNode(vue.Transition, {
      name: _ctx.ns.b("fade"),
      onAfterEnter: _ctx.afterEnter,
      onAfterLeave: _ctx.afterLeave,
      onBeforeLeave: _ctx.beforeLeave,
      persisted: ""
    }, {
      default: vue.withCtx(() => [
        vue.withDirectives(vue.createVNode(_component_el_overlay, {
          mask: _ctx.modal,
          "overlay-class": _ctx.modalClass,
          "z-index": _ctx.zIndex,
          onClick: _ctx.onModalClick
        }, {
          default: vue.withCtx(() => [
            vue.createVNode(_component_el_focus_trap, {
              loop: "",
              trapped: _ctx.visible,
              "focus-trap-el": _ctx.drawerRef,
              "focus-start-el": _ctx.focusStartRef,
              onReleaseRequested: _ctx.onCloseRequested
            }, {
              default: vue.withCtx(() => [
                vue.createElementVNode("div", vue.mergeProps({
                  ref: "drawerRef",
                  "aria-modal": "true",
                  "aria-label": _ctx.title || void 0,
                  "aria-labelledby": !_ctx.title ? _ctx.titleId : void 0,
                  "aria-describedby": _ctx.bodyId
                }, _ctx.$attrs, {
                  class: [_ctx.ns.b(), _ctx.direction, _ctx.visible && "open", _ctx.customClass],
                  style: _ctx.isHorizontal ? "width: " + _ctx.drawerSize : "height: " + _ctx.drawerSize,
                  role: "dialog",
                  onClick: _cache[1] || (_cache[1] = vue.withModifiers(() => {
                  }, ["stop"]))
                }), [
                  vue.createElementVNode("span", {
                    ref: "focusStartRef",
                    class: vue.normalizeClass(_ctx.ns.e("sr-focus")),
                    tabindex: "-1"
                  }, null, 2),
                  _ctx.withHeader ? (vue.openBlock(), vue.createElementBlock("header", {
                    key: 0,
                    class: vue.normalizeClass(_ctx.ns.e("header"))
                  }, [
                    !_ctx.$slots.title ? vue.renderSlot(_ctx.$slots, "header", {
                      key: 0,
                      close: _ctx.handleClose,
                      titleId: _ctx.titleId,
                      titleClass: _ctx.ns.e("title")
                    }, () => [
                      !_ctx.$slots.title ? (vue.openBlock(), vue.createElementBlock("span", {
                        key: 0,
                        id: _ctx.titleId,
                        role: "heading",
                        "aria-level": _ctx.headerAriaLevel,
                        class: vue.normalizeClass(_ctx.ns.e("title"))
                      }, vue.toDisplayString(_ctx.title), 11, _hoisted_2)) : vue.createCommentVNode("v-if", true)
                    ]) : vue.renderSlot(_ctx.$slots, "title", { key: 1 }, () => [
                      vue.createCommentVNode(" DEPRECATED SLOT ")
                    ]),
                    _ctx.showClose ? (vue.openBlock(), vue.createElementBlock("button", {
                      key: 2,
                      "aria-label": _ctx.t("el.drawer.close"),
                      class: vue.normalizeClass(_ctx.ns.e("close-btn")),
                      type: "button",
                      onClick: _cache[0] || (_cache[0] = (...args) => _ctx.handleClose && _ctx.handleClose(...args))
                    }, [
                      vue.createVNode(_component_el_icon, {
                        class: vue.normalizeClass(_ctx.ns.e("close"))
                      }, {
                        default: vue.withCtx(() => [
                          vue.createVNode(_component_close)
                        ]),
                        _: 1
                      }, 8, ["class"])
                    ], 10, _hoisted_3)) : vue.createCommentVNode("v-if", true)
                  ], 2)) : vue.createCommentVNode("v-if", true),
                  _ctx.rendered ? (vue.openBlock(), vue.createElementBlock("div", {
                    key: 1,
                    id: _ctx.bodyId,
                    class: vue.normalizeClass(_ctx.ns.e("body"))
                  }, [
                    vue.renderSlot(_ctx.$slots, "default")
                  ], 10, _hoisted_4)) : vue.createCommentVNode("v-if", true),
                  _ctx.$slots.footer ? (vue.openBlock(), vue.createElementBlock("div", {
                    key: 2,
                    class: vue.normalizeClass(_ctx.ns.e("footer"))
                  }, [
                    vue.renderSlot(_ctx.$slots, "footer")
                  ], 2)) : vue.createCommentVNode("v-if", true)
                ], 16, _hoisted_1)
              ]),
              _: 3
            }, 8, ["trapped", "focus-trap-el", "focus-start-el", "onReleaseRequested"])
          ]),
          _: 3
        }, 8, ["mask", "overlay-class", "z-index", "onClick"]), [
          [vue.vShow, _ctx.visible]
        ])
      ]),
      _: 3
    }, 8, ["name", "onAfterEnter", "onAfterLeave", "onBeforeLeave"])
  ], 8, ["disabled"]);
}
var Drawer = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/drawer/src/drawer.vue"]]);

exports["default"] = Drawer;
//# sourceMappingURL=drawer2.js.map
