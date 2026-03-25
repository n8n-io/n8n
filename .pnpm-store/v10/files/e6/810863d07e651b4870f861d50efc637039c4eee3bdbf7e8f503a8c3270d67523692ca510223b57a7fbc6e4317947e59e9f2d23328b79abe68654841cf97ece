'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
require('../../form/index.js');
var tag = require('./tag.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElTag"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: tag.tagProps,
  emits: tag.tagEmits,
  setup(__props, { emit }) {
    const props = __props;
    const tagSize = useFormCommonProps.useFormSize();
    const ns = index.useNamespace("tag");
    const containerKls = vue.computed(() => {
      const { type, hit, effect, closable, round } = props;
      return [
        ns.b(),
        ns.is("closable", closable),
        ns.m(type),
        ns.m(tagSize.value),
        ns.m(effect),
        ns.is("hit", hit),
        ns.is("round", round)
      ];
    });
    const handleClose = (event) => {
      emit("close", event);
    };
    const handleClick = (event) => {
      emit("click", event);
    };
    return (_ctx, _cache) => {
      return _ctx.disableTransitions ? (vue.openBlock(), vue.createElementBlock("span", {
        key: 0,
        class: vue.normalizeClass(vue.unref(containerKls)),
        style: vue.normalizeStyle({ backgroundColor: _ctx.color }),
        onClick: handleClick
      }, [
        vue.createElementVNode("span", {
          class: vue.normalizeClass(vue.unref(ns).e("content"))
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 2),
        _ctx.closable ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).e("close")),
          onClick: vue.withModifiers(handleClose, ["stop"])
        }, {
          default: vue.withCtx(() => [
            vue.createVNode(vue.unref(iconsVue.Close))
          ]),
          _: 1
        }, 8, ["class", "onClick"])) : vue.createCommentVNode("v-if", true)
      ], 6)) : (vue.openBlock(), vue.createBlock(vue.Transition, {
        key: 1,
        name: `${vue.unref(ns).namespace.value}-zoom-in-center`,
        appear: ""
      }, {
        default: vue.withCtx(() => [
          vue.createElementVNode("span", {
            class: vue.normalizeClass(vue.unref(containerKls)),
            style: vue.normalizeStyle({ backgroundColor: _ctx.color }),
            onClick: handleClick
          }, [
            vue.createElementVNode("span", {
              class: vue.normalizeClass(vue.unref(ns).e("content"))
            }, [
              vue.renderSlot(_ctx.$slots, "default")
            ], 2),
            _ctx.closable ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
              key: 0,
              class: vue.normalizeClass(vue.unref(ns).e("close")),
              onClick: vue.withModifiers(handleClose, ["stop"])
            }, {
              default: vue.withCtx(() => [
                vue.createVNode(vue.unref(iconsVue.Close))
              ]),
              _: 1
            }, 8, ["class", "onClick"])) : vue.createCommentVNode("v-if", true)
          ], 6)
        ]),
        _: 3
      }, 8, ["name"]));
    };
  }
});
var Tag = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tag/src/tag.vue"]]);

exports["default"] = Tag;
//# sourceMappingURL=tag2.js.map
