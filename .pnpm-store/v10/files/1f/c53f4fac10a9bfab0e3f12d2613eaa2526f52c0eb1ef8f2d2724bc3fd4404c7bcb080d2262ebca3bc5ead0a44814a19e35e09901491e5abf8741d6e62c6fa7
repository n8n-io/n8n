'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var alert = require('./alert.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var icon = require('../../../utils/vue/icon.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElAlert"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: alert.alertProps,
  emits: alert.alertEmits,
  setup(__props, { emit }) {
    const props = __props;
    const { Close } = icon.TypeComponents;
    const slots = vue.useSlots();
    const ns = index.useNamespace("alert");
    const visible = vue.ref(true);
    const iconComponent = vue.computed(() => icon.TypeComponentsMap[props.type]);
    const iconClass = vue.computed(() => [
      ns.e("icon"),
      { [ns.is("big")]: !!props.description || !!slots.default }
    ]);
    const isBoldTitle = vue.computed(() => {
      return { [ns.is("bold")]: props.description || slots.default };
    });
    const close = (evt) => {
      visible.value = false;
      emit("close", evt);
    };
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Transition, {
        name: vue.unref(ns).b("fade"),
        persisted: ""
      }, {
        default: vue.withCtx(() => [
          vue.withDirectives(vue.createElementVNode("div", {
            class: vue.normalizeClass([vue.unref(ns).b(), vue.unref(ns).m(_ctx.type), vue.unref(ns).is("center", _ctx.center), vue.unref(ns).is(_ctx.effect)]),
            role: "alert"
          }, [
            _ctx.showIcon && vue.unref(iconComponent) ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
              key: 0,
              class: vue.normalizeClass(vue.unref(iconClass))
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(iconComponent))))
              ]),
              _: 1
            }, 8, ["class"])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).e("content"))
            }, [
              _ctx.title || _ctx.$slots.title ? (vue.openBlock(), vue.createElementBlock("span", {
                key: 0,
                class: vue.normalizeClass([vue.unref(ns).e("title"), vue.unref(isBoldTitle)])
              }, [
                vue.renderSlot(_ctx.$slots, "title", {}, () => [
                  vue.createTextVNode(vue.toDisplayString(_ctx.title), 1)
                ])
              ], 2)) : vue.createCommentVNode("v-if", true),
              _ctx.$slots.default || _ctx.description ? (vue.openBlock(), vue.createElementBlock("p", {
                key: 1,
                class: vue.normalizeClass(vue.unref(ns).e("description"))
              }, [
                vue.renderSlot(_ctx.$slots, "default", {}, () => [
                  vue.createTextVNode(vue.toDisplayString(_ctx.description), 1)
                ])
              ], 2)) : vue.createCommentVNode("v-if", true),
              _ctx.closable ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 2 }, [
                _ctx.closeText ? (vue.openBlock(), vue.createElementBlock("div", {
                  key: 0,
                  class: vue.normalizeClass([vue.unref(ns).e("close-btn"), vue.unref(ns).is("customed")]),
                  onClick: close
                }, vue.toDisplayString(_ctx.closeText), 3)) : (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
                  key: 1,
                  class: vue.normalizeClass(vue.unref(ns).e("close-btn")),
                  onClick: close
                }, {
                  default: vue.withCtx(() => [
                    vue.createVNode(vue.unref(Close))
                  ]),
                  _: 1
                }, 8, ["class"]))
              ], 64)) : vue.createCommentVNode("v-if", true)
            ], 2)
          ], 2), [
            [vue.vShow, visible.value]
          ])
        ]),
        _: 3
      }, 8, ["name"]);
    };
  }
});
var Alert = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/alert/src/alert.vue"]]);

exports["default"] = Alert;
//# sourceMappingURL=alert2.js.map
