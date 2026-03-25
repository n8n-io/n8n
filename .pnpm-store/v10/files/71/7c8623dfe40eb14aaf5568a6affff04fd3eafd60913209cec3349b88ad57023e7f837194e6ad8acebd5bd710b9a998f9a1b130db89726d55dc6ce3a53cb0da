'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../constants/index.js');
var usePropsAlias = require('./use-props-alias.js');
var event = require('../../../../constants/event.js');

const useMove = (props, checkedState, emit) => {
  const propsAlias = usePropsAlias.usePropsAlias(props);
  const _emit = (value, direction, movedKeys) => {
    emit(event.UPDATE_MODEL_EVENT, value);
    emit(event.CHANGE_EVENT, value, direction, movedKeys);
  };
  const addToLeft = () => {
    const currentValue = props.modelValue.slice();
    checkedState.rightChecked.forEach((item) => {
      const index = currentValue.indexOf(item);
      if (index > -1) {
        currentValue.splice(index, 1);
      }
    });
    _emit(currentValue, "left", checkedState.rightChecked);
  };
  const addToRight = () => {
    let currentValue = props.modelValue.slice();
    const itemsToBeMoved = props.data.filter((item) => {
      const itemKey = item[propsAlias.value.key];
      return checkedState.leftChecked.includes(itemKey) && !props.modelValue.includes(itemKey);
    }).map((item) => item[propsAlias.value.key]);
    currentValue = props.targetOrder === "unshift" ? itemsToBeMoved.concat(currentValue) : currentValue.concat(itemsToBeMoved);
    if (props.targetOrder === "original") {
      currentValue = props.data.filter((item) => currentValue.includes(item[propsAlias.value.key])).map((item) => item[propsAlias.value.key]);
    }
    _emit(currentValue, "right", checkedState.leftChecked);
  };
  return {
    addToLeft,
    addToRight
  };
};

exports.useMove = useMove;
//# sourceMappingURL=use-move.js.map
