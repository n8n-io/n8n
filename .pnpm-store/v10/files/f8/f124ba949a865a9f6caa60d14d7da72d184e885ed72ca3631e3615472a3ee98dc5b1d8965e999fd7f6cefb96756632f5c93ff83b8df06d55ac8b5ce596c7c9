'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function useOption(props, { emit }) {
  return {
    hoverItem: () => {
      if (!props.disabled) {
        emit("hover", props.index);
      }
    },
    selectOptionClick: () => {
      if (!props.disabled) {
        emit("select", props.item, props.index);
      }
    }
  };
}

exports.useOption = useOption;
//# sourceMappingURL=useOption.js.map
