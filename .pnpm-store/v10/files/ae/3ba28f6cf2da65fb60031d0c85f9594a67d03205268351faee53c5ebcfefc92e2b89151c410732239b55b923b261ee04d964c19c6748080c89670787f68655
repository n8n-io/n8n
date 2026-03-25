import { defineComponent, useSlots, computed, openBlock, createBlock, resolveDynamicComponent, unref, normalizeClass, withCtx, createElementVNode, withDirectives, createElementBlock, isRef, withModifiers, vModelCheckbox, renderSlot, Fragment, createTextVNode, toDisplayString, createCommentVNode } from 'vue';
import '../../../hooks/index.mjs';
import { checkboxProps, checkboxEmits } from './checkbox.mjs';
import './composables/index.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useCheckbox } from './composables/use-checkbox.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _hoisted_1 = ["id", "indeterminate", "name", "tabindex", "disabled", "true-value", "false-value"];
const _hoisted_2 = ["id", "indeterminate", "disabled", "value", "name", "tabindex"];
const __default__ = defineComponent({
  name: "ElCheckbox"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: checkboxProps,
  emits: checkboxEmits,
  setup(__props) {
    const props = __props;
    const slots = useSlots();
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
    } = useCheckbox(props, slots);
    const ns = useNamespace("checkbox");
    const compKls = computed(() => {
      return [
        ns.b(),
        ns.m(checkboxSize.value),
        ns.is("disabled", isDisabled.value),
        ns.is("bordered", props.border),
        ns.is("checked", isChecked.value)
      ];
    });
    const spanKls = computed(() => {
      return [
        ns.e("input"),
        ns.is("disabled", isDisabled.value),
        ns.is("checked", isChecked.value),
        ns.is("indeterminate", props.indeterminate),
        ns.is("focus", isFocused.value)
      ];
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(!unref(hasOwnLabel) && unref(isLabeledByFormItem) ? "span" : "label"), {
        class: normalizeClass(unref(compKls)),
        "aria-controls": _ctx.indeterminate ? _ctx.controls : null,
        onClick: unref(onClickRoot)
      }, {
        default: withCtx(() => [
          createElementVNode("span", {
            class: normalizeClass(unref(spanKls))
          }, [
            _ctx.trueLabel || _ctx.falseLabel ? withDirectives((openBlock(), createElementBlock("input", {
              key: 0,
              id: unref(inputId),
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(model) ? model.value = $event : null),
              class: normalizeClass(unref(ns).e("original")),
              type: "checkbox",
              indeterminate: _ctx.indeterminate,
              name: _ctx.name,
              tabindex: _ctx.tabindex,
              disabled: unref(isDisabled),
              "true-value": _ctx.trueLabel,
              "false-value": _ctx.falseLabel,
              onChange: _cache[1] || (_cache[1] = (...args) => unref(handleChange) && unref(handleChange)(...args)),
              onFocus: _cache[2] || (_cache[2] = ($event) => isFocused.value = true),
              onBlur: _cache[3] || (_cache[3] = ($event) => isFocused.value = false),
              onClick: _cache[4] || (_cache[4] = withModifiers(() => {
              }, ["stop"]))
            }, null, 42, _hoisted_1)), [
              [vModelCheckbox, unref(model)]
            ]) : withDirectives((openBlock(), createElementBlock("input", {
              key: 1,
              id: unref(inputId),
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(model) ? model.value = $event : null),
              class: normalizeClass(unref(ns).e("original")),
              type: "checkbox",
              indeterminate: _ctx.indeterminate,
              disabled: unref(isDisabled),
              value: _ctx.label,
              name: _ctx.name,
              tabindex: _ctx.tabindex,
              onChange: _cache[6] || (_cache[6] = (...args) => unref(handleChange) && unref(handleChange)(...args)),
              onFocus: _cache[7] || (_cache[7] = ($event) => isFocused.value = true),
              onBlur: _cache[8] || (_cache[8] = ($event) => isFocused.value = false),
              onClick: _cache[9] || (_cache[9] = withModifiers(() => {
              }, ["stop"]))
            }, null, 42, _hoisted_2)), [
              [vModelCheckbox, unref(model)]
            ]),
            createElementVNode("span", {
              class: normalizeClass(unref(ns).e("inner"))
            }, null, 2)
          ], 2),
          unref(hasOwnLabel) ? (openBlock(), createElementBlock("span", {
            key: 0,
            class: normalizeClass(unref(ns).e("label"))
          }, [
            renderSlot(_ctx.$slots, "default"),
            !_ctx.$slots.default ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createTextVNode(toDisplayString(_ctx.label), 1)
            ], 64)) : createCommentVNode("v-if", true)
          ], 2)) : createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 8, ["class", "aria-controls", "onClick"]);
    };
  }
});
var Checkbox = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/checkbox/src/checkbox.vue"]]);

export { Checkbox as default };
//# sourceMappingURL=checkbox2.mjs.map
