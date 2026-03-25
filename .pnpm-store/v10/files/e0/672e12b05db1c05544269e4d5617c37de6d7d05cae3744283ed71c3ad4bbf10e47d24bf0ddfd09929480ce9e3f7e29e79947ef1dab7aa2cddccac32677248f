'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var checkbox = require('./checkbox.js');
require('./composables/index.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var useCheckbox = require('./composables/use-checkbox.js');
var index = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["id", "indeterminate", "name", "tabindex", "disabled", "true-value", "false-value"];
const _hoisted_2 = ["id", "indeterminate", "disabled", "value", "name", "tabindex"];
const __default__ = vue.defineComponent({
  name: "ElCheckbox"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: checkbox.checkboxProps,
  emits: checkbox.checkboxEmits,
  setup(__props) {
    const props = __props;
    const slots = vue.useSlots();
    const {
      inputId,
      isLabeledByFormItem,
      isChecked,
      isDisabled,
      isFocused,
      checkboxSize,
      hasOwnLabel,
      model,
      handleChange,
      onClickRoot
    } = useCheckbox.useCheckbox(props, slots);
    const ns = index.useNamespace("checkbox");
    const compKls = vue.computed(() => {
      return [
        ns.b(),
        ns.m(checkboxSize.value),
        ns.is("disabled", isDisabled.value),
        ns.is("bordered", props.border),
        ns.is("checked", isChecked.value)
      ];
    });
    const spanKls = vue.computed(() => {
      return [
        ns.e("input"),
        ns.is("disabled", isDisabled.value),
        ns.is("checked", isChecked.value),
        ns.is("indeterminate", props.indeterminate),
        ns.is("focus", isFocused.value)
      ];
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(!vue.unref(hasOwnLabel) && vue.unref(isLabeledByFormItem) ? "span" : "label"), {
        class: vue.normalizeClass(vue.unref(compKls)),
        "aria-controls": _ctx.indeterminate ? _ctx.controls : null,
        onClick: vue.unref(onClickRoot)
      }, {
        default: vue.withCtx(() => [
          vue.createElementVNode("span", {
            class: vue.normalizeClass(vue.unref(spanKls))
          }, [
            _ctx.trueLabel || _ctx.falseLabel ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("input", {
              key: 0,
              id: vue.unref(inputId),
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => vue.isRef(model) ? model.value = $event : null),
              class: vue.normalizeClass(vue.unref(ns).e("original")),
              type: "checkbox",
              indeterminate: _ctx.indeterminate,
              name: _ctx.name,
              tabindex: _ctx.tabindex,
              disabled: vue.unref(isDisabled),
              "true-value": _ctx.trueLabel,
              "false-value": _ctx.falseLabel,
              onChange: _cache[1] || (_cache[1] = (...args) => vue.unref(handleChange) && vue.unref(handleChange)(...args)),
              onFocus: _cache[2] || (_cache[2] = ($event) => isFocused.value = true),
              onBlur: _cache[3] || (_cache[3] = ($event) => isFocused.value = false),
              onClick: _cache[4] || (_cache[4] = vue.withModifiers(() => {
              }, ["stop"]))
            }, null, 42, _hoisted_1)), [
              [vue.vModelCheckbox, vue.unref(model)]
            ]) : vue.withDirectives((vue.openBlock(), vue.createElementBlock("input", {
              key: 1,
              id: vue.unref(inputId),
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => vue.isRef(model) ? model.value = $event : null),
              class: vue.normalizeClass(vue.unref(ns).e("original")),
              type: "checkbox",
              indeterminate: _ctx.indeterminate,
              disabled: vue.unref(isDisabled),
              value: _ctx.label,
              name: _ctx.name,
              tabindex: _ctx.tabindex,
              onChange: _cache[6] || (_cache[6] = (...args) => vue.unref(handleChange) && vue.unref(handleChange)(...args)),
              onFocus: _cache[7] || (_cache[7] = ($event) => isFocused.value = true),
              onBlur: _cache[8] || (_cache[8] = ($event) => isFocused.value = false),
              onClick: _cache[9] || (_cache[9] = vue.withModifiers(() => {
              }, ["stop"]))
            }, null, 42, _hoisted_2)), [
              [vue.vModelCheckbox, vue.unref(model)]
            ]),
            vue.createElementVNode("span", {
              class: vue.normalizeClass(vue.unref(ns).e("inner"))
            }, null, 2)
          ], 2),
          vue.unref(hasOwnLabel) ? (vue.openBlock(), vue.createElementBlock("span", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).e("label"))
          }, [
            vue.renderSlot(_ctx.$slots, "default"),
            !_ctx.$slots.default ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
              vue.createTextVNode(vue.toDisplayString(_ctx.label), 1)
            ], 64)) : vue.createCommentVNode("v-if", true)
          ], 2)) : vue.createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 8, ["class", "aria-controls", "onClick"]);
    };
  }
});
var Checkbox = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/checkbox/src/checkbox.vue"]]);

exports["default"] = Checkbox;
//# sourceMappingURL=checkbox2.js.map
