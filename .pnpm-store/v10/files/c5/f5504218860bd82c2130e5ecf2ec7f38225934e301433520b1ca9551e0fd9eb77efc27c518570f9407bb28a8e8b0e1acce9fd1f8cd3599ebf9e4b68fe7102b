'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
require('../../../../directives/index.js');
var index$1 = require('../../../scrollbar/index.js');
var index$2 = require('../../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../../hooks/index.js');
require('../../../../utils/index.js');
var constants = require('../constants.js');
var utils = require('../utils.js');
var basicTimeSpinner = require('../props/basic-time-spinner.js');
var useTimePicker = require('../composables/use-time-picker.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-namespace/index.js');
var style = require('../../../../utils/dom/style.js');
var index$3 = require('../../../../directives/repeat-click/index.js');

const _hoisted_1 = ["onClick"];
const _hoisted_2 = ["onMouseenter"];
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "basic-time-spinner",
  props: basicTimeSpinner.basicTimeSpinnerProps,
  emits: ["change", "select-range", "set-option"],
  setup(__props, { emit }) {
    const props = __props;
    const ns = index.useNamespace("time");
    const { getHoursList, getMinutesList, getSecondsList } = useTimePicker.getTimeLists(props.disabledHours, props.disabledMinutes, props.disabledSeconds);
    let isScrolling = false;
    const currentScrollbar = vue.ref();
    const listHoursRef = vue.ref();
    const listMinutesRef = vue.ref();
    const listSecondsRef = vue.ref();
    const listRefsMap = {
      hours: listHoursRef,
      minutes: listMinutesRef,
      seconds: listSecondsRef
    };
    const spinnerItems = vue.computed(() => {
      return props.showSeconds ? constants.timeUnits : constants.timeUnits.slice(0, 2);
    });
    const timePartials = vue.computed(() => {
      const { spinnerDate } = props;
      const hours = spinnerDate.hour();
      const minutes = spinnerDate.minute();
      const seconds = spinnerDate.second();
      return { hours, minutes, seconds };
    });
    const timeList = vue.computed(() => {
      const { hours, minutes } = vue.unref(timePartials);
      return {
        hours: getHoursList(props.role),
        minutes: getMinutesList(hours, props.role),
        seconds: getSecondsList(hours, minutes, props.role)
      };
    });
    const arrowControlTimeList = vue.computed(() => {
      const { hours, minutes, seconds } = vue.unref(timePartials);
      return {
        hours: utils.buildTimeList(hours, 23),
        minutes: utils.buildTimeList(minutes, 59),
        seconds: utils.buildTimeList(seconds, 59)
      };
    });
    const debouncedResetScroll = lodashUnified.debounce((type) => {
      isScrolling = false;
      adjustCurrentSpinner(type);
    }, 200);
    const getAmPmFlag = (hour) => {
      const shouldShowAmPm = !!props.amPmMode;
      if (!shouldShowAmPm)
        return "";
      const isCapital = props.amPmMode === "A";
      let content = hour < 12 ? " am" : " pm";
      if (isCapital)
        content = content.toUpperCase();
      return content;
    };
    const emitSelectRange = (type) => {
      let range;
      switch (type) {
        case "hours":
          range = [0, 2];
          break;
        case "minutes":
          range = [3, 5];
          break;
        case "seconds":
          range = [6, 8];
          break;
      }
      const [left, right] = range;
      emit("select-range", left, right);
      currentScrollbar.value = type;
    };
    const adjustCurrentSpinner = (type) => {
      adjustSpinner(type, vue.unref(timePartials)[type]);
    };
    const adjustSpinners = () => {
      adjustCurrentSpinner("hours");
      adjustCurrentSpinner("minutes");
      adjustCurrentSpinner("seconds");
    };
    const getScrollbarElement = (el) => el.querySelector(`.${ns.namespace.value}-scrollbar__wrap`);
    const adjustSpinner = (type, value) => {
      if (props.arrowControl)
        return;
      const scrollbar = vue.unref(listRefsMap[type]);
      if (scrollbar && scrollbar.$el) {
        getScrollbarElement(scrollbar.$el).scrollTop = Math.max(0, value * typeItemHeight(type));
      }
    };
    const typeItemHeight = (type) => {
      const scrollbar = vue.unref(listRefsMap[type]);
      const listItem = scrollbar == null ? void 0 : scrollbar.$el.querySelector("li");
      if (listItem) {
        return Number.parseFloat(style.getStyle(listItem, "height")) || 0;
      }
      return 0;
    };
    const onIncrement = () => {
      scrollDown(1);
    };
    const onDecrement = () => {
      scrollDown(-1);
    };
    const scrollDown = (step) => {
      if (!currentScrollbar.value) {
        emitSelectRange("hours");
      }
      const label = currentScrollbar.value;
      const now = vue.unref(timePartials)[label];
      const total = currentScrollbar.value === "hours" ? 24 : 60;
      const next = findNextUnDisabled(label, now, step, total);
      modifyDateField(label, next);
      adjustSpinner(label, next);
      vue.nextTick(() => emitSelectRange(label));
    };
    const findNextUnDisabled = (type, now, step, total) => {
      let next = (now + step + total) % total;
      const list = vue.unref(timeList)[type];
      while (list[next] && next !== now) {
        next = (next + step + total) % total;
      }
      return next;
    };
    const modifyDateField = (type, value) => {
      const list = vue.unref(timeList)[type];
      const isDisabled = list[value];
      if (isDisabled)
        return;
      const { hours, minutes, seconds } = vue.unref(timePartials);
      let changeTo;
      switch (type) {
        case "hours":
          changeTo = props.spinnerDate.hour(value).minute(minutes).second(seconds);
          break;
        case "minutes":
          changeTo = props.spinnerDate.hour(hours).minute(value).second(seconds);
          break;
        case "seconds":
          changeTo = props.spinnerDate.hour(hours).minute(minutes).second(value);
          break;
      }
      emit("change", changeTo);
    };
    const handleClick = (type, { value, disabled }) => {
      if (!disabled) {
        modifyDateField(type, value);
        emitSelectRange(type);
        adjustSpinner(type, value);
      }
    };
    const handleScroll = (type) => {
      isScrolling = true;
      debouncedResetScroll(type);
      const value = Math.min(Math.round((getScrollbarElement(vue.unref(listRefsMap[type]).$el).scrollTop - (scrollBarHeight(type) * 0.5 - 10) / typeItemHeight(type) + 3) / typeItemHeight(type)), type === "hours" ? 23 : 59);
      modifyDateField(type, value);
    };
    const scrollBarHeight = (type) => {
      return vue.unref(listRefsMap[type]).$el.offsetHeight;
    };
    const bindScrollEvent = () => {
      const bindFunction = (type) => {
        const scrollbar = vue.unref(listRefsMap[type]);
        if (scrollbar && scrollbar.$el) {
          getScrollbarElement(scrollbar.$el).onscroll = () => {
            handleScroll(type);
          };
        }
      };
      bindFunction("hours");
      bindFunction("minutes");
      bindFunction("seconds");
    };
    vue.onMounted(() => {
      vue.nextTick(() => {
        !props.arrowControl && bindScrollEvent();
        adjustSpinners();
        if (props.role === "start")
          emitSelectRange("hours");
      });
    });
    const setRef = (scrollbar, type) => {
      listRefsMap[type].value = scrollbar;
    };
    emit("set-option", [`${props.role}_scrollDown`, scrollDown]);
    emit("set-option", [`${props.role}_emitSelectRange`, emitSelectRange]);
    vue.watch(() => props.spinnerDate, () => {
      if (isScrolling)
        return;
      adjustSpinners();
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([vue.unref(ns).b("spinner"), { "has-seconds": _ctx.showSeconds }])
      }, [
        !_ctx.arrowControl ? (vue.openBlock(true), vue.createElementBlock(vue.Fragment, { key: 0 }, vue.renderList(vue.unref(spinnerItems), (item) => {
          return vue.openBlock(), vue.createBlock(vue.unref(index$1.ElScrollbar), {
            key: item,
            ref_for: true,
            ref: (scrollbar) => setRef(scrollbar, item),
            class: vue.normalizeClass(vue.unref(ns).be("spinner", "wrapper")),
            "wrap-style": "max-height: inherit;",
            "view-class": vue.unref(ns).be("spinner", "list"),
            noresize: "",
            tag: "ul",
            onMouseenter: ($event) => emitSelectRange(item),
            onMousemove: ($event) => adjustCurrentSpinner(item)
          }, {
            default: vue.withCtx(() => [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(timeList)[item], (disabled, key) => {
                return vue.openBlock(), vue.createElementBlock("li", {
                  key,
                  class: vue.normalizeClass([
                    vue.unref(ns).be("spinner", "item"),
                    vue.unref(ns).is("active", key === vue.unref(timePartials)[item]),
                    vue.unref(ns).is("disabled", disabled)
                  ]),
                  onClick: ($event) => handleClick(item, { value: key, disabled })
                }, [
                  item === "hours" ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                    vue.createTextVNode(vue.toDisplayString(("0" + (_ctx.amPmMode ? key % 12 || 12 : key)).slice(-2)) + vue.toDisplayString(getAmPmFlag(key)), 1)
                  ], 64)) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
                    vue.createTextVNode(vue.toDisplayString(("0" + key).slice(-2)), 1)
                  ], 64))
                ], 10, _hoisted_1);
              }), 128))
            ]),
            _: 2
          }, 1032, ["class", "view-class", "onMouseenter", "onMousemove"]);
        }), 128)) : vue.createCommentVNode("v-if", true),
        _ctx.arrowControl ? (vue.openBlock(true), vue.createElementBlock(vue.Fragment, { key: 1 }, vue.renderList(vue.unref(spinnerItems), (item) => {
          return vue.openBlock(), vue.createElementBlock("div", {
            key: item,
            class: vue.normalizeClass([vue.unref(ns).be("spinner", "wrapper"), vue.unref(ns).is("arrow")]),
            onMouseenter: ($event) => emitSelectRange(item)
          }, [
            vue.withDirectives((vue.openBlock(), vue.createBlock(vue.unref(index$2.ElIcon), {
              class: vue.normalizeClass(["arrow-up", vue.unref(ns).be("spinner", "arrow")])
            }, {
              default: vue.withCtx(() => [
                vue.createVNode(vue.unref(iconsVue.ArrowUp))
              ]),
              _: 1
            }, 8, ["class"])), [
              [vue.unref(index$3.vRepeatClick), onDecrement]
            ]),
            vue.withDirectives((vue.openBlock(), vue.createBlock(vue.unref(index$2.ElIcon), {
              class: vue.normalizeClass(["arrow-down", vue.unref(ns).be("spinner", "arrow")])
            }, {
              default: vue.withCtx(() => [
                vue.createVNode(vue.unref(iconsVue.ArrowDown))
              ]),
              _: 1
            }, 8, ["class"])), [
              [vue.unref(index$3.vRepeatClick), onIncrement]
            ]),
            vue.createElementVNode("ul", {
              class: vue.normalizeClass(vue.unref(ns).be("spinner", "list"))
            }, [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(arrowControlTimeList)[item], (time, key) => {
                return vue.openBlock(), vue.createElementBlock("li", {
                  key,
                  class: vue.normalizeClass([
                    vue.unref(ns).be("spinner", "item"),
                    vue.unref(ns).is("active", time === vue.unref(timePartials)[item]),
                    vue.unref(ns).is("disabled", vue.unref(timeList)[item][time])
                  ])
                }, [
                  typeof time === "number" ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                    item === "hours" ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                      vue.createTextVNode(vue.toDisplayString(("0" + (_ctx.amPmMode ? time % 12 || 12 : time)).slice(-2)) + vue.toDisplayString(getAmPmFlag(time)), 1)
                    ], 64)) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
                      vue.createTextVNode(vue.toDisplayString(("0" + time).slice(-2)), 1)
                    ], 64))
                  ], 64)) : vue.createCommentVNode("v-if", true)
                ], 2);
              }), 128))
            ], 2)
          ], 42, _hoisted_2);
        }), 128)) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var TimeSpinner = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/time-picker/src/time-picker-com/basic-time-spinner.vue"]]);

exports["default"] = TimeSpinner;
//# sourceMappingURL=basic-time-spinner.js.map
