import { defineComponent, inject, ref, computed, openBlock, createBlock, Transition, unref, withCtx, createElementBlock, normalizeClass, createElementVNode, createVNode, toDisplayString, createCommentVNode } from 'vue';
import dayjs from 'dayjs';
import '../../../../constants/index.mjs';
import '../../../../hooks/index.mjs';
import '../../../../utils/index.mjs';
import { panelTimePickerProps } from '../props/panel-time-picker.mjs';
import { useTimePanel } from '../composables/use-time-panel.mjs';
import { buildAvailableTimeSlotGetter, useOldValue } from '../composables/use-time-picker.mjs';
import TimeSpinner from './basic-time-spinner.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { useLocale } from '../../../../hooks/use-locale/index.mjs';
import { isUndefined } from '../../../../utils/types.mjs';
import { EVENT_CODE } from '../../../../constants/aria.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "panel-time-pick",
  props: panelTimePickerProps,
  emits: ["pick", "select-range", "set-picker-option"],
  setup(__props, { emit }) {
    const props = __props;
    const pickerBase = inject("EP_PICKER_BASE");
    const {
      arrowControl,
      disabledHours,
      disabledMinutes,
      disabledSeconds,
      defaultValue
    } = pickerBase.props;
    const { getAvailableHours, getAvailableMinutes, getAvailableSeconds } = buildAvailableTimeSlotGetter(disabledHours, disabledMinutes, disabledSeconds);
    const ns = useNamespace("time");
    const { t, lang } = useLocale();
    const selectionRange = ref([0, 2]);
    const oldValue = useOldValue(props);
    const transitionName = computed(() => {
      return isUndefined(props.actualVisible) ? `${ns.namespace.value}-zoom-in-top` : "";
    });
    const showSeconds = computed(() => {
      return props.format.includes("ss");
    });
    const amPmMode = computed(() => {
      if (props.format.includes("A"))
        return "A";
      if (props.format.includes("a"))
        return "a";
      return "";
    });
    const isValidValue = (_date) => {
      const parsedDate = dayjs(_date).locale(lang.value);
      const result = getRangeAvailableTime(parsedDate);
      return parsedDate.isSame(result);
    };
    const handleCancel = () => {
      emit("pick", oldValue.value, false);
    };
    const handleConfirm = (visible = false, first = false) => {
      if (first)
        return;
      emit("pick", props.parsedValue, visible);
    };
    const handleChange = (_date) => {
      if (!props.visible) {
        return;
      }
      const result = getRangeAvailableTime(_date).millisecond(0);
      emit("pick", result, true);
    };
    const setSelectionRange = (start, end) => {
      emit("select-range", start, end);
      selectionRange.value = [start, end];
    };
    const changeSelectionRange = (step) => {
      const list = [0, 3].concat(showSeconds.value ? [6] : []);
      const mapping = ["hours", "minutes"].concat(showSeconds.value ? ["seconds"] : []);
      const index = list.indexOf(selectionRange.value[0]);
      const next = (index + step + list.length) % list.length;
      timePickerOptions["start_emitSelectRange"](mapping[next]);
    };
    const handleKeydown = (event) => {
      const code = event.code;
      const { left, right, up, down } = EVENT_CODE;
      if ([left, right].includes(code)) {
        const step = code === left ? -1 : 1;
        changeSelectionRange(step);
        event.preventDefault();
        return;
      }
      if ([up, down].includes(code)) {
        const step = code === up ? -1 : 1;
        timePickerOptions["start_scrollDown"](step);
        event.preventDefault();
        return;
      }
    };
    const { timePickerOptions, onSetOption, getAvailableTime } = useTimePanel({
      getAvailableHours,
      getAvailableMinutes,
      getAvailableSeconds
    });
    const getRangeAvailableTime = (date) => {
      return getAvailableTime(date, props.datetimeRole || "", true);
    };
    const parseUserInput = (value) => {
      if (!value)
        return null;
      return dayjs(value, props.format).locale(lang.value);
    };
    const formatToString = (value) => {
      if (!value)
        return null;
      return value.format(props.format);
    };
    const getDefaultValue = () => {
      return dayjs(defaultValue).locale(lang.value);
    };
    emit("set-picker-option", ["isValidValue", isValidValue]);
    emit("set-picker-option", ["formatToString", formatToString]);
    emit("set-picker-option", ["parseUserInput", parseUserInput]);
    emit("set-picker-option", ["handleKeydownInput", handleKeydown]);
    emit("set-picker-option", ["getRangeAvailableTime", getRangeAvailableTime]);
    emit("set-picker-option", ["getDefaultValue", getDefaultValue]);
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Transition, { name: unref(transitionName) }, {
        default: withCtx(() => [
          _ctx.actualVisible || _ctx.visible ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(unref(ns).b("panel"))
          }, [
            createElementVNode("div", {
              class: normalizeClass([unref(ns).be("panel", "content"), { "has-seconds": unref(showSeconds) }])
            }, [
              createVNode(TimeSpinner, {
                ref: "spinner",
                role: _ctx.datetimeRole || "start",
                "arrow-control": unref(arrowControl),
                "show-seconds": unref(showSeconds),
                "am-pm-mode": unref(amPmMode),
                "spinner-date": _ctx.parsedValue,
                "disabled-hours": unref(disabledHours),
                "disabled-minutes": unref(disabledMinutes),
                "disabled-seconds": unref(disabledSeconds),
                onChange: handleChange,
                onSetOption: unref(onSetOption),
                onSelectRange: setSelectionRange
              }, null, 8, ["role", "arrow-control", "show-seconds", "am-pm-mode", "spinner-date", "disabled-hours", "disabled-minutes", "disabled-seconds", "onSetOption"])
            ], 2),
            createElementVNode("div", {
              class: normalizeClass(unref(ns).be("panel", "footer"))
            }, [
              createElementVNode("button", {
                type: "button",
                class: normalizeClass([unref(ns).be("panel", "btn"), "cancel"]),
                onClick: handleCancel
              }, toDisplayString(unref(t)("el.datepicker.cancel")), 3),
              createElementVNode("button", {
                type: "button",
                class: normalizeClass([unref(ns).be("panel", "btn"), "confirm"]),
                onClick: _cache[0] || (_cache[0] = ($event) => handleConfirm())
              }, toDisplayString(unref(t)("el.datepicker.confirm")), 3)
            ], 2)
          ], 2)) : createCommentVNode("v-if", true)
        ]),
        _: 1
      }, 8, ["name"]);
    };
  }
});
var TimePickPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/time-picker/src/time-picker-com/panel-time-pick.vue"]]);

export { TimePickPanel as default };
//# sourceMappingURL=panel-time-pick.mjs.map
