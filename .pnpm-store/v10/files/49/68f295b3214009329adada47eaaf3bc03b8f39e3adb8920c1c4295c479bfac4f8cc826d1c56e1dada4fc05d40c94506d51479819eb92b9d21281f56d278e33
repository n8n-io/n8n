'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var index$1 = require('../../select/index.js');
require('../../../hooks/index.js');
require('../../../constants/index.js');
var index = require('../../../hooks/use-namespace/index.js');
var event = require('../../../constants/event.js');

const useSelect = (props, { attrs, emit }, {
  tree,
  key
}) => {
  const ns = index.useNamespace("tree-select");
  const result = {
    ...lodashUnified.pick(vue.toRefs(props), Object.keys(index$1.ElSelect.props)),
    ...attrs,
    "onUpdate:modelValue": (value) => emit(event.UPDATE_MODEL_EVENT, value),
    valueKey: key,
    popperClass: vue.computed(() => {
      const classes = [ns.e("popper")];
      if (props.popperClass)
        classes.push(props.popperClass);
      return classes.join(" ");
    }),
    filterMethod: (keyword = "") => {
      if (props.filterMethod)
        props.filterMethod(keyword);
      vue.nextTick(() => {
        var _a;
        (_a = tree.value) == null ? void 0 : _a.filter(keyword);
      });
    },
    onVisibleChange: (visible) => {
      var _a;
      (_a = attrs.onVisibleChange) == null ? void 0 : _a.call(attrs, visible);
      if (props.filterable && visible) {
        result.filterMethod();
      }
    }
  };
  return result;
};

exports.useSelect = useSelect;
//# sourceMappingURL=select.js.map
