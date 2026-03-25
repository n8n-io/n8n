'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var useRadio = require('./use-radio.js');
var radioButton = require('./radio-button.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["value", "name", "disabled"];
const __default__ = vue.defineComponent({
  name: "ElRadioButton"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: radioButton.radioButtonProps,
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("radio");
    const { radioRef, focus, size, disabled, modelValue, radioGroup } = useRadio.useRadio(props);
    const activeStyle = vue.computed(() => {
      return {
        backgroundColor: (radioGroup == null ? void 0 : radioGroup.fill) || "",
        borderColor: (radioGroup == null ? void 0 : radioGroup.fill) || "",
        boxShadow: (radioGroup == null ? void 0 : radioGroup.fill) ? `-1px 0 0 0 ${radioGroup.fill}` : "",
        color: (radioGroup == null ? void 0 : radioGroup.textColor) || ""
      };
    });
    return (_ctx, _cache) => {
      var _a;
      return vue.openBlock(), vue.createElementBlock("label", {
        class: vue.normalizeClass([
          vue.unref(ns).b("button"),
          vue.unref(ns).is("active", vue.unref(modelValue) === _ctx.label),
          vue.unref(ns).is("disabled", vue.unref(disabled)),
          vue.unref(ns).is("focus", vue.unref(focus)),
          vue.unref(ns).bm("button", vue.unref(size))
        ])
      }, [
        vue.withDirectives(vue.createElementVNode("input", {
          ref_key: "radioRef",
          ref: radioRef,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => vue.isRef(modelValue) ? modelValue.value = $event : null),
          class: vue.normalizeClass(vue.unref(ns).be("button", "original-radio")),
          value: _ctx.label,
          type: "radio",
          name: _ctx.name || ((_a = vue.unref(radioGroup)) == null ? void 0 : _a.name),
          disabled: vue.unref(disabled),
          onFocus: _cache[1] || (_cache[1] = ($event) => focus.value = true),
          onBlur: _cache[2] || (_cache[2] = ($event) => focus.value = false),
          onClick: _cache[3] || (_cache[3] = vue.withModifiers(() => {
          }, ["stop"]))
        }, null, 42, _hoisted_1), [
          [vue.vModelRadio, vue.unref(modelValue)]
        ]),
        vue.createElementVNode("span", {
          class: vue.normalizeClass(vue.unref(ns).be("button", "inner")),
          style: vue.normalizeStyle(vue.unref(modelValue) === _ctx.label ? vue.unref(activeStyle) : {}),
          onKeydown: _cache[4] || (_cache[4] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.renderSlot(_ctx.$slots, "default", {}, () => [
            vue.createTextVNode(vue.toDisplayString(_ctx.label), 1)
          ])
        ], 38)
      ], 2);
    };
  }
});
var RadioButton = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/radio/src/radio-button.vue"]]);

exports["default"] = RadioButton;
//# sourceMappingURL=radio-button2.js.map
