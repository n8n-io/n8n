'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var error = require('../../../../utils/error.js');

const useStops = (props, initData, minValue, maxValue) => {
  const stops = vue.computed(() => {
    if (!props.showStops || props.min > props.max)
      return [];
    if (props.step === 0) {
      error.debugWarn("ElSlider", "step should not be 0.");
      return [];
    }
    const stopCount = (props.max - props.min) / props.step;
    const stepWidth = 100 * props.step / (props.max - props.min);
    const result = Array.from({ length: stopCount - 1 }).map((_, index) => (index + 1) * stepWidth);
    if (props.range) {
      return result.filter((step) => {
        return step < 100 * (minValue.value - props.min) / (props.max - props.min) || step > 100 * (maxValue.value - props.min) / (props.max - props.min);
      });
    } else {
      return result.filter((step) => step > 100 * (initData.firstValue - props.min) / (props.max - props.min));
    }
  });
  const getStopStyle = (position) => {
    return props.vertical ? { bottom: `${position}%` } : { left: `${position}%` };
  };
  return {
    stops,
    getStopStyle
  };
};

exports.useStops = useStops;
//# sourceMappingURL=use-stops.js.map
