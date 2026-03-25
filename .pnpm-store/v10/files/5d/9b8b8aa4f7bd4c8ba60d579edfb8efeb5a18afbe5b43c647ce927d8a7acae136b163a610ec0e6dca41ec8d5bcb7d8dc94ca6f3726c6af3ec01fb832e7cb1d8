'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
require('../../../constants/index.js');
var constants = require('./constants.js');
var lodashUnified = require('lodash-unified');
var event = require('../../../constants/event.js');
var index = require('../../../hooks/use-namespace/index.js');

const useCollapse = (props, emit) => {
  const activeNames = vue.ref(lodashUnified.castArray(props.modelValue));
  const setActiveNames = (_activeNames) => {
    activeNames.value = _activeNames;
    const value = props.accordion ? activeNames.value[0] : activeNames.value;
    emit(event.UPDATE_MODEL_EVENT, value);
    emit(event.CHANGE_EVENT, value);
  };
  const handleItemClick = (name) => {
    if (props.accordion) {
      setActiveNames([activeNames.value[0] === name ? "" : name]);
    } else {
      const _activeNames = [...activeNames.value];
      const index = _activeNames.indexOf(name);
      if (index > -1) {
        _activeNames.splice(index, 1);
      } else {
        _activeNames.push(name);
      }
      setActiveNames(_activeNames);
    }
  };
  vue.watch(() => props.modelValue, () => activeNames.value = lodashUnified.castArray(props.modelValue), { deep: true });
  vue.provide(constants.collapseContextKey, {
    activeNames,
    handleItemClick
  });
  return {
    activeNames,
    setActiveNames
  };
};
const useCollapseDOM = () => {
  const ns = index.useNamespace("collapse");
  const rootKls = vue.computed(() => ns.b());
  return {
    rootKls
  };
};

exports.useCollapse = useCollapse;
exports.useCollapseDOM = useCollapseDOM;
//# sourceMappingURL=use-collapse.js.map
