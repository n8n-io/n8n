'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var constants = require('./constants.js');
require('./composables/index.js');
var checkbox = require('./checkbox.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var useCheckbox = require('./composables/use-checkbox.js');
var index = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["name", "tabindex", "disabled", "true-value", "false-value"];
const _hoisted_2 = ["name", "tabindex", "disabled", "value"];
const __default__ = vue.defineComponent({
  name: "ElCheckboxButton"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: checkbox.checkboxProps,
  emits: checkbox.checkboxEmits,
  setup(__props) {
    const props = __props;
    const slots = vue.useSlots();
    const {
      isFocused,
      isChecked,
      isDisabled,
      checkboxButtonSize,
      model,
      handleChange
    } = useCheckbox.useCheckbox(props, slots);
    const checkboxGroup = vue.inject(constants.checkboxGroupContextKey, void 0);
    const ns = index.useNamespace("checkbox");
    const activeStyle = vue.computed(() => {
      var _a, _b, _c, _d;
      const fillValue = (_b = (_a = checkboxGroup == null ? void 0 : checkboxGroup.fill) == null ? void 0 : _a.value) != null ? _b : "";
      return {
        backgroundColor: fillValue,
        borderColor: fillValue,
        color: (_d = (_c = checkboxGroup == null ? void 0 : checkboxGroup.textColor) == null ? void 0 : _c.value) != null ? _d : "",
        boxShadow: fillValue ? `-1px 0 0 0 ${fillValue}` : void 0
      };
    });
    const labelKls = vue.computed(() => {
      return [
        ns.b("button"),
        ns.bm("button", checkboxButtonSize.value),
        ns.is("disabled", isDisabled.value),
        ns.is("checked", isChecked.value),
        ns.is("focus", isFocused.value)
      ];
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("label", {
        class: vue.normalizeClass(vue.unref(labelKls))
      }, [
        _ctx.trueLabel || _ctx.falseLabel ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("input", {
          key: 0,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => vue.isRef(model) ? model.value = $event : null),
          class: vue.normalizeClass(vue.unref(ns).be("button", "original")),
          type: "checkbox",
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
          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => vue.isRef(model) ? model.value = $event : null),
          class: vue.normalizeClass(vue.unref(ns).be("button", "original")),
          type: "checkbox",
          name: _ctx.name,
          tabindex: _ctx.tabindex,
          disabled: vue.unref(isDisabled),
          value: _ctx.label,
          onChange: _cache[6] || (_cache[6] = (...args) => vue.unref(handleChange) && vue.unref(handleChange)(...args)),
          onFocus: _cache[7] || (_cache[7] = ($event) => isFocused.value = true),
          onBlur: _cache[8] || (_cache[8] = ($event) => isFocused.value = false),
          onClick: _cache[9] || (_cache[9] = vue.withModifiers(() => {
          }, ["stop"]))
        }, null, 42, _hoisted_2)), [
          [vue.vModelCheckbox, vue.unref(model)]
        ]),
        _ctx.$slots.default || _ctx.label ? (vue.openBlock(), vue.createElementBlock("span", {
          key: 2,
          class: vue.normalizeClass(vue.unref(ns).be("button", "inner")),
          style: vue.normalizeStyle(vue.unref(isChecked) ? vue.unref(activeStyle) : void 0)
        }, [
          vue.renderSlot(_ctx.$slots, "default", {}, () => [
            vue.createTextVNode(vue.toDisplayString(_ctx.label), 1)
          ])
        ], 6)) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var CheckboxButton = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/checkbox/src/checkbox-button.vue"]]);

exports["default"] = CheckboxButton;
//# sourceMappingURL=checkbox-button.js.map
