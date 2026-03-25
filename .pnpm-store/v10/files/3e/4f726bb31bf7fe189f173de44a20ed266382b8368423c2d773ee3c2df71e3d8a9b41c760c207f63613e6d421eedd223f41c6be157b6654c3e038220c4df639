'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../constants/index.js');
require('../../../../utils/index.js');
var event = require('../../../../constants/event.js');
var error = require('../../../../utils/error.js');

const useWatch = (props, initData, minValue, maxValue, emit, elFormItem) => {
  const _emit = (val) => {
    emit(event.UPDATE_MODEL_EVENT, val);
    emit(event.INPUT_EVENT, val);
  };
  const valueChanged = () => {
    if (props.range) {
      return ![minValue.value, maxValue.value].every((item, index) => item === initData.oldValue[index]);
    } else {
      return props.modelValue !== initData.oldValue;
    }
  };
  const setValues = () => {
    var _a, _b;
    if (props.min > props.max) {
      error.throwError("Slider", "min should not be greater than max.");
    }
    const val = props.modelValue;
    if (props.range && Array.isArray(val)) {
      if (val[1] < props.min) {
        _emit([props.min, props.min]);
      } else if (val[0] > props.max) {
        _emit([props.max, props.max]);
      } else if (val[0] < props.min) {
        _emit([props.min, val[1]]);
      } else if (val[1] > props.max) {
        _emit([val[0], props.max]);
      } else {
        initData.firstValue = val[0];
        initData.secondValue = val[1];
        if (valueChanged()) {
          if (props.validateEvent) {
            (_a = elFormItem == null ? void 0 : elFormItem.validate) == null ? void 0 : _a.call(elFormItem, "change").catch((err) => error.debugWarn(err));
          }
          initData.oldValue = val.slice();
        }
      }
    } else if (!props.range && typeof val === "number" && !Number.isNaN(val)) {
      if (val < props.min) {
        _emit(props.min);
      } else if (val > props.max) {
        _emit(props.max);
      } else {
        initData.firstValue = val;
        if (valueChanged()) {
          if (props.validateEvent) {
            (_b = elFormItem == null ? void 0 : elFormItem.validate) == null ? void 0 : _b.call(elFormItem, "change").catch((err) => error.debugWarn(err));
          }
          initData.oldValue = val;
        }
      }
    }
  };
  setValues();
  vue.watch(() => initData.dragging, (val) => {
    if (!val) {
      setValues();
    }
  });
  vue.watch(() => props.modelValue, (val, oldVal) => {
    if (initData.dragging || Array.isArray(val) && Array.isArray(oldVal) && val.every((item, index) => item === oldVal[index]) && initData.firstValue === val[0] && initData.secondValue === val[1]) {
      return;
    }
    setValues();
  }, {
    deep: true
  });
  vue.watch(() => [props.min, props.max], () => {
    setValues();
  });
};

exports.useWatch = useWatch;
//# sourceMappingURL=use-watch.js.map
