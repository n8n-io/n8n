'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
require('../../../../constants/index.js');
require('../../../../hooks/index.js');
require('../../../../utils/index.js');
var panelTimePicker = require('../props/panel-time-picker.js');
var useTimePanel = require('../composables/use-time-panel.js');
var useTimePicker = require('../composables/use-time-picker.js');
var basicTimeSpinner = require('./basic-time-spinner.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-namespace/index.js');
var index$1 = require('../../../../hooks/use-locale/index.js');
var types = require('../../../../utils/types.js');
var aria = require('../../../../constants/aria.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "panel-time-pick",
  props: panelTimePicker.panelTimePickerProps,
  emits: ["pick", "select-range", "set-picker-option"],
  setup(__props, { emit }) {
    const props = __props;
    const pickerBase = vue.inject("EP_PICKER_BASE");
    const {
      arrowControl,
      disabledHours,
      disabledMinutes,
      disabledSeconds,
      defaultValue
    } = pickerBase.props;
    const { getAvailableHours, getAvailableMinutes, getAvailableSeconds } = useTimePicker.buildAvailableTimeSlotGetter(disabledHours, disabledMinutes, disabledSeconds);
    const ns = index.useNamespace("time");
    const { t, lang } = index$1.useLocale();
    const selectionRange = vue.ref([0, 2]);
    const oldValue = useTimePicker.useOldValue(props);
    const transitionName = vue.computed(() => {
      return types.isUndefined(props.actualVisible) ? `${ns.namespace.value}-zoom-in-top` : "";
    });
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
    const isValidValue = (_date) => {
      const parsedDate = dayjs__default["default"](_date).locale(lang.value);
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
      const { left, right, up, down } = aria.EVENT_CODE;
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
    const { timePickerOptions, onSetOption, getAvailableTime } = useTimePanel.useTimePanel({
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
      return dayjs__default["default"](value, props.format).locale(lang.value);
    };
    const formatToString = (value) => {
      if (!value)
        return null;
      return value.format(props.format);
    };
    const getDefaultValue = () => {
      return dayjs__default["default"](defaultValue).locale(lang.value);
    };
    emit("set-picker-option", ["isValidValue", isValidValue]);
    emit("set-picker-option", ["formatToString", formatToString]);
    emit("set-picker-option", ["parseUserInput", parseUserInput]);
    emit("set-picker-option", ["handleKeydownInput", handleKeydown]);
    emit("set-picker-option", ["getRangeAvailableTime", getRangeAvailableTime]);
    emit("set-picker-option", ["getDefaultValue", getDefaultValue]);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Transition, { name: vue.unref(transitionName) }, {
        default: vue.withCtx(() => [
          _ctx.actualVisible || _ctx.visible ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).b("panel"))
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass([vue.unref(ns).be("panel", "content"), { "has-seconds": vue.unref(showSeconds) }])
            }, [
              vue.createVNode(basicTimeSpinner["default"], {
                ref: "spinner",
                role: _ctx.datetimeRole || "start",
                "arrow-control": vue.unref(arrowControl),
                "show-seconds": vue.unref(showSeconds),
                "am-pm-mode": vue.unref(amPmMode),
                "spinner-date": _ctx.parsedValue,
                "disabled-hours": vue.unref(disabledHours),
                "disabled-minutes": vue.unref(disabledMinutes),
                "disabled-seconds": vue.unref(disabledSeconds),
                onChange: handleChange,
                onSetOption: vue.unref(onSetOption),
                onSelectRange: setSelectionRange
              }, null, 8, ["role", "arrow-control", "show-seconds", "am-pm-mode", "spinner-date", "disabled-hours", "disabled-minutes", "disabled-seconds", "onSetOption"])
            ], 2),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).be("panel", "footer"))
            }, [
              vue.createElementVNode("button", {
                type: "button",
                class: vue.normalizeClass([vue.unref(ns).be("panel", "btn"), "cancel"]),
                onClick: handleCancel
              }, vue.toDisplayString(vue.unref(t)("el.datepicker.cancel")), 3),
              vue.createElementVNode("button", {
                type: "button",
                class: vue.normalizeClass([vue.unref(ns).be("panel", "btn"), "confirm"]),
                onClick: _cache[0] || (_cache[0] = ($event) => handleConfirm())
              }, vue.toDisplayString(vue.unref(t)("el.datepicker.confirm")), 3)
            ], 2)
          ], 2)) : vue.createCommentVNode("v-if", true)
        ]),
        _: 1
      }, 8, ["name"]);
    };
  }
});
var TimePickPanel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/time-picker/src/time-picker-com/panel-time-pick.vue"]]);

exports["default"] = TimePickPanel;
//# sourceMappingURL=panel-time-pick.js.map
