'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
var index$1 = require('../../../icon/index.js');
require('../../../../hooks/index.js');
var iconsVue = require('@element-plus/icons-vue');
var panelMonthRange = require('../props/panel-month-range.js');
var useMonthRangeHeader = require('../composables/use-month-range-header.js');
var useRangePicker = require('../composables/use-range-picker.js');
var basicMonthTable = require('./basic-month-table.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-locale/index.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const _hoisted_1 = ["onClick"];
const _hoisted_2 = ["disabled"];
const _hoisted_3 = ["disabled"];
const unit = "year";
const __default__ = vue.defineComponent({
  name: "DatePickerMonthRange"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: panelMonthRange.panelMonthRangeProps,
  emits: panelMonthRange.panelMonthRangeEmits,
  setup(__props, { emit }) {
    const props = __props;
    const { lang } = index.useLocale();
    const pickerBase = vue.inject("EP_PICKER_BASE");
    const { shortcuts, disabledDate, format } = pickerBase.props;
    const defaultValue = vue.toRef(pickerBase.props, "defaultValue");
    const leftDate = vue.ref(dayjs__default["default"]().locale(lang.value));
    const rightDate = vue.ref(dayjs__default["default"]().locale(lang.value).add(1, unit));
    const {
      minDate,
      maxDate,
      rangeState,
      ppNs,
      drpNs,
      handleChangeRange,
      handleRangeConfirm,
      handleShortcutClick,
      onSelect
    } = useRangePicker.useRangePicker(props, {
      defaultValue,
      leftDate,
      rightDate,
      unit,
      onParsedValueChanged
    });
    const hasShortcuts = vue.computed(() => !!shortcuts.length);
    const {
      leftPrevYear,
      rightNextYear,
      leftNextYear,
      rightPrevYear,
      leftLabel,
      rightLabel,
      leftYear,
      rightYear
    } = useMonthRangeHeader.useMonthRangeHeader({
      unlinkPanels: vue.toRef(props, "unlinkPanels"),
      leftDate,
      rightDate
    });
    const enableYearArrow = vue.computed(() => {
      return props.unlinkPanels && rightYear.value > leftYear.value + 1;
    });
    const handleRangePick = (val, close = true) => {
      const minDate_ = val.minDate;
      const maxDate_ = val.maxDate;
      if (maxDate.value === maxDate_ && minDate.value === minDate_) {
        return;
      }
      emit("calendar-change", [minDate_.toDate(), maxDate_ && maxDate_.toDate()]);
      maxDate.value = maxDate_;
      minDate.value = minDate_;
      if (!close)
        return;
      handleRangeConfirm();
    };
    const formatToString = (days) => {
      return days.map((day) => day.format(format));
    };
    function onParsedValueChanged(minDate2, maxDate2) {
      if (props.unlinkPanels && maxDate2) {
        const minDateYear = (minDate2 == null ? void 0 : minDate2.year()) || 0;
        const maxDateYear = maxDate2.year();
        rightDate.value = minDateYear === maxDateYear ? maxDate2.add(1, unit) : maxDate2;
      } else {
        rightDate.value = leftDate.value.add(1, unit);
      }
    }
    emit("set-picker-option", ["formatToString", formatToString]);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([
          vue.unref(ppNs).b(),
          vue.unref(drpNs).b(),
          {
            "has-sidebar": Boolean(_ctx.$slots.sidebar) || vue.unref(hasShortcuts)
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
                onClick: ($event) => vue.unref(handleShortcutClick)(shortcut)
              }, vue.toDisplayString(shortcut.text), 11, _hoisted_1);
            }), 128))
          ], 2)) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ppNs).e("body"))
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass([[vue.unref(ppNs).e("content"), vue.unref(drpNs).e("content")], "is-left"])
            }, [
              vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(drpNs).e("header"))
              }, [
                vue.createElementVNode("button", {
                  type: "button",
                  class: vue.normalizeClass([vue.unref(ppNs).e("icon-btn"), "d-arrow-left"]),
                  onClick: _cache[0] || (_cache[0] = (...args) => vue.unref(leftPrevYear) && vue.unref(leftPrevYear)(...args))
                }, [
                  vue.createVNode(vue.unref(index$1.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.DArrowLeft))
                    ]),
                    _: 1
                  })
                ], 2),
                _ctx.unlinkPanels ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  type: "button",
                  disabled: !vue.unref(enableYearArrow),
                  class: vue.normalizeClass([[
                    vue.unref(ppNs).e("icon-btn"),
                    { [vue.unref(ppNs).is("disabled")]: !vue.unref(enableYearArrow) }
                  ], "d-arrow-right"]),
                  onClick: _cache[1] || (_cache[1] = (...args) => vue.unref(leftNextYear) && vue.unref(leftNextYear)(...args))
                }, [
                  vue.createVNode(vue.unref(index$1.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.DArrowRight))
                    ]),
                    _: 1
                  })
                ], 10, _hoisted_2)) : vue.createCommentVNode("v-if", true),
                vue.createElementVNode("div", null, vue.toDisplayString(vue.unref(leftLabel)), 1)
              ], 2),
              vue.createVNode(basicMonthTable["default"], {
                "selection-mode": "range",
                date: leftDate.value,
                "min-date": vue.unref(minDate),
                "max-date": vue.unref(maxDate),
                "range-state": vue.unref(rangeState),
                "disabled-date": vue.unref(disabledDate),
                onChangerange: vue.unref(handleChangeRange),
                onPick: handleRangePick,
                onSelect: vue.unref(onSelect)
              }, null, 8, ["date", "min-date", "max-date", "range-state", "disabled-date", "onChangerange", "onSelect"])
            ], 2),
            vue.createElementVNode("div", {
              class: vue.normalizeClass([[vue.unref(ppNs).e("content"), vue.unref(drpNs).e("content")], "is-right"])
            }, [
              vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(drpNs).e("header"))
              }, [
                _ctx.unlinkPanels ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  type: "button",
                  disabled: !vue.unref(enableYearArrow),
                  class: vue.normalizeClass([[vue.unref(ppNs).e("icon-btn"), { "is-disabled": !vue.unref(enableYearArrow) }], "d-arrow-left"]),
                  onClick: _cache[2] || (_cache[2] = (...args) => vue.unref(rightPrevYear) && vue.unref(rightPrevYear)(...args))
                }, [
                  vue.createVNode(vue.unref(index$1.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.DArrowLeft))
                    ]),
                    _: 1
                  })
                ], 10, _hoisted_3)) : vue.createCommentVNode("v-if", true),
                vue.createElementVNode("button", {
                  type: "button",
                  class: vue.normalizeClass([vue.unref(ppNs).e("icon-btn"), "d-arrow-right"]),
                  onClick: _cache[3] || (_cache[3] = (...args) => vue.unref(rightNextYear) && vue.unref(rightNextYear)(...args))
                }, [
                  vue.createVNode(vue.unref(index$1.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.DArrowRight))
                    ]),
                    _: 1
                  })
                ], 2),
                vue.createElementVNode("div", null, vue.toDisplayString(vue.unref(rightLabel)), 1)
              ], 2),
              vue.createVNode(basicMonthTable["default"], {
                "selection-mode": "range",
                date: rightDate.value,
                "min-date": vue.unref(minDate),
                "max-date": vue.unref(maxDate),
                "range-state": vue.unref(rangeState),
                "disabled-date": vue.unref(disabledDate),
                onChangerange: vue.unref(handleChangeRange),
                onPick: handleRangePick,
                onSelect: vue.unref(onSelect)
              }, null, 8, ["date", "min-date", "max-date", "range-state", "disabled-date", "onChangerange", "onSelect"])
            ], 2)
          ], 2)
        ], 2)
      ], 2);
    };
  }
});
var MonthRangePickPanel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/date-picker/src/date-picker-com/panel-month-range.vue"]]);

exports["default"] = MonthRangePickPanel;
//# sourceMappingURL=panel-month-range.js.map
