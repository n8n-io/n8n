import { defineComponent, nextTick, openBlock, createElementBlock, normalizeClass, unref, createElementVNode, withDirectives, isRef, withModifiers, vModelRadio, renderSlot, createTextVNode, toDisplayString } from 'vue';
import '../../../hooks/index.mjs';
import { radioProps, radioEmits } from './radio.mjs';
import { useRadio } from './use-radio.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _hoisted_1 = ["value", "name", "disabled"];
const __default__ = defineComponent({
  name: "ElRadio"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: radioProps,
  emits: radioEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = useNamespace("radio");
    const { radioRef, radioGroup, focus, size, disabled, modelValue } = useRadio(props, emit);
    function handleChange() {
      nextTick(() => emit("change", modelValue.value));
    }
    return (_ctx, _cache) => {
      var _a;
      return openBlock(), createElementBlock("label", {
        class: normalizeClass([
          unref(ns).b(),
          unref(ns).is("disabled", unref(disabled)),
          unref(ns).is("focus", unref(focus)),
          unref(ns).is("bordered", _ctx.border),
          unref(ns).is("checked", unref(modelValue) === _ctx.label),
          unref(ns).m(unref(size))
        ])
      }, [
        createElementVNode("span", {
          class: normalizeClass([
            unref(ns).e("input"),
            unref(ns).is("disabled", unref(disabled)),
            unref(ns).is("checked", unref(modelValue) === _ctx.label)
          ])
        }, [
          withDirectives(createElementVNode("input", {
            ref_key: "radioRef",
            ref: radioRef,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(modelValue) ? modelValue.value = $event : null),
            class: normalizeClass(unref(ns).e("original")),
            value: _ctx.label,
            name: _ctx.name || ((_a = unref(radioGroup)) == null ? void 0 : _a.name),
            disabled: unref(disabled),
            type: "radio",
            onFocus: _cache[1] || (_cache[1] = ($event) => focus.value = true),
            onBlur: _cache[2] || (_cache[2] = ($event) => focus.value = false),
            onChange: handleChange,
            onClick: _cache[3] || (_cache[3] = withModifiers(() => {
            }, ["stop"]))
          }, null, 42, _hoisted_1), [
            [vModelRadio, unref(modelValue)]
          ]),
          createElementVNode("span", {
            class: normalizeClass(unref(ns).e("inner"))
          }, null, 2)
        ], 2),
        createElementVNode("span", {
          class: normalizeClass(unref(ns).e("label")),
          onKeydown: _cache[4] || (_cache[4] = withModifiers(() => {
          }, ["stop"]))
        }, [
          renderSlot(_ctx.$slots, "default", {}, () => [
            createTextVNode(toDisplayString(_ctx.label), 1)
          ])
        ], 34)
      ], 2);
    };
  }
});
var Radio = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/radio/src/radio.vue"]]);

export { Radio as default };
//# sourceMappingURL=radio2.mjs.map
