import { computed } from 'vue';

const useMarks = (props) => {
  return computed(() => {
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

export { useMarks };
//# sourceMappingURL=use-marks.mjs.map
