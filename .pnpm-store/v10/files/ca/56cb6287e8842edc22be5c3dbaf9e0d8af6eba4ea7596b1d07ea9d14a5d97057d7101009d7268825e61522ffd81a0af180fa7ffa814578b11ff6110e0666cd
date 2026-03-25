import { defineComponent, inject, computed, ref, unref, openBlock, createElementBlock, normalizeClass, createElementVNode, toDisplayString, createVNode, createCommentVNode } from 'vue';
import dayjs from 'dayjs';
import { union } from 'lodash-unified';
import '../../../../hooks/index.mjs';
import '../../../../utils/index.mjs';
import '../../../../constants/index.mjs';
import { panelTimeRangeProps } from '../props/panel-time-range.mjs';
import { useTimePanel } from '../composables/use-time-panel.mjs';
import { useOldValue, buildAvailableTimeSlotGetter } from '../composables/use-time-picker.mjs';
import TimeSpinner from './basic-time-spinner.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { EVENT_CODE } from '../../../../constants/aria.mjs';
import { isArray } from '@vue/shared';

const _hoisted_1 = ["disabled"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "panel-time-range",
  props: panelTimeRangeProps,
  emits: ["pick", "select-range", "set-picker-option"],
  setup(__props, { emit }) {
    const props = __props;
    const makeSelectRange = (start, end) => {
      const result = [];
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
      return result;
    };
    const { t, lang } = useLocale();
    const nsTime = useNamespace("time");
    const nsPicker = useNamespace("picker");
    const pickerBase = inject("EP_PICKER_BASE");
    const {
      arrowControl,
      disabledHours,
      disabledMinutes,
      disabledSeconds,
      defaultValue
    } = pickerBase.props;
    const startContainerKls = computed(() => [
      nsTime.be("range-picker", "body"),
      nsTime.be("panel", "content"),
      nsTime.is("arrow", arrowControl),
      showSeconds.value ? "has-seconds" : ""
    ]);
    const endContainerKls = computed(() => [
      nsTime.be("range-picker", "body"),
      nsTime.be("panel", "content"),
      nsTime.is("arrow", arrowControl),
      showSeconds.value ? "has-seconds" : ""
    ]);
    const startTime = computed(() => props.parsedValue[0]);
    const endTime = computed(() => props.parsedValue[1]);
    const oldValue = useOldValue(props);
    const handleCancel = () => {
      emit("pick", oldValue.value, false);
    };
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
    const handleConfirm = (visible = false) => {
      emit("pick", [startTime.value, endTime.value], visible);
    };
    const handleMinChange = (date) => {
      handleChange(date.millisecond(0), endTime.value);
    };
    const handleMaxChange = (date) => {
      handleChange(startTime.value, date.millisecond(0));
    };
    const isValidValue = (_date) => {
      const parsedDate = _date.map((_) => dayjs(_).locale(lang.value));
      const result = getRangeAvailableTime(parsedDate);
      return parsedDate[0].isSame(result[0]) && parsedDate[1].isSame(result[1]);
    };
    const handleChange = (start, end) => {
      emit("pick", [start, end], true);
    };
    const btnConfirmDisabled = computed(() => {
      return startTime.value > endTime.value;
    });
    const selectionRange = ref([0, 2]);
    const setMinSelectionRange = (start, end) => {
      emit("select-range", start, end, "min");
      selectionRange.value = [start, end];
    };
    const offset = computed(() => showSeconds.value ? 11 : 8);
    const setMaxSelectionRange = (start, end) => {
      emit("select-range", start, end, "max");
      const _offset = unref(offset);
      selectionRange.value = [start + _offset, end + _offset];
    };
    const changeSelectionRange = (step) => {
      const list = showSeconds.value ? [0, 3, 6, 11, 14, 17] : [0, 3, 8, 11];
      const mapping = ["hours", "minutes"].concat(showSeconds.value ? ["seconds"] : []);
      const index = list.indexOf(selectionRange.value[0]);
      const next = (index + step + list.length) % list.length;
      const half = list.length / 2;
      if (next < half) {
        timePickerOptions["start_emitSelectRange"](mapping[next]);
      } else {
        timePickerOptions["end_emitSelectRange"](mapping[next - half]);
      }
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
        const role = selectionRange.value[0] < offset.value ? "start" : "end";
        timePickerOptions[`${role}_scrollDown`](step);
        event.preventDefault();
        return;
      }
    };
    const disabledHours_ = (role, compare) => {
      const defaultDisable = disabledHours ? disabledHours(role) : [];
      const isStart = role === "start";
      const compareDate = compare || (isStart ? endTime.value : startTime.value);
      const compareHour = compareDate.hour();
      const nextDisable = isStart ? makeSelectRange(compareHour + 1, 23) : makeSelectRange(0, compareHour - 1);
      return union(defaultDisable, nextDisable);
    };
    const disabledMinutes_ = (hour, role, compare) => {
      const defaultDisable = disabledMinutes ? disabledMinutes(hour, role) : [];
      const isStart = role === "start";
      const compareDate = compare || (isStart ? endTime.value : startTime.value);
      const compareHour = compareDate.hour();
      if (hour !== compareHour) {
        return defaultDisable;
      }
      const compareMinute = compareDate.minute();
      const nextDisable = isStart ? makeSelectRange(compareMinute + 1, 59) : makeSelectRange(0, compareMinute - 1);
      return union(defaultDisable, nextDisable);
    };
    const disabledSeconds_ = (hour, minute, role, compare) => {
      const defaultDisable = disabledSeconds ? disabledSeconds(hour, minute, role) : [];
      const isStart = role === "start";
      const compareDate = compare || (isStart ? endTime.value : startTime.value);
      const compareHour = compareDate.hour();
      const compareMinute = compareDate.minute();
      if (hour !== compareHour || minute !== compareMinute) {
        return defaultDisable;
      }
      const compareSecond = compareDate.second();
      const nextDisable = isStart ? makeSelectRange(compareSecond + 1, 59) : makeSelectRange(0, compareSecond - 1);
      return union(defaultDisable, nextDisable);
    };
    const getRangeAvailableTime = ([start, end]) => {
      return [
        getAvailableTime(start, "start", true, end),
        getAvailableTime(end, "end", false, start)
      ];
    };
    const { getAvailableHours, getAvailableMinutes, getAvailableSeconds } = buildAvailableTimeSlotGetter(disabledHours_, disabledMinutes_, disabledSeconds_);
    const {
      timePickerOptions,
      getAvailableTime,
      onSetOption
    } = useTimePanel({
      getAvailableHours,
      getAvailableMinutes,
      getAvailableSeconds
    });
    const parseUserInput = (days) => {
      if (!days)
        return null;
      if (isArray(days)) {
        return days.map((d) => dayjs(d, props.format).locale(lang.value));
      }
      return dayjs(days, props.format).locale(lang.value);
    };
    const formatToString = (days) => {
      if (!days)
        return null;
      if (isArray(days)) {
        return days.map((d) => d.format(props.format));
      }
      return days.format(props.format);
    };
    const getDefaultValue = () => {
      if (isArray(defaultValue)) {
        return defaultValue.map((d) => dayjs(d).locale(lang.value));
      }
      const defaultDay = dayjs(defaultValue).locale(lang.value);
      return [defaultDay, defaultDay.add(60, "m")];
    };
    emit("set-picker-option", ["formatToString", formatToString]);
    emit("set-picker-option", ["parseUserInput", parseUserInput]);
    emit("set-picker-option", ["isValidValue", isValidValue]);
    emit("set-picker-option", ["handleKeydownInput", handleKeydown]);
    emit("set-picker-option", ["getDefaultValue", getDefaultValue]);
    emit("set-picker-option", ["getRangeAvailableTime", getRangeAvailableTime]);
    return (_ctx, _cache) => {
      return _ctx.actualVisible ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: normalizeClass([unref(nsTime).b("range-picker"), unref(nsPicker).b("panel")])
      }, [
        createElementVNode("div", {
          class: normalizeClass(unref(nsTime).be("range-picker", "content"))
        }, [
          createElementVNode("div", {
            class: normalizeClass(unref(nsTime).be("range-picker", "cell"))
          }, [
            createElementVNode("div", {
              class: normalizeClass(unref(nsTime).be("range-picker", "header"))
            }, toDisplayString(unref(t)("el.datepicker.startTime")), 3),
            createElementVNode("div", {
              class: normalizeClass(unref(startContainerKls))
            }, [
              createVNode(TimeSpinner, {
                ref: "minSpinner",
                role: "start",
                "show-seconds": unref(showSeconds),
                "am-pm-mode": unref(amPmMode),
                "arrow-control": unref(arrowControl),
                "spinner-date": unref(startTime),
                "disabled-hours": disabledHours_,
                "disabled-minutes": disabledMinutes_,
                "disabled-seconds": disabledSeconds_,
                onChange: handleMinChange,
                onSetOption: unref(onSetOption),
                onSelectRange: setMinSelectionRange
              }, null, 8, ["show-seconds", "am-pm-mode", "arrow-control", "spinner-date", "onSetOption"])
            ], 2)
          ], 2),
          createElementVNode("div", {
            class: normalizeClass(unref(nsTime).be("range-picker", "cell"))
          }, [
            createElementVNode("div", {
              class: normalizeClass(unref(nsTime).be("range-picker", "header"))
            }, toDisplayString(unref(t)("el.datepicker.endTime")), 3),
            createElementVNode("div", {
              class: normalizeClass(unref(endContainerKls))
            }, [
              createVNode(TimeSpinner, {
                ref: "maxSpinner",
                role: "end",
                "show-seconds": unref(showSeconds),
                "am-pm-mode": unref(amPmMode),
                "arrow-control": unref(arrowControl),
                "spinner-date": unref(endTime),
                "disabled-hours": disabledHours_,
                "disabled-minutes": disabledMinutes_,
                "disabled-seconds": disabledSeconds_,
                onChange: handleMaxChange,
                onSetOption: unref(onSetOption),
                onSelectRange: setMaxSelectionRange
              }, null, 8, ["show-seconds", "am-pm-mode", "arrow-control", "spinner-date", "onSetOption"])
            ], 2)
          ], 2)
        ], 2),
        createElementVNode("div", {
          class: normalizeClass(unref(nsTime).be("panel", "footer"))
        }, [
          createElementVNode("button", {
            type: "button",
            class: normalizeClass([unref(nsTime).be("panel", "btn"), "cancel"]),
            onClick: _cache[0] || (_cache[0] = ($event) => handleCancel())
          }, toDisplayString(unref(t)("el.datepicker.cancel")), 3),
          createElementVNode("button", {
            type: "button",
            class: normalizeClass([unref(nsTime).be("panel", "btn"), "confirm"]),
            disabled: unref(btnConfirmDisabled),
            onClick: _cache[1] || (_cache[1] = ($event) => handleConfirm())
          }, toDisplayString(unref(t)("el.datepicker.confirm")), 11, _hoisted_1)
        ], 2)
      ], 2)) : createCommentVNode("v-if", true);
    };
  }
});
var TimeRangePanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/time-picker/src/time-picker-com/panel-time-range.vue"]]);

export { TimeRangePanel as default };
//# sourceMappingURL=panel-time-range.mjs.map
