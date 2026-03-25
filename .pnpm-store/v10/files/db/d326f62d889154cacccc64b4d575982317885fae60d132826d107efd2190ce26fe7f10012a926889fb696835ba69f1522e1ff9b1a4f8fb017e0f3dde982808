'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../form/index.js');
require('../../../../utils/index.js');
var constants = require('../constants.js');
var useFormItem = require('../../../form/src/hooks/use-form-item.js');
var error = require('../../../../utils/error.js');

const useCheckboxEvent = (props, {
  model,
  isLimitExceeded,
  hasOwnLabel,
  isDisabled,
  isLabeledByFormItem
}) => {
  const checkboxGroup = vue.inject(constants.checkboxGroupContextKey, void 0);
  const { formItem } = useFormItem.useFormItem();
  const { emit } = vue.getCurrentInstance();
  function getLabeledValue(value) {
    var _a, _b;
    return value === props.trueLabel || value === true ? (_a = props.trueLabel) != null ? _a : true : (_b = props.falseLabel) != null ? _b : false;
  }
  function emitChangeEvent(checked, e) {
    emit("change", getLabeledValue(checked), e);
  }
  function handleChange(e) {
    if (isLimitExceeded.value)
      return;
    const target = e.target;
    emit("change", getLabeledValue(target.checked), e);
  }
  async function onClickRoot(e) {
    if (isLimitExceeded.value)
      return;
    if (!hasOwnLabel.value && !isDisabled.value && isLabeledByFormItem.value) {
      const eventTargets = e.composedPath();
      const hasLabel = eventTargets.some((item) => item.tagName === "LABEL");
      if (!hasLabel) {
        model.value = getLabeledValue([false, props.falseLabel].includes(model.value));
        await vue.nextTick();
        emitChangeEvent(model.value, e);
      }
    }
  }
  const validateEvent = vue.computed(() => (checkboxGroup == null ? void 0 : checkboxGroup.validateEvent) || props.validateEvent);
  vue.watch(() => props.modelValue, () => {
    if (validateEvent.value) {
      formItem == null ? void 0 : formItem.validate("change").catch((err) => error.debugWarn(err));
    }
  });
  return {
    handleChange,
    onClickRoot
  };
};

exports.useCheckboxEvent = useCheckboxEvent;
//# sourceMappingURL=use-checkbox-event.js.map
