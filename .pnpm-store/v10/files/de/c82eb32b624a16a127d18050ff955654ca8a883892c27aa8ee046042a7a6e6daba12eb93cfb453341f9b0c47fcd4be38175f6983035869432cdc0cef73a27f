'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
require('../../../hooks/index.js');
var useButton = require('./use-button.js');
var button = require('./button.js');
var buttonCustom = require('./button-custom.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElButton"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: button.buttonProps,
  emits: button.buttonEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const buttonStyle = buttonCustom.useButtonCustomStyle(props);
    const ns = index.useNamespace("button");
    const { _ref, _size, _type, _disabled, _props, shouldAddSpace, handleClick } = useButton.useButton(props, emit);
    expose({
      ref: _ref,
      size: _size,
      type: _type,
      disabled: _disabled,
      shouldAddSpace
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.tag), vue.mergeProps({
        ref_key: "_ref",
        ref: _ref
      }, vue.unref(_props), {
        class: [
          vue.unref(ns).b(),
          vue.unref(ns).m(vue.unref(_type)),
          vue.unref(ns).m(vue.unref(_size)),
          vue.unref(ns).is("disabled", vue.unref(_disabled)),
          vue.unref(ns).is("loading", _ctx.loading),
          vue.unref(ns).is("plain", _ctx.plain),
          vue.unref(ns).is("round", _ctx.round),
          vue.unref(ns).is("circle", _ctx.circle),
          vue.unref(ns).is("text", _ctx.text),
          vue.unref(ns).is("link", _ctx.link),
          vue.unref(ns).is("has-bg", _ctx.bg)
        ],
        style: vue.unref(buttonStyle),
        onClick: vue.unref(handleClick)
      }), {
        default: vue.withCtx(() => [
          _ctx.loading ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
            _ctx.$slots.loading ? vue.renderSlot(_ctx.$slots, "loading", { key: 0 }) : (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
              key: 1,
              class: vue.normalizeClass(vue.unref(ns).is("loading"))
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.loadingIcon)))
              ]),
              _: 1
            }, 8, ["class"]))
          ], 64)) : _ctx.icon || _ctx.$slots.icon ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), { key: 1 }, {
            default: vue.withCtx(() => [
              _ctx.icon ? (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon), { key: 0 })) : vue.renderSlot(_ctx.$slots, "icon", { key: 1 })
            ]),
            _: 3
          })) : vue.createCommentVNode("v-if", true),
          _ctx.$slots.default ? (vue.openBlock(), vue.createElementBlock("span", {
            key: 2,
            class: vue.normalizeClass({ [vue.unref(ns).em("text", "expand")]: vue.unref(shouldAddSpace) })
          }, [
            vue.renderSlot(_ctx.$slots, "default")
          ], 2)) : vue.createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 16, ["class", "style", "onClick"]);
    };
  }
});
var Button = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/button/src/button.vue"]]);

exports["default"] = Button;
//# sourceMappingURL=button2.js.map
