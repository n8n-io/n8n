'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index = require('../../statistic/index.js');
require('../../../utils/index.js');
var countdown = require('./countdown.js');
var utils = require('./utils.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var raf = require('../../../utils/raf.js');

const __default__ = vue.defineComponent({
  name: "ElCountdown"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: countdown.countdownProps,
  emits: countdown.countdownEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    let timer;
    const rawValue = vue.ref(utils.getTime(props.value) - Date.now());
    const displayValue = vue.computed(() => utils.formatTime(rawValue.value, props.format));
    const formatter = (val) => utils.formatTime(val, props.format);
    const stopTimer = () => {
      if (timer) {
        raf.cAF(timer);
        timer = void 0;
      }
    };
    const startTimer = () => {
      const timestamp = utils.getTime(props.value);
      const frameFunc = () => {
        let diff = timestamp - Date.now();
        emit("change", diff);
        if (diff <= 0) {
          diff = 0;
          stopTimer();
          emit("finish");
        } else {
          timer = raf.rAF(frameFunc);
        }
        rawValue.value = diff;
      };
      timer = raf.rAF(frameFunc);
    };
    vue.watch(() => [props.value, props.format], () => {
      stopTimer();
      startTimer();
    }, {
      immediate: true
    });
    vue.onBeforeUnmount(() => {
      stopTimer();
    });
    expose({
      displayValue
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(index.ElStatistic), {
        value: rawValue.value,
        title: _ctx.title,
        prefix: _ctx.prefix,
        suffix: _ctx.suffix,
        "value-style": _ctx.valueStyle,
        formatter
      }, vue.createSlots({ _: 2 }, [
        vue.renderList(_ctx.$slots, (_, name) => {
          return {
            name,
            fn: vue.withCtx(() => [
              vue.renderSlot(_ctx.$slots, name)
            ])
          };
        })
      ]), 1032, ["value", "title", "prefix", "suffix", "value-style"]);
    };
  }
});
var Countdown = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/countdown/src/countdown.vue"]]);

exports["default"] = Countdown;
//# sourceMappingURL=countdown2.js.map
