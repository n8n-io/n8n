'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var shared = require('@vue/shared');
var lodashUnified = require('lodash-unified');
var core = require('@vueuse/core');
require('../../../hooks/index.js');
require('../../../constants/index.js');
require('../../../utils/index.js');
require('../../form/index.js');
var iconsVue = require('@element-plus/icons-vue');
var useAllowCreate = require('./useAllowCreate.js');
var useInput = require('./useInput.js');
var useProps = require('./useProps.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var icon = require('../../../utils/vue/icon.js');
var strings = require('../../../utils/strings.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var event = require('../../../constants/event.js');
var error = require('../../../utils/error.js');

const DEFAULT_INPUT_PLACEHOLDER = "";
const MINIMUM_INPUT_WIDTH = 11;
const TAG_BASE_WIDTH = {
  larget: 51,
  default: 42,
  small: 33
};
const useSelect = (props, emit) => {
  const { t } = index.useLocale();
  const nsSelectV2 = index$1.useNamespace("select-v2");
  const nsInput = index$1.useNamespace("input");
  const { form: elForm, formItem: elFormItem } = useFormItem.useFormItem();
  const { getLabel, getValue, getDisabled, getOptions } = useProps.useProps(props);
  const states = vue.reactive({
    inputValue: DEFAULT_INPUT_PLACEHOLDER,
    displayInputValue: DEFAULT_INPUT_PLACEHOLDER,
    calculatedWidth: 0,
    cachedPlaceholder: "",
    cachedOptions: [],
    createdOptions: [],
    createdLabel: "",
    createdSelected: false,
    currentPlaceholder: "",
    hoveringIndex: -1,
    comboBoxHovering: false,
    isOnComposition: false,
    isSilentBlur: false,
    isComposing: false,
    inputLength: 20,
    selectWidth: 200,
    initialInputHeight: 0,
    previousQuery: null,
    previousValue: void 0,
    query: "",
    selectedLabel: "",
    softFocus: false,
    tagInMultiLine: false
  });
  const selectedIndex = vue.ref(-1);
  const popperSize = vue.ref(-1);
  const controlRef = vue.ref(null);
  const inputRef = vue.ref(null);
  const menuRef = vue.ref(null);
  const popper = vue.ref(null);
  const selectRef = vue.ref(null);
  const selectionRef = vue.ref(null);
  const calculatorRef = vue.ref(null);
  const expanded = vue.ref(false);
  const selectDisabled = vue.computed(() => props.disabled || (elForm == null ? void 0 : elForm.disabled));
  const popupHeight = vue.computed(() => {
    const totalHeight = filteredOptions.value.length * 34;
    return totalHeight > props.height ? props.height : totalHeight;
  });
  const hasModelValue = vue.computed(() => {
    return !lodashUnified.isNil(props.modelValue);
  });
  const showClearBtn = vue.computed(() => {
    const hasValue = props.multiple ? Array.isArray(props.modelValue) && props.modelValue.length > 0 : hasModelValue.value;
    const criteria = props.clearable && !selectDisabled.value && states.comboBoxHovering && hasValue;
    return criteria;
  });
  const iconComponent = vue.computed(() => props.remote && props.filterable ? "" : iconsVue.ArrowUp);
  const iconReverse = vue.computed(() => iconComponent.value && nsSelectV2.is("reverse", expanded.value));
  const validateState = vue.computed(() => (elFormItem == null ? void 0 : elFormItem.validateState) || "");
  const validateIcon = vue.computed(() => icon.ValidateComponentsMap[validateState.value]);
  const debounce = vue.computed(() => props.remote ? 300 : 0);
  const emptyText = vue.computed(() => {
    const options = filteredOptions.value;
    if (props.loading) {
      return props.loadingText || t("el.select.loading");
    } else {
      if (props.remote && states.inputValue === "" && options.length === 0)
        return false;
      if (props.filterable && states.inputValue && options.length > 0) {
        return props.noMatchText || t("el.select.noMatch");
      }
      if (options.length === 0) {
        return props.noDataText || t("el.select.noData");
      }
    }
    return null;
  });
  const filteredOptions = vue.computed(() => {
    const isValidOption = (o) => {
      const query = states.inputValue;
      const regexp = new RegExp(strings.escapeStringRegexp(query), "i");
      const containsQueryString = query ? regexp.test(getLabel(o) || "") : true;
      return containsQueryString;
    };
    if (props.loading) {
      return [];
    }
    return [...props.options, ...states.createdOptions].reduce((all, item) => {
      const options = getOptions(item);
      if (shared.isArray(options)) {
        const filtered = options.filter(isValidOption);
        if (filtered.length > 0) {
          all.push({
            label: getLabel(item),
            isTitle: true,
            type: "Group"
          }, ...filtered, { type: "Group" });
        }
      } else if (props.remote || isValidOption(item)) {
        all.push(item);
      }
      return all;
    }, []);
  });
  const filteredOptionsValueMap = vue.computed(() => {
    const valueMap = /* @__PURE__ */ new Map();
    filteredOptions.value.forEach((option, index) => {
      valueMap.set(getValueKey(getValue(option)), { option, index });
    });
    return valueMap;
  });
  const optionsAllDisabled = vue.computed(() => filteredOptions.value.every((option) => getDisabled(option)));
  const selectSize = useFormCommonProps.useFormSize();
  const collapseTagSize = vue.computed(() => selectSize.value === "small" ? "small" : "default");
  const tagMaxWidth = vue.computed(() => {
    const select = selectionRef.value;
    const size = collapseTagSize.value || "default";
    const paddingLeft = select ? Number.parseInt(getComputedStyle(select).paddingLeft) : 0;
    const paddingRight = select ? Number.parseInt(getComputedStyle(select).paddingRight) : 0;
    return states.selectWidth - paddingRight - paddingLeft - TAG_BASE_WIDTH[size];
  });
  const calculatePopperSize = () => {
    var _a;
    popperSize.value = ((_a = selectRef.value) == null ? void 0 : _a.offsetWidth) || 200;
  };
  const inputWrapperStyle = vue.computed(() => {
    return {
      width: `${states.calculatedWidth === 0 ? MINIMUM_INPUT_WIDTH : Math.ceil(states.calculatedWidth) + MINIMUM_INPUT_WIDTH}px`
    };
  });
  const shouldShowPlaceholder = vue.computed(() => {
    if (shared.isArray(props.modelValue)) {
      return props.modelValue.length === 0 && !states.displayInputValue;
    }
    return props.filterable ? states.displayInputValue.length === 0 : true;
  });
  const currentPlaceholder = vue.computed(() => {
    const _placeholder = props.placeholder || t("el.select.placeholder");
    return props.multiple || lodashUnified.isNil(props.modelValue) ? _placeholder : states.selectedLabel;
  });
  const popperRef = vue.computed(() => {
    var _a, _b;
    return (_b = (_a = popper.value) == null ? void 0 : _a.popperRef) == null ? void 0 : _b.contentRef;
  });
  const indexRef = vue.computed(() => {
    if (props.multiple) {
      const len = props.modelValue.length;
      if (props.modelValue.length > 0 && filteredOptionsValueMap.value.has(props.modelValue[len - 1])) {
        const { index } = filteredOptionsValueMap.value.get(props.modelValue[len - 1]);
        return index;
      }
    } else {
      if (props.modelValue && filteredOptionsValueMap.value.has(props.modelValue)) {
        const { index } = filteredOptionsValueMap.value.get(props.modelValue);
        return index;
      }
    }
    return -1;
  });
  const dropdownMenuVisible = vue.computed({
    get() {
      return expanded.value && emptyText.value !== false;
    },
    set(val) {
      expanded.value = val;
    }
  });
  const showTagList = vue.computed(() => states.cachedOptions.slice(0, props.maxCollapseTags));
  const collapseTagList = vue.computed(() => states.cachedOptions.slice(props.maxCollapseTags));
  const {
    createNewOption,
    removeNewOption,
    selectNewOption,
    clearAllNewOption
  } = useAllowCreate.useAllowCreate(props, states);
  const {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd
  } = useInput.useInput((e) => onInput(e));
  const focusAndUpdatePopup = () => {
    var _a, _b, _c;
    (_b = (_a = inputRef.value) == null ? void 0 : _a.focus) == null ? void 0 : _b.call(_a);
    (_c = popper.value) == null ? void 0 : _c.updatePopper();
  };
  const toggleMenu = () => {
    if (props.automaticDropdown)
      return;
    if (!selectDisabled.value) {
      if (states.isComposing)
        states.softFocus = true;
      return vue.nextTick(() => {
        var _a, _b;
        expanded.value = !expanded.value;
        (_b = (_a = inputRef.value) == null ? void 0 : _a.focus) == null ? void 0 : _b.call(_a);
      });
    }
  };
  const onInputChange = () => {
    if (props.filterable && states.inputValue !== states.selectedLabel) {
      states.query = states.selectedLabel;
    }
    handleQueryChange(states.inputValue);
    return vue.nextTick(() => {
      createNewOption(states.inputValue);
    });
  };
  const debouncedOnInputChange = lodashUnified.debounce(onInputChange, debounce.value);
  const handleQueryChange = (val) => {
    if (states.previousQuery === val) {
      return;
    }
    states.previousQuery = val;
    if (props.filterable && shared.isFunction(props.filterMethod)) {
      props.filterMethod(val);
    } else if (props.filterable && props.remote && shared.isFunction(props.remoteMethod)) {
      props.remoteMethod(val);
    }
  };
  const emitChange = (val) => {
    if (!lodashUnified.isEqual(props.modelValue, val)) {
      emit(event.CHANGE_EVENT, val);
    }
  };
  const update = (val) => {
    emit(event.UPDATE_MODEL_EVENT, val);
    emitChange(val);
    states.previousValue = String(val);
  };
  const getValueIndex = (arr = [], value) => {
    if (!shared.isObject(value)) {
      return arr.indexOf(value);
    }
    const valueKey = props.valueKey;
    let index = -1;
    arr.some((item, i) => {
      if (lodashUnified.get(item, valueKey) === lodashUnified.get(value, valueKey)) {
        index = i;
        return true;
      }
      return false;
    });
    return index;
  };
  const getValueKey = (item) => {
    return shared.isObject(item) ? lodashUnified.get(item, props.valueKey) : item;
  };
  const resetInputHeight = () => {
    return vue.nextTick(() => {
      var _a, _b;
      if (!inputRef.value)
        return;
      const selection = selectionRef.value;
      selectRef.value.height = selection.offsetHeight;
      if (expanded.value && emptyText.value !== false) {
        (_b = (_a = popper.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
      }
    });
  };
  const handleResize = () => {
    var _a, _b;
    resetInputWidth();
    calculatePopperSize();
    (_b = (_a = popper.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
    if (props.multiple) {
      return resetInputHeight();
    }
  };
  const resetInputWidth = () => {
    const select = selectionRef.value;
    if (select) {
      states.selectWidth = select.getBoundingClientRect().width;
    }
  };
  const onSelect = (option, idx, byClick = true) => {
    var _a, _b;
    if (props.multiple) {
      let selectedOptions = props.modelValue.slice();
      const index = getValueIndex(selectedOptions, getValue(option));
      if (index > -1) {
        selectedOptions = [
          ...selectedOptions.slice(0, index),
          ...selectedOptions.slice(index + 1)
        ];
        states.cachedOptions.splice(index, 1);
        removeNewOption(option);
      } else if (props.multipleLimit <= 0 || selectedOptions.length < props.multipleLimit) {
        selectedOptions = [...selectedOptions, getValue(option)];
        states.cachedOptions.push(option);
        selectNewOption(option);
        updateHoveringIndex(idx);
      }
      update(selectedOptions);
      if (option.created) {
        states.query = "";
        handleQueryChange("");
        states.inputLength = 20;
      }
      if (props.filterable && !props.reserveKeyword) {
        (_b = (_a = inputRef.value).focus) == null ? void 0 : _b.call(_a);
        onUpdateInputValue("");
      }
      if (props.filterable) {
        states.calculatedWidth = calculatorRef.value.getBoundingClientRect().width;
      }
      resetInputHeight();
      setSoftFocus();
    } else {
      selectedIndex.value = idx;
      states.selectedLabel = getLabel(option);
      update(getValue(option));
      expanded.value = false;
      states.isComposing = false;
      states.isSilentBlur = byClick;
      selectNewOption(option);
      if (!option.created) {
        clearAllNewOption();
      }
      updateHoveringIndex(idx);
    }
  };
  const deleteTag = (event, option) => {
    let selectedOptions = props.modelValue.slice();
    const index = getValueIndex(selectedOptions, getValue(option));
    if (index > -1 && !selectDisabled.value) {
      selectedOptions = [
        ...props.modelValue.slice(0, index),
        ...props.modelValue.slice(index + 1)
      ];
      states.cachedOptions.splice(index, 1);
      update(selectedOptions);
      emit("remove-tag", getValue(option));
      states.softFocus = true;
      removeNewOption(option);
      return vue.nextTick(focusAndUpdatePopup);
    }
    event.stopPropagation();
  };
  const handleFocus = (event) => {
    const focused = states.isComposing;
    states.isComposing = true;
    if (!states.softFocus) {
      if (!focused)
        emit("focus", event);
    } else {
      states.softFocus = false;
    }
  };
  const handleBlur = (event) => {
    states.softFocus = false;
    return vue.nextTick(() => {
      var _a, _b;
      (_b = (_a = inputRef.value) == null ? void 0 : _a.blur) == null ? void 0 : _b.call(_a);
      if (calculatorRef.value) {
        states.calculatedWidth = calculatorRef.value.getBoundingClientRect().width;
      }
      if (states.isSilentBlur) {
        states.isSilentBlur = false;
      } else {
        if (states.isComposing) {
          emit("blur", event);
        }
      }
      states.isComposing = false;
    });
  };
  const handleEsc = () => {
    if (states.displayInputValue.length > 0) {
      onUpdateInputValue("");
    } else {
      expanded.value = false;
    }
  };
  const handleDel = (e) => {
    if (states.displayInputValue.length === 0) {
      e.preventDefault();
      const selected = props.modelValue.slice();
      selected.pop();
      removeNewOption(states.cachedOptions.pop());
      update(selected);
    }
  };
  const handleClear = () => {
    let emptyValue;
    if (shared.isArray(props.modelValue)) {
      emptyValue = [];
    } else {
      emptyValue = void 0;
    }
    states.softFocus = true;
    if (props.multiple) {
      states.cachedOptions = [];
    } else {
      states.selectedLabel = "";
    }
    expanded.value = false;
    update(emptyValue);
    emit("clear");
    clearAllNewOption();
    return vue.nextTick(focusAndUpdatePopup);
  };
  const onUpdateInputValue = (val) => {
    states.displayInputValue = val;
    states.inputValue = val;
  };
  const onKeyboardNavigate = (direction, hoveringIndex = void 0) => {
    const options = filteredOptions.value;
    if (!["forward", "backward"].includes(direction) || selectDisabled.value || options.length <= 0 || optionsAllDisabled.value) {
      return;
    }
    if (!expanded.value) {
      return toggleMenu();
    }
    if (hoveringIndex === void 0) {
      hoveringIndex = states.hoveringIndex;
    }
    let newIndex = -1;
    if (direction === "forward") {
      newIndex = hoveringIndex + 1;
      if (newIndex >= options.length) {
        newIndex = 0;
      }
    } else if (direction === "backward") {
      newIndex = hoveringIndex - 1;
      if (newIndex < 0 || newIndex >= options.length) {
        newIndex = options.length - 1;
      }
    }
    const option = options[newIndex];
    if (getDisabled(option) || option.type === "Group") {
      return onKeyboardNavigate(direction, newIndex);
    } else {
      updateHoveringIndex(newIndex);
      scrollToItem(newIndex);
    }
  };
  const onKeyboardSelect = () => {
    if (!expanded.value) {
      return toggleMenu();
    } else if (~states.hoveringIndex && filteredOptions.value[states.hoveringIndex]) {
      onSelect(filteredOptions.value[states.hoveringIndex], states.hoveringIndex, false);
    }
  };
  const updateHoveringIndex = (idx) => {
    states.hoveringIndex = idx;
  };
  const resetHoveringIndex = () => {
    states.hoveringIndex = -1;
  };
  const setSoftFocus = () => {
    var _a;
    const _input = inputRef.value;
    if (_input) {
      (_a = _input.focus) == null ? void 0 : _a.call(_input);
    }
  };
  const onInput = (event) => {
    const value = event.target.value;
    onUpdateInputValue(value);
    if (states.displayInputValue.length > 0 && !expanded.value) {
      expanded.value = true;
    }
    states.calculatedWidth = calculatorRef.value.getBoundingClientRect().width;
    if (props.multiple) {
      resetInputHeight();
    }
    if (props.remote) {
      debouncedOnInputChange();
    } else {
      return onInputChange();
    }
  };
  const handleClickOutside = () => {
    expanded.value = false;
    return handleBlur();
  };
  const handleMenuEnter = () => {
    states.inputValue = states.displayInputValue;
    return vue.nextTick(() => {
      if (~indexRef.value) {
        updateHoveringIndex(indexRef.value);
        scrollToItem(states.hoveringIndex);
      }
    });
  };
  const scrollToItem = (index) => {
    menuRef.value.scrollToItem(index);
  };
  const initStates = () => {
    resetHoveringIndex();
    if (props.multiple) {
      if (props.modelValue.length > 0) {
        let initHovering = false;
        states.cachedOptions.length = 0;
        states.previousValue = props.modelValue.toString();
        for (const value of props.modelValue) {
          const selectValue = getValueKey(value);
          if (filteredOptionsValueMap.value.has(selectValue)) {
            const { index, option } = filteredOptionsValueMap.value.get(selectValue);
            states.cachedOptions.push(option);
            if (!initHovering) {
              updateHoveringIndex(index);
            }
            initHovering = true;
          }
        }
      } else {
        states.cachedOptions = [];
        states.previousValue = void 0;
      }
    } else {
      if (hasModelValue.value) {
        states.previousValue = props.modelValue;
        const options = filteredOptions.value;
        const selectedItemIndex = options.findIndex((option) => getValueKey(getValue(option)) === getValueKey(props.modelValue));
        if (~selectedItemIndex) {
          states.selectedLabel = getLabel(options[selectedItemIndex]);
          updateHoveringIndex(selectedItemIndex);
        } else {
          states.selectedLabel = getValueKey(props.modelValue);
        }
      } else {
        states.selectedLabel = "";
        states.previousValue = void 0;
      }
    }
    clearAllNewOption();
    calculatePopperSize();
  };
  vue.watch(expanded, (val) => {
    var _a, _b;
    emit("visible-change", val);
    if (val) {
      (_b = (_a = popper.value).update) == null ? void 0 : _b.call(_a);
    } else {
      states.displayInputValue = "";
      states.previousQuery = null;
      createNewOption("");
    }
  });
  vue.watch(() => props.modelValue, (val, oldVal) => {
    var _a;
    if (!val || val.toString() !== states.previousValue) {
      initStates();
    }
    if (!lodashUnified.isEqual(val, oldVal) && props.validateEvent) {
      (_a = elFormItem == null ? void 0 : elFormItem.validate) == null ? void 0 : _a.call(elFormItem, "change").catch((err) => error.debugWarn(err));
    }
  }, {
    deep: true
  });
  vue.watch(() => props.options, () => {
    const input = inputRef.value;
    if (!input || input && document.activeElement !== input) {
      initStates();
    }
  }, {
    deep: true
  });
  vue.watch(filteredOptions, () => {
    return menuRef.value && vue.nextTick(menuRef.value.resetScrollTop);
  });
  vue.watch(() => dropdownMenuVisible.value, (val) => {
    if (!val) {
      resetHoveringIndex();
    }
  });
  vue.onMounted(() => {
    initStates();
  });
  core.useResizeObserver(selectRef, handleResize);
  return {
    collapseTagSize,
    currentPlaceholder,
    expanded,
    emptyText,
    popupHeight,
    debounce,
    filteredOptions,
    iconComponent,
    iconReverse,
    inputWrapperStyle,
    popperSize,
    dropdownMenuVisible,
    hasModelValue,
    shouldShowPlaceholder,
    selectDisabled,
    selectSize,
    showClearBtn,
    states,
    tagMaxWidth,
    nsSelectV2,
    nsInput,
    calculatorRef,
    controlRef,
    inputRef,
    menuRef,
    popper,
    selectRef,
    selectionRef,
    popperRef,
    validateState,
    validateIcon,
    showTagList,
    collapseTagList,
    debouncedOnInputChange,
    deleteTag,
    getLabel,
    getValue,
    getDisabled,
    getValueKey,
    handleBlur,
    handleClear,
    handleClickOutside,
    handleDel,
    handleEsc,
    handleFocus,
    handleMenuEnter,
    handleResize,
    toggleMenu,
    scrollTo: scrollToItem,
    onInput,
    onKeyboardNavigate,
    onKeyboardSelect,
    onSelect,
    onHover: updateHoveringIndex,
    onUpdateInputValue,
    handleCompositionStart,
    handleCompositionEnd,
    handleCompositionUpdate
  };
};

exports["default"] = useSelect;
//# sourceMappingURL=useSelect.js.map
