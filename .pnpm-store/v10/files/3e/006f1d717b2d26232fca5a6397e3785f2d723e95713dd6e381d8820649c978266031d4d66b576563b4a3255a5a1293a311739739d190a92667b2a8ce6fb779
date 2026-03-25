'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var useProps = require('./useProps.js');

function useAllowCreate(props, states) {
  const { aliasProps, getLabel, getValue } = useProps.useProps(props);
  const createOptionCount = vue.ref(0);
  const cachedSelectedOption = vue.ref(null);
  const enableAllowCreateMode = vue.computed(() => {
    return props.allowCreate && props.filterable;
  });
  function hasExistingOption(query) {
    const hasValue = (option) => getValue(option) === query;
    return props.options && props.options.some(hasValue) || states.createdOptions.some(hasValue);
  }
  function selectNewOption(option) {
    if (!enableAllowCreateMode.value) {
      return;
    }
    if (props.multiple && option.created) {
      createOptionCount.value++;
    } else {
      cachedSelectedOption.value = option;
    }
  }
  function createNewOption(query) {
    if (enableAllowCreateMode.value) {
      if (query && query.length > 0 && !hasExistingOption(query)) {
        const newOption = {
          [aliasProps.value.value]: query,
          [aliasProps.value.label]: query,
          created: true,
          [aliasProps.value.disabled]: false
        };
        if (states.createdOptions.length >= createOptionCount.value) {
          states.createdOptions[createOptionCount.value] = newOption;
        } else {
          states.createdOptions.push(newOption);
        }
      } else {
        if (props.multiple) {
          states.createdOptions.length = createOptionCount.value;
        } else {
          const selectedOption = cachedSelectedOption.value;
          states.createdOptions.length = 0;
          if (selectedOption && selectedOption.created) {
            states.createdOptions.push(selectedOption);
          }
        }
      }
    }
  }
  function removeNewOption(option) {
    if (!enableAllowCreateMode.value || !option || !option.created || option.created && props.reserveKeyword && states.inputValue === getLabel(option)) {
      return;
    }
    const idx = states.createdOptions.findIndex((it) => getValue(it) === getValue(option));
    if (~idx) {
      states.createdOptions.splice(idx, 1);
      createOptionCount.value--;
    }
  }
  function clearAllNewOption() {
    if (enableAllowCreateMode.value) {
      states.createdOptions.length = 0;
      createOptionCount.value = 0;
    }
  }
  return {
    createNewOption,
    removeNewOption,
    selectNewOption,
    clearAllNewOption
  };
}

exports.useAllowCreate = useAllowCreate;
//# sourceMappingURL=useAllowCreate.js.map
