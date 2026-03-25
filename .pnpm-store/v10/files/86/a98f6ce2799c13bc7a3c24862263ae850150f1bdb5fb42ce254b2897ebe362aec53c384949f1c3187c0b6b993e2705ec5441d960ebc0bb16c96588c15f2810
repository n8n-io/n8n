'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../constants/index.js');
require('../../form/index.js');
var constants = require('./constants.js');
var event = require('../../../constants/event.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');

const useRadio = (props, emit) => {
  const radioRef = vue.ref();
  const radioGroup = vue.inject(constants.radioGroupKey, void 0);
  const isGroup = vue.computed(() => !!radioGroup);
  const modelValue = vue.computed({
    get() {
      return isGroup.value ? radioGroup.modelValue : props.modelValue;
    },
    set(val) {
      if (isGroup.value) {
        radioGroup.changeEvent(val);
      } else {
        emit && emit(event.UPDATE_MODEL_EVENT, val);
      }
      radioRef.value.checked = props.modelValue === props.label;
    }
  });
  const size = useFormCommonProps.useFormSize(vue.computed(() => radioGroup == null ? void 0 : radioGroup.size));
  const disabled = useFormCommonProps.useFormDisabled(vue.computed(() => radioGroup == null ? void 0 : radioGroup.disabled));
  const focus = vue.ref(false);
  const tabIndex = vue.computed(() => {
    return disabled.value || isGroup.value && modelValue.value !== props.label ? -1 : 0;
  });
  return {
    radioRef,
    isGroup,
    radioGroup,
    focus,
    size,
    disabled,
    tabIndex,
    modelValue
  };
};

exports.useRadio = useRadio;
//# sourceMappingURL=use-radio.js.map
