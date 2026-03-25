import '../../../form/index.mjs';
import '../../../../utils/index.mjs';
import { useCheckboxDisabled } from './use-checkbox-disabled.mjs';
import { useCheckboxEvent } from './use-checkbox-event.mjs';
import { useCheckboxModel } from './use-checkbox-model.mjs';
import { useCheckboxStatus } from './use-checkbox-status.mjs';
import { isArray } from '@vue/shared';
import { useFormItem, useFormItemInputId } from '../../../form/src/hooks/use-form-item.mjs';

const setStoreValue = (props, { model }) => {
  function addToStore() {
    if (isArray(model.value) && !model.value.includes(props.label)) {
      model.value.push(props.label);
    } else {
      model.value = props.trueLabel || true;
    }
  }
  props.checked && addToStore();
};
const useCheckbox = (props, slots) => {
  const { formItem: elFormItem } = useFormItem();
  const { model, isGroup, isLimitExceeded } = useCheckboxModel(props);
  const {
    isFocused,
    isChecked,
    checkboxButtonSize,
    checkboxSize,
    hasOwnLabel
  } = useCheckboxStatus(props, slots, { model });
  const { isDisabled } = useCheckboxDisabled({ model, isChecked });
  const { inputId, isLabeledByFormItem } = useFormItemInputId(props, {
    formItemContext: elFormItem,
    disableIdGeneration: hasOwnLabel,
    disableIdManagement: isGroup
  });
  const { handleChange, onClickRoot } = useCheckboxEvent(props, {
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

export { useCheckbox };
//# sourceMappingURL=use-checkbox.mjs.map
