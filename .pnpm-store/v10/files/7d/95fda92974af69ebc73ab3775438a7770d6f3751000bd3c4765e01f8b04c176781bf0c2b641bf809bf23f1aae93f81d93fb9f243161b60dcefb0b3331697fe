'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var radio = require('./radio.js');
var useRadio = require('./use-radio.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["value", "name", "disabled"];
const __default__ = vue.defineComponent({
  name: "ElRadio"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: radio.radioProps,
  emits: radio.radioEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = index.useNamespace("radio");
    const { radioRef, radioGroup, focus, size, disabled, modelValue } = useRadio.useRadio(props, emit);
    function handleChange() {
      vue.nextTick(() => emit("change", modelValue.value));
    }
    return (_ctx, _cache) => {
      var _a;
      return vue.openBlock(), vue.createElementBlock("label", {
        class: vue.normalizeClass([
          vue.unref(ns).b(),
          vue.unref(ns).is("disabled", vue.unref(disabled)),
          vue.unref(ns).is("focus", vue.unref(focus)),
          vue.unref(ns).is("bordered", _ctx.border),
          vue.unref(ns).is("checked", vue.unref(modelValue) === _ctx.label),
          vue.unref(ns).m(vue.unref(size))
        ])
      }, [
        vue.createElementVNode("span", {
          class: vue.normalizeClass([
            vue.unref(ns).e("input"),
            vue.unref(ns).is("disabled", vue.unref(disabled)),
            vue.unref(ns).is("checked", vue.unref(modelValue) === _ctx.label)
          ])
        }, [
          vue.withDirectives(vue.createElementVNode("input", {
            ref_key: "radioRef",
            ref: radioRef,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => vue.isRef(modelValue) ? modelValue.value = $event : null),
            class: vue.normalizeClass(vue.unref(ns).e("original")),
            value: _ctx.label,
            name: _ctx.name || ((_a = vue.unref(radioGroup)) == null ? void 0 : _a.name),
            disabled: vue.unref(disabled),
            type: "radio",
            onFocus: _cache[1] || (_cache[1] = ($event) => focus.value = true),
            onBlur: _cache[2] || (_cache[2] = ($event) => focus.value = false),
            onChange: handleChange,
            onClick: _cache[3] || (_cache[3] = vue.withModifiers(() => {
            }, ["stop"]))
          }, null, 42, _hoisted_1), [
            [vue.vModelRadio, vue.unref(modelValue)]
          ]),
          vue.createElementVNode("span", {
            class: vue.normalizeClass(vue.unref(ns).e("inner"))
          }, null, 2)
        ], 2),
        vue.createElementVNode("span", {
          class: vue.normalizeClass(vue.unref(ns).e("label")),
          onKeydown: _cache[4] || (_cache[4] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.renderSlot(_ctx.$slots, "default", {}, () => [
            vue.createTextVNode(vue.toDisplayString(_ctx.label), 1)
          ])
        ], 34)
      ], 2);
    };
  }
});
var Radio = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/radio/src/radio.vue"]]);

exports["default"] = Radio;
//# sourceMappingURL=radio2.js.map
