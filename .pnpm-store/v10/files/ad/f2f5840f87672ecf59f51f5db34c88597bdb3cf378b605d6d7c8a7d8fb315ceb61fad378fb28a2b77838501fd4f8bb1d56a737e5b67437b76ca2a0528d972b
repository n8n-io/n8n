'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../utils/index.js');
var shared = require('@vue/shared');

const REPEAT_INTERVAL = 100;
const REPEAT_DELAY = 600;
const vRepeatClick = {
  beforeMount(el, binding) {
    const value = binding.value;
    const { interval = REPEAT_INTERVAL, delay = REPEAT_DELAY } = shared.isFunction(value) ? {} : value;
    let intervalId;
    let delayId;
    const handler = () => shared.isFunction(value) ? value() : value.handler();
    const clear = () => {
      if (delayId) {
        clearTimeout(delayId);
        delayId = void 0;
      }
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = void 0;
      }
    };
    el.addEventListener("mousedown", (evt) => {
      if (evt.button !== 0)
        return;
      clear();
      handler();
      document.addEventListener("mouseup", () => clear(), {
        once: true
      });
      delayId = setTimeout(() => {
        intervalId = setInterval(() => {
          handler();
        }, interval);
      }, delay);
    });
  }
};

exports.REPEAT_DELAY = REPEAT_DELAY;
exports.REPEAT_INTERVAL = REPEAT_INTERVAL;
exports.vRepeatClick = vRepeatClick;
//# sourceMappingURL=index.js.map
