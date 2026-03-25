import { defineComponent, ref, computed, openBlock, createBlock, unref, withCtx, normalizeClass, resolveDynamicComponent, createCommentVNode, createElementBlock, Fragment, renderList } from 'vue';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { ElSelect } from '../../select/index.mjs';
import '../../form/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../../hooks/index.mjs';
import { timeSelectProps } from './time-select.mjs';
import { parseTime, formatTime, compareTime, nextTime } from './utils.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useFormDisabled } from '../../form/src/hooks/use-form-common-props.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';

const __default__ = defineComponent({
  name: "ElTimeSelect"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: timeSelectProps,
  emits: ["change", "blur", "focus", "update:modelValue"],
  setup(__props, { expose }) {
    const props = __props;
    dayjs.extend(customParseFormat);
    const { Option: ElOption } = ElSelect;
    const nsInput = useNamespace("input");
    const select = ref();
    const _disabled = useFormDisabled();
    const { lang } = useLocale();
    const value = computed(() => props.modelValue);
    const start = computed(() => {
      const time = parseTime(props.start);
      return time ? formatTime(time) : null;
    });
    const end = computed(() => {
      const time = parseTime(props.end);
      return time ? formatTime(time) : null;
    });
    const step = computed(() => {
      const time = parseTime(props.step);
      return time ? formatTime(time) : null;
    });
    const minTime = computed(() => {
      const time = parseTime(props.minTime || "");
      return time ? formatTime(time) : null;
    });
    const maxTime = computed(() => {
      const time = parseTime(props.maxTime || "");
      return time ? formatTime(time) : null;
    });
    const items = computed(() => {
      const result = [];
      if (props.start && props.end && props.step) {
        let current = start.value;
        let currentTime;
        while (current && end.value && compareTime(current, end.value) <= 0) {
          currentTime = dayjs(current, "HH:mm").locale(lang.value).format(props.format);
          result.push({
            value: currentTime,
            disabled: compareTime(current, minTime.value || "-1:-1") <= 0 || compareTime(current, maxTime.value || "100:100") >= 0
          });
          current = nextTime(current, step.value);
        }
      }
      return result;
    });
    const blur = () => {
      var _a, _b;
      (_b = (_a = select.value) == null ? void 0 : _a.blur) == null ? void 0 : _b.call(_a);
    };
    const focus = () => {
      var _a, _b;
      (_b = (_a = select.value) == null ? void 0 : _a.focus) == null ? void 0 : _b.call(_a);
    };
    expose({
      blur,
      focus
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(ElSelect), {
        ref_key: "select",
        ref: select,
        "model-value": unref(value),
        disabled: unref(_disabled),
        clearable: _ctx.clearable,
        "clear-icon": _ctx.clearIcon,
        size: _ctx.size,
        effect: _ctx.effect,
        placeholder: _ctx.placeholder,
        "default-first-option": "",
        filterable: _ctx.editable,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = (event) => _ctx.$emit("update:modelValue", event)),
        onChange: _cache[1] || (_cache[1] = (event) => _ctx.$emit("change", event)),
        onBlur: _cache[2] || (_cache[2] = (event) => _ctx.$emit("blur", event)),
        onFocus: _cache[3] || (_cache[3] = (event) => _ctx.$emit("focus", event))
      }, {
        prefix: withCtx(() => [
          _ctx.prefixIcon ? (openBlock(), createBlock(unref(ElIcon), {
            key: 0,
            class: normalizeClass(unref(nsInput).e("prefix-icon"))
          }, {
            default: withCtx(() => [
              (openBlock(), createBlock(resolveDynamicComponent(_ctx.prefixIcon)))
            ]),
            _: 1
          }, 8, ["class"])) : createCommentVNode("v-if", true)
        ]),
        default: withCtx(() => [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(items), (item) => {
            return openBlock(), createBlock(unref(ElOption), {
              key: item.value,
              label: item.value,
              value: item.value,
              disabled: item.disabled
            }, null, 8, ["label", "value", "disabled"]);
          }), 128))
        ]),
        _: 1
      }, 8, ["model-value", "disabled", "clearable", "clear-icon", "size", "effect", "placeholder", "filterable"]);
    };
  }
});
var TimeSelect = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/time-select/src/time-select.vue"]]);

export { TimeSelect as default };
//# sourceMappingURL=time-select2.mjs.map
