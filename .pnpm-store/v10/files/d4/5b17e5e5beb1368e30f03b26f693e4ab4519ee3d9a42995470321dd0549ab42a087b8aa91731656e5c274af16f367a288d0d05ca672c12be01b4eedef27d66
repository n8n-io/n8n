'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$2 = require('../../icon/index.js');
var index$3 = require('../../divider/index.js');
require('../../../hooks/index.js');
var pageHeader = require('./page-header.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["aria-label"];
const __default__ = vue.defineComponent({
  name: "ElPageHeader"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: pageHeader.pageHeaderProps,
  emits: pageHeader.pageHeaderEmits,
  setup(__props, { emit }) {
    const slots = vue.useSlots();
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("page-header");
    const kls = vue.computed(() => {
      return [
        ns.b(),
        {
          [ns.m("has-breadcrumb")]: !!slots.breadcrumb,
          [ns.m("has-extra")]: !!slots.extra,
          [ns.is("contentful")]: !!slots.default
        }
      ];
    });
    function handleClick() {
      emit("back");
    }
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(kls))
      }, [
        _ctx.$slots.breadcrumb ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).e("breadcrumb"))
        }, [
          vue.renderSlot(_ctx.$slots, "breadcrumb")
        ], 2)) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("header"))
        }, [
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ns).e("left"))
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).e("back")),
              role: "button",
              tabindex: "0",
              onClick: handleClick
            }, [
              _ctx.icon || _ctx.$slots.icon ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 0,
                "aria-label": _ctx.title || vue.unref(t)("el.pageHeader.title"),
                class: vue.normalizeClass(vue.unref(ns).e("icon"))
              }, [
                vue.renderSlot(_ctx.$slots, "icon", {}, () => [
                  _ctx.icon ? (vue.openBlock(), vue.createBlock(vue.unref(index$2.ElIcon), { key: 0 }, {
                    default: vue.withCtx(() => [
                      (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon)))
                    ]),
                    _: 1
                  })) : vue.createCommentVNode("v-if", true)
                ])
              ], 10, _hoisted_1)) : vue.createCommentVNode("v-if", true),
              vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(ns).e("title"))
              }, [
                vue.renderSlot(_ctx.$slots, "title", {}, () => [
                  vue.createTextVNode(vue.toDisplayString(_ctx.title || vue.unref(t)("el.pageHeader.title")), 1)
                ])
              ], 2)
            ], 2),
            vue.createVNode(vue.unref(index$3.ElDivider), { direction: "vertical" }),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).e("content"))
            }, [
              vue.renderSlot(_ctx.$slots, "content", {}, () => [
                vue.createTextVNode(vue.toDisplayString(_ctx.content), 1)
              ])
            ], 2)
          ], 2),
          _ctx.$slots.extra ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).e("extra"))
          }, [
            vue.renderSlot(_ctx.$slots, "extra")
          ], 2)) : vue.createCommentVNode("v-if", true)
        ], 2),
        _ctx.$slots.default ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 1,
          class: vue.normalizeClass(vue.unref(ns).e("main"))
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 2)) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var PageHeader = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/page-header/src/page-header.vue"]]);

exports["default"] = PageHeader;
//# sourceMappingURL=page-header2.js.map
