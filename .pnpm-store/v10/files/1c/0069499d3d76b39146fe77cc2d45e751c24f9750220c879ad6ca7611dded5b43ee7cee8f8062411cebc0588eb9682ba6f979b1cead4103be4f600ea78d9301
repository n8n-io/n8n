'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../form/index.js');
require('../../../../utils/index.js');
var useCheckboxDisabled = require('./use-checkbox-disabled.js');
var useCheckboxEvent = require('./use-checkbox-event.js');
var useCheckboxModel = require('./use-checkbox-model.js');
var useCheckboxStatus = require('./use-checkbox-status.js');
var shared = require('@vue/shared');
var useFormItem = require('../../../form/src/hooks/use-form-item.js');

const setStoreValue = (props, { model }) => {
  function addToStore() {
    if (shared.isArray(model.value) && !model.value.includes(props.label)) {
      model.value.push(props.label);
    } else {
      model.value = props.trueLabel || true;
    }
  }
  props.checked && addToStore();
};
const useCheckbox = (props, slots) => {
  const { formItem: elFormItem } = useFormItem.useFormItem();
  const { model, isGroup, isLimitExceeded } = useCheckboxModel.useCheckboxModel(props);
  const {
    isFocused,
    isChecked,
    checkboxButtonSize,
    checkboxSize,
    hasOwnLabel
  } = useCheckboxStatus.useCheckboxStatus(props, slots, { model });
  const { isDisabled } = useCheckboxDisabled.useCheckboxDisabled({ model, isChecked });
  const { inputId, isLabeledByFormItem } = useFormItem.useFormItemInputId(props, {
    formItemContext: elFormItem,
    disableIdGeneration: hasOwnLabel,
    disableIdManagement: isGroup
  });
  const { handleChange, onClickRoot } = useCheckboxEvent.useCheckboxEvent(props, {
    model,
    isLimitExceeded,
    hasOwnLabel,
    isDisabled,
    isLabeledByFormItem
  });
  setStoreValue(props, { model });
  return {
    inputId,
    isLabeledByFormItem,
    isChecked,
    isDisabled,
    isFocused,
    checkboxButtonSize,
    checkboxSize,
    hasOwnLabel,
    model,
    handleChange,
    onClickRoot
  };
};

exports.useCheckbox = useCheckbox;
//# sourceMappingURL=use-checkbox.js.map
