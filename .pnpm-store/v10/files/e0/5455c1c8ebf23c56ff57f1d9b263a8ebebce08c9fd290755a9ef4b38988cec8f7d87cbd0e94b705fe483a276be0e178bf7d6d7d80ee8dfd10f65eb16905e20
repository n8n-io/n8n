'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
var index$5 = require('../../../button/index.js');
require('../../../../directives/index.js');
require('../../../../hooks/index.js');
var index$2 = require('../../../input/index.js');
require('../../../time-picker/index.js');
var index$4 = require('../../../icon/index.js');
require('../../../../utils/index.js');
require('../../../../constants/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../tooltip/index.js');
var panelDatePick = require('../props/panel-date-pick.js');
var basicDateTable = require('./basic-date-table.js');
var basicMonthTable = require('./basic-month-table.js');
var basicYearTable = require('./basic-year-table.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-namespace/index.js');
var index$1 = require('../../../../hooks/use-locale/index.js');
var constants = require('../../../tooltip/src/constants.js');
var shared = require('@vue/shared');
var utils = require('../../../time-picker/src/utils.js');
var aria = require('../../../../constants/aria.js');
var panelTimePick = require('../../../time-picker/src/time-picker-com/panel-time-pick.js');
var index$3 = require('../../../../directives/click-outside/index.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const _hoisted_1 = ["onClick"];
const _hoisted_2 = ["aria-label"];
const _hoisted_3 = ["aria-label"];
const _hoisted_4 = ["aria-label"];
const _hoisted_5 = ["aria-label"];
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "panel-date-pick",
  props: panelDatePick.panelDatePickProps,
  emits: ["pick", "set-picker-option", "panel-change"],
  setup(__props, { emit: contextEmit }) {
    const props = __props;
    const timeWithinRange = (_, __, ___) => true;
    const ppNs = index.useNamespace("picker-panel");
    const dpNs = index.useNamespace("date-picker");
    const attrs = vue.useAttrs();
    const slots = vue.useSlots();
    const { t, lang } = index$1.useLocale();
    const pickerBase = vue.inject("EP_PICKER_BASE");
    const popper = vue.inject(constants.TOOLTIP_INJECTION_KEY);
    const { shortcuts, disabledDate, cellClassName, defaultTime } = pickerBase.props;
    const defaultValue = vue.toRef(pickerBase.props, "defaultValue");
    const currentViewRef = vue.ref();
    const innerDate = vue.ref(dayjs__default["default"]().locale(lang.value));
    const isChangeToNow = vue.ref(false);
    let isShortcut = false;
    const defaultTimeD = vue.computed(() => {
      return dayjs__default["default"](defaultTime).locale(lang.value);
    });
    const month = vue.computed(() => {
      return innerDate.value.month();
    });
    const year = vue.computed(() => {
      return innerDate.value.year();
    });
    const selectableRange = vue.ref([]);
    const userInputDate = vue.ref(null);
    const userInputTime = vue.ref(null);
    const checkDateWithinRange = (date) => {
      return selectableRange.value.length > 0 ? timeWithinRange(date, selectableRange.value, props.format || "HH:mm:ss") : true;
    };
    const formatEmit = (emitDayjs) => {
      if (defaultTime && !visibleTime.value && !isChangeToNow.value && !isShortcut) {
        return defaultTimeD.value.year(emitDayjs.year()).month(emitDayjs.month()).date(emitDayjs.date());
      }
      if (showTime.value)
        return emitDayjs.millisecond(0);
      return emitDayjs.startOf("day");
    };
    const emit = (value, ...args) => {
      if (!value) {
        contextEmit("pick", value, ...args);
      } else if (shared.isArray(value)) {
        const dates = value.map(formatEmit);
        contextEmit("pick", dates, ...args);
      } else {
        contextEmit("pick", formatEmit(value), ...args);
      }
      userInputDate.value = null;
      userInputTime.value = null;
      isChangeToNow.value = false;
      isShortcut = false;
    };
    const handleDatePick = (value, keepOpen) => {
      if (selectionMode.value === "date") {
        value = value;
        let newDate = props.parsedValue ? props.parsedValue.year(value.year()).month(value.month()).date(value.date()) : value;
        if (!checkDateWithinRange(newDate)) {
          newDate = selectableRange.value[0][0].year(value.year()).month(value.month()).date(value.date());
        }
        innerDate.value = newDate;
        emit(newDate, showTime.value || keepOpen);
      } else if (selectionMode.value === "week") {
        emit(value.date);
      } else if (selectionMode.value === "dates") {
        emit(value, true);
      }
    };
    const moveByMonth = (forward) => {
      const action = forward ? "add" : "subtract";
      innerDate.value = innerDate.value[action](1, "month");
      handlePanelChange("month");
    };
    const moveByYear = (forward) => {
      const currentDate = innerDate.value;
      const action = forward ? "add" : "subtract";
      innerDate.value = currentView.value === "year" ? currentDate[action](10, "year") : currentDate[action](1, "year");
      handlePanelChange("year");
    };
    const currentView = vue.ref("date");
    const yearLabel = vue.computed(() => {
      const yearTranslation = t("el.datepicker.year");
      if (currentView.value === "year") {
        const startYear = Math.floor(year.value / 10) * 10;
        if (yearTranslation) {
          return `${startYear} ${yearTranslation} - ${startYear + 9} ${yearTranslation}`;
        }
        return `${startYear} - ${startYear + 9}`;
      }
      return `${year.value} ${yearTranslation}`;
    });
    const handleShortcutClick = (shortcut) => {
      const shortcutValue = shared.isFunction(shortcut.value) ? shortcut.value() : shortcut.value;
      if (shortcutValue) {
        isShortcut = true;
        emit(dayjs__default["default"](shortcutValue).locale(lang.value));
        return;
      }
      if (shortcut.onClick) {
        shortcut.onClick({
          attrs,
          slots,
          emit: contextEmit
        });
      }
    };
    const selectionMode = vue.computed(() => {
      const { type } = props;
      if (["week", "month", "year", "dates"].includes(type))
        return type;
      return "date";
    });
    const keyboardMode = vue.computed(() => {
      return selectionMode.value === "date" ? currentView.value : selectionMode.value;
    });
    const hasShortcuts = vue.computed(() => !!shortcuts.length);
    const handleMonthPick = async (month2) => {
      innerDate.value = innerDate.value.startOf("month").month(month2);
      if (selectionMode.value === "month") {
        emit(innerDate.value, false);
      } else {
        currentView.value = "date";
        if (["month", "year", "date", "week"].includes(selectionMode.value)) {
          emit(innerDate.value, true);
          await vue.nextTick();
          handleFocusPicker();
        }
      }
      handlePanelChange("month");
    };
    const handleYearPick = async (year2) => {
      if (selectionMode.value === "year") {
        innerDate.value = innerDate.value.startOf("year").year(year2);
        emit(innerDate.value, false);
      } else {
        innerDate.value = innerDate.value.year(year2);
        currentView.value = "month";
        if (["month", "year", "date", "week"].includes(selectionMode.value)) {
          emit(innerDate.value, true);
          await vue.nextTick();
          handleFocusPicker();
        }
      }
      handlePanelChange("year");
    };
    const showPicker = async (view) => {
      currentView.value = view;
      await vue.nextTick();
      handleFocusPicker();
    };
    const showTime = vue.computed(() => props.type === "datetime" || props.type === "datetimerange");
    const footerVisible = vue.computed(() => {
      return showTime.value || selectionMode.value === "dates";
    });
    const disabledConfirm = vue.computed(() => {
      if (!disabledDate)
        return false;
      if (!props.parsedValue)
        return true;
      if (shared.isArray(props.parsedValue)) {
        return disabledDate(props.parsedValue[0].toDate());
      }
      return disabledDate(props.parsedValue.toDate());
    });
    const onConfirm = () => {
      if (selectionMode.value === "dates") {
        emit(props.parsedValue);
      } else {
        let result = props.parsedValue;
        if (!result) {
          const defaultTimeD2 = dayjs__default["default"](defaultTime).locale(lang.value);
          const defaultValueD = getDefaultValue();
          result = defaultTimeD2.year(defaultValueD.year()).month(defaultValueD.month()).date(defaultValueD.date());
        }
        innerDate.value = result;
        emit(result);
      }
    };
    const disabledNow = vue.computed(() => {
      if (!disabledDate)
        return false;
      return disabledDate(dayjs__default["default"]().locale(lang.value).toDate());
    });
    const changeToNow = () => {
      const now = dayjs__default["default"]().locale(lang.value);
      const nowDate = now.toDate();
      isChangeToNow.value = true;
      if ((!disabledDate || !disabledDate(nowDate)) && checkDateWithinRange(nowDate)) {
        innerDate.value = dayjs__default["default"]().locale(lang.value);
        emit(innerDate.value);
      }
    };
    const timeFormat = vue.computed(() => {
      return props.timeFormat || utils.extractTimeFormat(props.format);
    });
    const dateFormat = vue.computed(() => {
      return props.dateFormat || utils.extractDateFormat(props.format);
    });
    const visibleTime = vue.computed(() => {
      if (userInputTime.value)
        return userInputTime.value;
      if (!props.parsedValue && !defaultValue.value)
        return;
      return (props.parsedValue || innerDate.value).format(timeFormat.value);
    });
    const visibleDate = vue.computed(() => {
      if (userInputDate.value)
        return userInputDate.value;
      if (!props.parsedValue && !defaultValue.value)
        return;
      return (props.parsedValue || innerDate.value).format(dateFormat.value);
    });
    const timePickerVisible = vue.ref(false);
    const onTimePickerInputFocus = () => {
      timePickerVisible.value = true;
    };
    const handleTimePickClose = () => {
      timePickerVisible.value = false;
    };
    const getUnits = (date) => {
      return {
        hour: date.hour(),
        minute: date.minute(),
        second: date.second(),
        year: date.year(),
        month: date.month(),
        date: date.date()
      };
    };
    const handleTimePick = (value, visible, first) => {
      const { hour, minute, second } = getUnits(value);
      const newDate = props.parsedValue ? props.parsedValue.hour(hour).minute(minute).second(second) : value;
      innerDate.value = newDate;
      emit(innerDate.value, true);
      if (!first) {
        timePickerVisible.value = visible;
      }
    };
    const handleVisibleTimeChange = (value) => {
      const newDate = dayjs__default["default"](value, timeFormat.value).locale(lang.value);
      if (newDate.isValid() && checkDateWithinRange(newDate)) {
        const { year: year2, month: month2, date } = getUnits(innerDate.value);
        innerDate.value = newDate.year(year2).month(month2).date(date);
        userInputTime.value = null;
        timePickerVisible.value = false;
        emit(innerDate.value, true);
      }
    };
    const handleVisibleDateChange = (value) => {
      const newDate = dayjs__default["default"](value, dateFormat.value).locale(lang.value);
      if (newDate.isValid()) {
        if (disabledDate && disabledDate(newDate.toDate())) {
          return;
        }
        const { hour, minute, second } = getUnits(innerDate.value);
        innerDate.value = newDate.hour(hour).minute(minute).second(second);
        userInputDate.value = null;
        emit(innerDate.value, true);
      }
    };
    const isValidValue = (date) => {
      return dayjs__default["default"].isDayjs(date) && date.isValid() && (disabledDate ? !disabledDate(date.toDate()) : true);
    };
    const formatToString = (value) => {
      if (selectionMode.value === "dates") {
        return value.map((_) => _.format(props.format));
      }
      return value.format(props.format);
    };
    const parseUserInput = (value) => {
      return dayjs__default["default"](value, props.format).locale(lang.value);
    };
    const getDefaultValue = () => {
      const parseDate = dayjs__default["default"](defaultValue.value).locale(lang.value);
      if (!defaultValue.value) {
        const defaultTimeDValue = defaultTimeD.value;
        return dayjs__default["default"]().hour(defaultTimeDValue.hour()).minute(defaultTimeDValue.minute()).second(defaultTimeDValue.second()).locale(lang.value);
      }
      return parseDate;
    };
    const handleFocusPicker = async () => {
      var _a;
      if (["week", "month", "year", "date"].includes(selectionMode.value)) {
        (_a = currentViewRef.value) == null ? void 0 : _a.focus();
        if (selectionMode.value === "week") {
          handleKeyControl(aria.EVENT_CODE.down);
        }
      }
    };
    const handleKeydownTable = (event) => {
      const { code } = event;
      const validCode = [
        aria.EVENT_CODE.up,
        aria.EVENT_CODE.down,
        aria.EVENT_CODE.left,
        aria.EVENT_CODE.right,
        aria.EVENT_CODE.home,
        aria.EVENT_CODE.end,
        aria.EVENT_CODE.pageUp,
        aria.EVENT_CODE.pageDown
      ];
      if (validCode.includes(code)) {
        handleKeyControl(code);
        event.stopPropagation();
        event.preventDefault();
      }
      if ([aria.EVENT_CODE.enter, aria.EVENT_CODE.space, aria.EVENT_CODE.numpadEnter].includes(code) && userInputDate.value === null && userInputTime.value === null) {
        event.preventDefault();
        emit(innerDate.value, false);
      }
    };
    const handleKeyControl = (code) => {
      var _a;
      const { up, down, left, right, home, end, pageUp, pageDown } = aria.EVENT_CODE;
      const mapping = {
        year: {
          [up]: -4,
          [down]: 4,
          [left]: -1,
          [right]: 1,
          offset: (date, step) => date.setFullYear(date.getFullYear() + step)
        },
        month: {
          [up]: -4,
          [down]: 4,
          [left]: -1,
          [right]: 1,
          offset: (date, step) => date.setMonth(date.getMonth() + step)
        },
        week: {
          [up]: -1,
          [down]: 1,
          [left]: -1,
          [right]: 1,
          offset: (date, step) => date.setDate(date.getDate() + step * 7)
        },
        date: {
          [up]: -7,
          [down]: 7,
          [left]: -1,
          [right]: 1,
          [home]: (date) => -date.getDay(),
          [end]: (date) => -date.getDay() + 6,
          [pageUp]: (date) => -new Date(date.getFullYear(), date.getMonth(), 0).getDate(),
          [pageDown]: (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
          offset: (date, step) => date.setDate(date.getDate() + step)
        }
      };
      const newDate = innerDate.value.toDate();
      while (Math.abs(innerDate.value.diff(newDate, "year", true)) < 1) {
        const map = mapping[keyboardMode.value];
        if (!map)
          return;
        map.offset(newDate, shared.isFunction(map[code]) ? map[code](newDate) : (_a = map[code]) != null ? _a : 0);
        if (disabledDate && disabledDate(newDate)) {
          break;
        }
        const result = dayjs__default["default"](newDate).locale(lang.value);
        innerDate.value = result;
        contextEmit("pick", result, true);
        break;
      }
    };
    const handlePanelChange = (mode) => {
      contextEmit("panel-change", innerDate.value.toDate(), mode, currentView.value);
    };
    vue.watch(() => selectionMode.value, (val) => {
      if (["month", "year"].includes(val)) {
        currentView.value = val;
        return;
      }
      currentView.value = "date";
    }, { immediate: true });
    vue.watch(() => currentView.value, () => {
      popper == null ? void 0 : popper.updatePopper();
    });
    vue.watch(() => defaultValue.value, (val) => {
      if (val) {
        innerDate.value = getDefaultValue();
      }
    }, { immediate: true });
    vue.watch(() => props.parsedValue, (val) => {
      if (val) {
        if (selectionMode.value === "dates")
          return;
        if (Array.isArray(val))
          return;
        innerDate.value = val;
      } else {
        innerDate.value = getDefaultValue();
      }
    }, { immediate: true });
    contextEmit("set-picker-option", ["isValidValue", isValidValue]);
    contextEmit("set-picker-option", ["formatToString", formatToString]);
    contextEmit("set-picker-option", ["parseUserInput", parseUserInput]);
    contextEmit("set-picker-option", ["handleFocusPicker", handleFocusPicker]);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([
          vue.unref(ppNs).b(),
          vue.unref(dpNs).b(),
          {
            "has-sidebar": _ctx.$slots.sidebar || vue.unref(hasShortcuts),
            "has-time": vue.unref(showTime)
          }
        ])
      }, [
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ppNs).e("body-wrapper"))
        }, [
          vue.renderSlot(_ctx.$slots, "sidebar", {
            class: vue.normalizeClass(vue.unref(ppNs).e("sidebar"))
          }),
          vue.unref(hasShortcuts) ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ppNs).e("sidebar"))
          }, [
            (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(shortcuts), (shortcut, key) => {
              return vue.openBlock(), vue.createElementBlock("button", {
                key,
                type: "button",
                class: vue.normalizeClass(vue.unref(ppNs).e("shortcut")),
                onClick: ($event) => handleShortcutClick(shortcut)
              }, vue.toDisplayString(shortcut.text), 11, _hoisted_1);
            }), 128))
          ], 2)) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ppNs).e("body"))
          }, [
            vue.unref(showTime) ? (vue.openBlock(), vue.createElementBlock("div", {
              key: 0,
              class: vue.normalizeClass(vue.unref(dpNs).e("time-header"))
            }, [
              vue.createElementVNode("span", {
                class: vue.normalizeClass(vue.unref(dpNs).e("editor-wrap"))
              }, [
                vue.createVNode(vue.unref(index$2.ElInput), {
                  placeholder: vue.unref(t)("el.datepicker.selectDate"),
                  "model-value": vue.unref(visibleDate),
                  size: "small",
                  "validate-event": false,
                  onInput: _cache[0] || (_cache[0] = (val) => userInputDate.value = val),
                  onChange: handleVisibleDateChange
                }, null, 8, ["placeholder", "model-value"])
              ], 2),
              vue.withDirectives((vue.openBlock(), vue.createElementBlock("span", {
                class: vue.normalizeClass(vue.unref(dpNs).e("editor-wrap"))
              }, [
                vue.createVNode(vue.unref(index$2.ElInput), {
                  placeholder: vue.unref(t)("el.datepicker.selectTime"),
                  "model-value": vue.unref(visibleTime),
                  size: "small",
                  "validate-event": false,
                  onFocus: onTimePickerInputFocus,
                  onInput: _cache[1] || (_cache[1] = (val) => userInputTime.value = val),
                  onChange: handleVisibleTimeChange
                }, null, 8, ["placeholder", "model-value"]),
                vue.createVNode(vue.unref(panelTimePick["default"]), {
                  visible: timePickerVisible.value,
                  format: vue.unref(timeFormat),
                  "parsed-value": innerDate.value,
                  onPick: handleTimePick
                }, null, 8, ["visible", "format", "parsed-value"])
              ], 2)), [
                [vue.unref(index$3["default"]), handleTimePickClose]
              ])
            ], 2)) : vue.createCommentVNode("v-if", true),
            vue.withDirectives(vue.createElementVNode("div", {
              class: vue.normalizeClass([
                vue.unref(dpNs).e("header"),
                (currentView.value === "year" || currentView.value === "month") && vue.unref(dpNs).e("header--bordered")
              ])
            }, [
              vue.createElementVNode("span", {
                class: vue.normalizeClass(vue.unref(dpNs).e("prev-btn"))
              }, [
                vue.createElementVNode("button", {
                  type: "button",
                  "aria-label": vue.unref(t)(`el.datepicker.prevYear`),
                  class: vue.normalizeClass(["d-arrow-left", vue.unref(ppNs).e("icon-btn")]),
                  onClick: _cache[2] || (_cache[2] = ($event) => moveByYear(false))
                }, [
                  vue.createVNode(vue.unref(index$4.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.DArrowLeft))
                    ]),
                    _: 1
                  })
                ], 10, _hoisted_2),
                vue.withDirectives(vue.createElementVNode("button", {
                  type: "button",
                  "aria-label": vue.unref(t)(`el.datepicker.prevMonth`),
                  class: vue.normalizeClass([vue.unref(ppNs).e("icon-btn"), "arrow-left"]),
                  onClick: _cache[3] || (_cache[3] = ($event) => moveByMonth(false))
                }, [
                  vue.createVNode(vue.unref(index$4.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.ArrowLeft))
                    ]),
                    _: 1
                  })
                ], 10, _hoisted_3), [
                  [vue.vShow, currentView.value === "date"]
                ])
              ], 2),
              vue.createElementVNode("span", {
                role: "button",
                class: vue.normalizeClass(vue.unref(dpNs).e("header-label")),
                "aria-live": "polite",
                tabindex: "0",
                onKeydown: _cache[4] || (_cache[4] = vue.withKeys(($event) => showPicker("year"), ["enter"])),
                onClick: _cache[5] || (_cache[5] = ($event) => showPicker("year"))
              }, vue.toDisplayString(vue.unref(yearLabel)), 35),
              vue.withDirectives(vue.createElementVNode("span", {
                role: "button",
                "aria-live": "polite",
                tabindex: "0",
                class: vue.normalizeClass([
                  vue.unref(dpNs).e("header-label"),
                  { active: currentView.value === "month" }
                ]),
                onKeydown: _cache[6] || (_cache[6] = vue.withKeys(($event) => showPicker("month"), ["enter"])),
                onClick: _cache[7] || (_cache[7] = ($event) => showPicker("month"))
              }, vue.toDisplayString(vue.unref(t)(`el.datepicker.month${vue.unref(month) + 1}`)), 35), [
                [vue.vShow, currentView.value === "date"]
              ]),
              vue.createElementVNode("span", {
                class: vue.normalizeClass(vue.unref(dpNs).e("next-btn"))
              }, [
                vue.withDirectives(vue.createElementVNode("button", {
                  type: "button",
                  "aria-label": vue.unref(t)(`el.datepicker.nextMonth`),
                  class: vue.normalizeClass([vue.unref(ppNs).e("icon-btn"), "arrow-right"]),
                  onClick: _cache[8] || (_cache[8] = ($event) => moveByMonth(true))
                }, [
                  vue.createVNode(vue.unref(index$4.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.ArrowRight))
                    ]),
                    _: 1
                  })
                ], 10, _hoisted_4), [
                  [vue.vShow, currentView.value === "date"]
                ]),
                vue.createElementVNode("button", {
                  type: "button",
                  "aria-label": vue.unref(t)(`el.datepicker.nextYear`),
                  class: vue.normalizeClass([vue.unref(ppNs).e("icon-btn"), "d-arrow-right"]),
                  onClick: _cache[9] || (_cache[9] = ($event) => moveByYear(true))
                }, [
                  vue.createVNode(vue.unref(index$4.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.DArrowRight))
                    ]),
                    _: 1
                  })
                ], 10, _hoisted_5)
              ], 2)
            ], 2), [
              [vue.vShow, currentView.value !== "time"]
            ]),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ppNs).e("content")),
              onKeydown: handleKeydownTable
            }, [
              currentView.value === "date" ? (vue.openBlock(), vue.createBlock(basicDateTable["default"], {
                key: 0,
                ref_key: "currentViewRef",
                ref: currentViewRef,
                "selection-mode": vue.unref(selectionMode),
                date: innerDate.value,
                "parsed-value": _ctx.parsedValue,
                "disabled-date": vue.unref(disabledDate),
                "cell-class-name": vue.unref(cellClassName),
                onPick: handleDatePick
              }, null, 8, ["selection-mode", "date", "parsed-value", "disabled-date", "cell-class-name"])) : vue.createCommentVNode("v-if", true),
              currentView.value === "year" ? (vue.openBlock(), vue.createBlock(basicYearTable["default"], {
                key: 1,
                ref_key: "currentViewRef",
                ref: currentViewRef,
                date: innerDate.value,
                "disabled-date": vue.unref(disabledDate),
                "parsed-value": _ctx.parsedValue,
                onPick: handleYearPick
              }, null, 8, ["date", "disabled-date", "parsed-value"])) : vue.createCommentVNode("v-if", true),
              currentView.value === "month" ? (vue.openBlock(), vue.createBlock(basicMonthTable["default"], {
                key: 2,
                ref_key: "currentViewRef",
                ref: currentViewRef,
                date: innerDate.value,
                "parsed-value": _ctx.parsedValue,
                "disabled-date": vue.unref(disabledDate),
                onPick: handleMonthPick
              }, null, 8, ["date", "parsed-value", "disabled-date"])) : vue.createCommentVNode("v-if", true)
            ], 34)
          ], 2)
        ], 2),
        vue.withDirectives(vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ppNs).e("footer"))
        }, [
          vue.withDirectives(vue.createVNode(vue.unref(index$5.ElButton), {
            text: "",
            size: "small",
            class: vue.normalizeClass(vue.unref(ppNs).e("link-btn")),
            disabled: vue.unref(disabledNow),
            onClick: changeToNow
          }, {
            default: vue.withCtx(() => [
              vue.createTextVNode(vue.toDisplayString(vue.unref(t)("el.datepicker.now")), 1)
            ]),
            _: 1
          }, 8, ["class", "disabled"]), [
            [vue.vShow, vue.unref(selectionMode) !== "dates"]
          ]),
          vue.createVNode(vue.unref(index$5.ElButton), {
            plain: "",
            size: "small",
            class: vue.normalizeClass(vue.unref(ppNs).e("link-btn")),
            disabled: vue.unref(disabledConfirm),
            onClick: onConfirm
          }, {
            default: vue.withCtx(() => [
              vue.createTextVNode(vue.toDisplayString(vue.unref(t)("el.datepicker.confirm")), 1)
            ]),
            _: 1
          }, 8, ["class", "disabled"])
        ], 2), [
          [vue.vShow, vue.unref(footerVisible) && currentView.value === "date"]
        ])
      ], 2);
    };
  }
});
var DatePickPanel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/date-picker/src/date-picker-com/panel-date-pick.vue"]]);

exports["default"] = DatePickPanel;
//# sourceMappingURL=panel-date-pick.js.map
