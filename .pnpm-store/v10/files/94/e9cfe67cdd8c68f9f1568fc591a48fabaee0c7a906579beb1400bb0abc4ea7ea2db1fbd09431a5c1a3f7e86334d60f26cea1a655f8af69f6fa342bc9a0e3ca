import { defineComponent, computed, openBlock, createElementBlock, normalizeClass, unref, withDirectives, createElementVNode, isRef, withModifiers, vModelRadio, normalizeStyle, renderSlot, createTextVNode, toDisplayString } from 'vue';
import '../../../hooks/index.mjs';
import { useRadio } from './use-radio.mjs';
import { radioButtonProps } from './radio-button.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _hoisted_1 = ["value", "name", "disabled"];
const __default__ = defineComponent({
  name: "ElRadioButton"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: radioButtonProps,
  setup(__props) {
    const props = __props;
    const ns = useNamespace("radio");
    const { radioRef, focus, size, disabled, modelValue, radioGroup } = useRadio(props);
    const activeStyle = computed(() => {
      return {
        backgroundColor: (radioGroup == null ? void 0 : radioGroup.fill) || "",
        borderColor: (radioGroup == null ? void 0 : radioGroup.fill) || "",
        boxShadow: (radioGroup == null ? void 0 : radioGroup.fill) ? `-1px 0 0 0 ${radioGroup.fill}` : "",
        color: (radioGroup == null ? void 0 : radioGroup.textColor) || ""
      };
    });
    return (_ctx, _cache) => {
      var _a;
      return openBlock(), createElementBlock("label", {
        class: normalizeClass([
          unref(ns).b("button"),
          unref(ns).is("active", unref(modelValue) === _ctx.label),
          unref(ns).is("disabled", unref(disabled)),
          unref(ns).is("focus", unref(focus)),
          unref(ns).bm("button", unref(size))
        ])
      }, [
        withDirectives(createElementVNode("input", {
          ref_key: "radioRef",
          ref: radioRef,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(modelValue) ? modelValue.value = $event : null),
          class: normalizeClass(unref(ns).be("button", "original-radio")),
          value: _ctx.label,
          type: "radio",
          name: _ctx.name || ((_a = unref(radioGroup)) == null ? void 0 : _a.name),
          disabled: unref(disabled),
          onFocus: _cache[1] || (_cache[1] = ($event) => focus.value = true),
          onBlur: _cache[2] || (_cache[2] = ($event) => focus.value = false),
          onClick: _cache[3] || (_cache[3] = withModifiers(() => {
          }, ["stop"]))
        }, null, 42, _hoisted_1), [
          [vModelRadio, unref(modelValue)]
        ]),
        createElementVNode("span", {
          class: normalizeClass(unref(ns).be("button", "inner")),
          style: normalizeStyle(unref(modelValue) === _ctx.label ? unref(activeStyle) : {}),
          onKeydown: _cache[4] || (_cache[4] = withModifiers(() => {
          }, ["stop"]))
        }, [
          renderSlot(_ctx.$slots, "default", {}, () => [
            createTextVNode(toDisplayString(_ctx.label), 1)
          ])
        ], 38)
      ], 2);
    };
  }
});
var RadioButton = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/radio/src/radio-button.vue"]]);

export { RadioButton as default };
//# sourceMappingURL=radio-button2.mjs.map
