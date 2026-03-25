'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const useMarks = (props) => {
  return vue.computed(() => {
    if (!props.marks) {
      return [];
    }
    const marksKeys = Object.keys(props.marks);
    return marksKeys.map(Number.parseFloat).sort((a, b) => a - b).filter((point) => point <= props.max && point >= props.min).map((point) => ({
      point,
      position: (point - props.min) * 100 / (props.max - props.min),
      mark: props.marks[point]
    }));
  });
};

exports.useMarks = useMarks;
//# sourceMappingURL=use-marks.js.map
