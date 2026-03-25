'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../constants/index.js');
var constants = require('../constants.js');
var types = require('../../../../utils/types.js');
var shared = require('@vue/shared');
var event = require('../../../../constants/event.js');

const useCheckboxModel = (props) => {
  const selfModel = vue.ref(false);
  const { emit } = vue.getCurrentInstance();
  const checkboxGroup = vue.inject(constants.checkboxGroupContextKey, void 0);
  const isGroup = vue.computed(() => types.isUndefined(checkboxGroup) === false);
  const isLimitExceeded = vue.ref(false);
  const model = vue.computed({
    get() {
      var _a, _b;
      return isGroup.value ? (_a = checkboxGroup == null ? void 0 : checkboxGroup.modelValue) == null ? void 0 : _a.value : (_b = props.modelValue) != null ? _b : selfModel.value;
    },
    set(val) {
      var _a, _b;
      if (isGroup.value && shared.isArray(val)) {
        isLimitExceeded.value = ((_a = checkboxGroup == null ? void 0 : checkboxGroup.max) == null ? void 0 : _a.value) !== void 0 && val.length > (checkboxGroup == null ? void 0 : checkboxGroup.max.value);
        isLimitExceeded.value === false && ((_b = checkboxGroup == null ? void 0 : checkboxGroup.changeEvent) == null ? void 0 : _b.call(checkboxGroup, val));
      } else {
        emit(event.UPDATE_MODEL_EVENT, val);
        selfModel.value = val;
      }
    }
  });
  return {
    model,
    isGroup,
    isLimitExceeded
  };
};

exports.useCheckboxModel = useCheckboxModel;
//# sourceMappingURL=use-checkbox-model.js.map
