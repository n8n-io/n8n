'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
var lodashUnified = require('lodash-unified');
require('../../../../hooks/index.js');
require('../../../../utils/index.js');
require('../../../../constants/index.js');
var panelTimeRange = require('../props/panel-time-range.js');
var useTimePanel = require('../composables/use-time-panel.js');
var useTimePicker = require('../composables/use-time-picker.js');
var basicTimeSpinner = require('./basic-time-spinner.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-locale/index.js');
var index$1 = require('../../../../hooks/use-namespace/index.js');
var aria = require('../../../../constants/aria.js');
var shared = require('@vue/shared');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const _hoisted_1 = ["disabled"];
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "panel-time-range",
  props: panelTimeRange.panelTimeRangeProps,
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
    const { t, lang } = index.useLocale();
    const nsTime = index$1.useNamespace("time");
    const nsPicker = index$1.useNamespace("picker");
    const pickerBase = vue.inject("EP_PICKER_BASE");
    const {
      arrowControl,
      disabledHours,
      disabledMinutes,
      disabledSeconds,
      defaultValue
    } = pickerBase.props;
    const startContainerKls = vue.computed(() => [
      nsTime.be("range-picker", "body"),
      nsTime.be("panel", "content"),
      nsTime.is("arrow", arrowControl),
      showSeconds.value ? "has-seconds" : ""
    ]);
    const endContainerKls = vue.computed(() => [
      nsTime.be("range-picker", "body"),
      nsTime.be("panel", "content"),
      nsTime.is("arrow", arrowControl),
      showSeconds.value ? "has-seconds" : ""
    ]);
    const startTime = vue.computed(() => props.parsedValue[0]);
    const endTime = vue.computed(() => props.parsedValue[1]);
    const oldValue = useTimePicker.useOldValue(props);
    const handleCancel = () => {
      emit("pick", oldValue.value, false);
    };
    const showSeconds = vue.computed(() => {
      return props.format.includes("ss");
    });
    const amPmMode = vue.computed(() => {
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
      const parsedDate = _date.map((_) => dayjs__default["default"](_).locale(lang.value));
      const result = getRangeAvailableTime(parsedDate);
      return parsedDate[0].isSame(result[0]) && parsedDate[1].isSame(result[1]);
    };
    const handleChange = (start, end) => {
      emit("pick", [start, end], true);
    };
    const btnConfirmDisabled = vue.computed(() => {
      return startTime.value > endTime.value;
    });
    const selectionRange = vue.ref([0, 2]);
    const setMinSelectionRange = (start, end) => {
      emit("select-range", start, end, "min");
      selectionRange.value = [start, end];
    };
    const offset = vue.computed(() => showSeconds.value ? 11 : 8);
    const setMaxSelectionRange = (start, end) => {
      emit("select-range", start, end, "max");
      const _offset = vue.unref(offset);
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
      const { left, right, up, down } = aria.EVENT_CODE;
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
      return lodashUnified.union(defaultDisable, nextDisable);
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
      return lodashUnified.union(defaultDisable, nextDisable);
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
      return lodashUnified.union(defaultDisable, nextDisable);
    };
    const getRangeAvailableTime = ([start, end]) => {
      return [
        getAvailableTime(start, "start", true, end),
        getAvailableTime(end, "end", false, start)
      ];
    };
    const { getAvailableHours, getAvailableMinutes, getAvailableSeconds } = useTimePicker.buildAvailableTimeSlotGetter(disabledHours_, disabledMinutes_, disabledSeconds_);
    const {
      timePickerOptions,
      getAvailableTime,
      onSetOption
    } = useTimePanel.useTimePanel({
      getAvailableHours,
      getAvailableMinutes,
      getAvailableSeconds
    });
    const parseUserInput = (days) => {
      if (!days)
        return null;
      if (shared.isArray(days)) {
        return days.map((d) => dayjs__default["default"](d, props.format).locale(lang.value));
      }
      return dayjs__default["default"](days, props.format).locale(lang.value);
    };
    const formatToString = (days) => {
      if (!days)
        return null;
      if (shared.isArray(days)) {
        return days.map((d) => d.format(props.format));
      }
      return days.format(props.format);
    };
    const getDefaultValue = () => {
      if (shared.isArray(defaultValue)) {
        return defaultValue.map((d) => dayjs__default["default"](d).locale(lang.value));
      }
      const defaultDay = dayjs__default["default"](defaultValue).locale(lang.value);
      return [defaultDay, defaultDay.add(60, "m")];
    };
    emit("set-picker-option", ["formatToString", formatToString]);
    emit("set-picker-option", ["parseUserInput", parseUserInput]);
    emit("set-picker-option", ["isValidValue", isValidValue]);
    emit("set-picker-option", ["handleKeydownInput", handleKeydown]);
    emit("set-picker-option", ["getDefaultValue", getDefaultValue]);
    emit("set-picker-option", ["getRangeAvailableTime", getRangeAvailableTime]);
    return (_ctx, _cache) => {
      return _ctx.actualVisible ? (vue.openBlock(), vue.createElementBlock("div", {
        key: 0,
        class: vue.normalizeClass([vue.unref(nsTime).b("range-picker"), vue.unref(nsPicker).b("panel")])
      }, [
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(nsTime).be("range-picker", "content"))
        }, [
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(nsTime).be("range-picker", "cell"))
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(nsTime).be("range-picker", "header"))
            }, vue.toDisplayString(vue.unref(t)("el.datepicker.startTime")), 3),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(startContainerKls))
            }, [
              vue.createVNode(basicTimeSpinner["default"], {
                ref: "minSpinner",
                role: "start",
                "show-seconds": vue.unref(showSeconds),
                "am-pm-mode": vue.unref(amPmMode),
                "arrow-control": vue.unref(arrowControl),
                "spinner-date": vue.unref(startTime),
                "disabled-hours": disabledHours_,
                "disabled-minutes": disabledMinutes_,
                "disabled-seconds": disabledSeconds_,
                onChange: handleMinChange,
                onSetOption: vue.unref(onSetOption),
                onSelectRange: setMinSelectionRange
              }, null, 8, ["show-seconds", "am-pm-mode", "arrow-control", "spinner-date", "onSetOption"])
            ], 2)
          ], 2),
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(nsTime).be("range-picker", "cell"))
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(nsTime).be("range-picker", "header"))
            }, vue.toDisplayString(vue.unref(t)("el.datepicker.endTime")), 3),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(endContainerKls))
            }, [
              vue.createVNode(basicTimeSpinner["default"], {
                ref: "maxSpinner",
                role: "end",
                "show-seconds": vue.unref(showSeconds),
                "am-pm-mode": vue.unref(amPmMode),
                "arrow-control": vue.unref(arrowControl),
                "spinner-date": vue.unref(endTime),
                "disabled-hours": disabledHours_,
                "disabled-minutes": disabledMinutes_,
                "disabled-seconds": disabledSeconds_,
                onChange: handleMaxChange,
                onSetOption: vue.unref(onSetOption),
                onSelectRange: setMaxSelectionRange
              }, null, 8, ["show-seconds", "am-pm-mode", "arrow-control", "spinner-date", "onSetOption"])
            ], 2)
          ], 2)
        ], 2),
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(nsTime).be("panel", "footer"))
        }, [
          vue.createElementVNode("button", {
            type: "button",
            class: vue.normalizeClass([vue.unref(nsTime).be("panel", "btn"), "cancel"]),
            onClick: _cache[0] || (_cache[0] = ($event) => handleCancel())
          }, vue.toDisplayString(vue.unref(t)("el.datepicker.cancel")), 3),
          vue.createElementVNode("button", {
            type: "button",
            class: vue.normalizeClass([vue.unref(nsTime).be("panel", "btn"), "confirm"]),
            disabled: vue.unref(btnConfirmDisabled),
            onClick: _cache[1] || (_cache[1] = ($event) => handleConfirm())
          }, vue.toDisplayString(vue.unref(t)("el.datepicker.confirm")), 11, _hoisted_1)
        ], 2)
      ], 2)) : vue.createCommentVNode("v-if", true);
    };
  }
});
var TimeRangePanel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/time-picker/src/time-picker-com/panel-time-range.vue"]]);

exports["default"] = TimeRangePanel;
//# sourceMappingURL=panel-time-range.js.map
