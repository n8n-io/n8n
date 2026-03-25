'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var shared = require('@vue/shared');
var lodashUnified = require('lodash-unified');
require('../../../constants/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
require('../../form/index.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var index$2 = require('../../../hooks/use-deprecated/index.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var icon = require('../../../utils/vue/icon.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var error = require('../../../utils/error.js');
var core = require('@vueuse/core');
var types = require('../../../utils/types.js');
var size = require('../../../utils/vue/size.js');
var event = require('../../../constants/event.js');
var aria = require('../../../constants/aria.js');
var scroll = require('../../../utils/dom/scroll.js');
var i18n = require('../../../utils/i18n.js');

function useSelectStates(props) {
  const { t } = index.useLocale();
  return vue.reactive({
    options: /* @__PURE__ */ new Map(),
    cachedOptions: /* @__PURE__ */ new Map(),
    disabledOptions: /* @__PURE__ */ new Map(),
    createdLabel: null,
    createdSelected: false,
    selected: props.multiple ? [] : {},
    inputLength: 20,
    inputWidth: 0,
    optionsCount: 0,
    filteredOptionsCount: 0,
    visible: false,
    selectedLabel: "",
    hoverIndex: -1,
    query: "",
    previousQuery: null,
    inputHovering: false,
    cachedPlaceHolder: "",
    currentPlaceholder: t("el.select.placeholder"),
    menuVisibleOnFocus: false,
    isOnComposition: false,
    prefixWidth: 11,
    mouseEnter: false,
    focused: false
  });
}
const useSelect = (props, states, ctx) => {
  const { t } = index.useLocale();
  const ns = index$1.useNamespace("select");
  index$2.useDeprecated({
    from: "suffixTransition",
    replacement: "override style scheme",
    version: "2.3.0",
    scope: "props",
    ref: "https://element-plus.org/en-US/component/select.html#select-attributes"
  }, vue.computed(() => props.suffixTransition === false));
  const reference = vue.ref(null);
  const input = vue.ref(null);
  const iOSInput = vue.ref(null);
  const tooltipRef = vue.ref(null);
  const tagTooltipRef = vue.ref(null);
  const tags = vue.ref(null);
  const selectWrapper = vue.ref(null);
  const scrollbar = vue.ref(null);
  const hoverOption = vue.ref();
  const queryChange = vue.shallowRef({ query: "" });
  const groupQueryChange = vue.shallowRef("");
  const optionList = vue.ref([]);
  let originClientHeight = 0;
  const { form, formItem } = useFormItem.useFormItem();
  const readonly = vue.computed(() => !props.filterable || props.multiple || !states.visible);
  const selectDisabled = vue.computed(() => props.disabled || (form == null ? void 0 : form.disabled));
  const showClose = vue.computed(() => {
    const hasValue = props.multiple ? Array.isArray(props.modelValue) && props.modelValue.length > 0 : props.modelValue !== void 0 && props.modelValue !== null && props.modelValue !== "";
    const criteria = props.clearable && !selectDisabled.value && states.inputHovering && hasValue;
    return criteria;
  });
  const iconComponent = vue.computed(() => props.remote && props.filterable && !props.remoteShowSuffix ? "" : props.suffixIcon);
  const iconReverse = vue.computed(() => ns.is("reverse", iconComponent.value && states.visible && props.suffixTransition));
  const showStatusIconAndState = vue.computed(() => (form == null ? void 0 : form.statusIcon) && (formItem == null ? void 0 : formItem.validateState) && icon.ValidateComponentsMap[formItem == null ? void 0 : formItem.validateState]);
  const debounce = vue.computed(() => props.remote ? 300 : 0);
  const emptyText = vue.computed(() => {
    if (props.loading) {
      return props.loadingText || t("el.select.loading");
    } else {
      if (props.remote && states.query === "" && states.options.size === 0)
        return false;
      if (props.filterable && states.query && states.options.size > 0 && states.filteredOptionsCount === 0) {
        return props.noMatchText || t("el.select.noMatch");
      }
      if (states.options.size === 0) {
        return props.noDataText || t("el.select.noData");
      }
    }
    return null;
  });
  const optionsArray = vue.computed(() => {
    const list = Array.from(states.options.values());
    const newList = [];
    optionList.value.forEach((item) => {
      const index = list.findIndex((i) => i.currentLabel === item);
      if (index > -1) {
        newList.push(list[index]);
      }
    });
    return newList.length >= list.length ? newList : list;
  });
  const cachedOptionsArray = vue.computed(() => Array.from(states.cachedOptions.values()));
  const showNewOption = vue.computed(() => {
    const hasExistingOption = optionsArray.value.filter((option) => {
      return !option.created;
    }).some((option) => {
      return option.currentLabel === states.query;
    });
    return props.filterable && props.allowCreate && states.query !== "" && !hasExistingOption;
  });
  const selectSize = useFormCommonProps.useFormSize();
  const collapseTagSize = vue.computed(() => ["small"].includes(selectSize.value) ? "small" : "default");
  const dropMenuVisible = vue.computed({
    get() {
      return states.visible && emptyText.value !== false;
    },
    set(val) {
      states.visible = val;
    }
  });
  vue.watch([() => selectDisabled.value, () => selectSize.value, () => form == null ? void 0 : form.size], () => {
    vue.nextTick(() => {
      resetInputHeight();
    });
  });
  vue.watch(() => props.placeholder, (val) => {
    states.cachedPlaceHolder = states.currentPlaceholder = val;
    const hasValue = props.multiple && Array.isArray(props.modelValue) && props.modelValue.length > 0;
    if (hasValue) {
      states.currentPlaceholder = "";
    }
  });
  vue.watch(() => props.modelValue, (val, oldVal) => {
    if (props.multiple) {
      resetInputHeight();
      if (val && val.length > 0 || input.value && states.query !== "") {
        states.currentPlaceholder = "";
      } else {
        states.currentPlaceholder = states.cachedPlaceHolder;
      }
      if (props.filterable && !props.reserveKeyword) {
        states.query = "";
        handleQueryChange(states.query);
      }
    }
    setSelected();
    if (props.filterable && !props.multiple) {
      states.inputLength = 20;
    }
    if (!lodashUnified.isEqual(val, oldVal) && props.validateEvent) {
      formItem == null ? void 0 : formItem.validate("change").catch((err) => error.debugWarn(err));
    }
  }, {
    flush: "post",
    deep: true
  });
  vue.watch(() => states.visible, (val) => {
    var _a, _b, _c, _d, _e;
    if (!val) {
      if (props.filterable) {
        if (shared.isFunction(props.filterMethod)) {
          props.filterMethod("");
        }
        if (shared.isFunction(props.remoteMethod)) {
          props.remoteMethod("");
        }
      }
      states.query = "";
      states.previousQuery = null;
      states.selectedLabel = "";
      states.inputLength = 20;
      states.menuVisibleOnFocus = false;
      resetHoverIndex();
      vue.nextTick(() => {
        if (input.value && input.value.value === "" && states.selected.length === 0) {
          states.currentPlaceholder = states.cachedPlaceHolder;
        }
      });
      if (!props.multiple) {
        if (states.selected) {
          if (props.filterable && props.allowCreate && states.createdSelected && states.createdLabel) {
            states.selectedLabel = states.createdLabel;
          } else {
            states.selectedLabel = states.selected.currentLabel;
          }
          if (props.filterable)
            states.query = states.selectedLabel;
        }
        if (props.filterable) {
          states.currentPlaceholder = states.cachedPlaceHolder;
        }
      }
    } else {
      (_b = (_a = tooltipRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
      if (props.filterable) {
        states.filteredOptionsCount = states.optionsCount;
        states.query = props.remote ? "" : states.selectedLabel;
        (_d = (_c = iOSInput.value) == null ? void 0 : _c.focus) == null ? void 0 : _d.call(_c);
        if (props.multiple) {
          (_e = input.value) == null ? void 0 : _e.focus();
        } else {
          if (states.selectedLabel) {
            states.currentPlaceholder = `${states.selectedLabel}`;
            states.selectedLabel = "";
          }
        }
        handleQueryChange(states.query);
        if (!props.multiple && !props.remote) {
          queryChange.value.query = "";
          vue.triggerRef(queryChange);
          vue.triggerRef(groupQueryChange);
        }
      }
    }
    ctx.emit("visible-change", val);
  });
  vue.watch(() => states.options.entries(), () => {
    var _a, _b, _c;
    if (!core.isClient)
      return;
    (_b = (_a = tooltipRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
    if (props.multiple) {
      resetInputHeight();
    }
    const inputs = ((_c = selectWrapper.value) == null ? void 0 : _c.querySelectorAll("input")) || [];
    if (!props.filterable && !props.defaultFirstOption && !types.isUndefined(props.modelValue) || !Array.from(inputs).includes(document.activeElement)) {
      setSelected();
    }
    if (props.defaultFirstOption && (props.filterable || props.remote) && states.filteredOptionsCount) {
      checkDefaultFirstOption();
    }
  }, {
    flush: "post"
  });
  vue.watch(() => states.hoverIndex, (val) => {
    if (types.isNumber(val) && val > -1) {
      hoverOption.value = optionsArray.value[val] || {};
    } else {
      hoverOption.value = {};
    }
    optionsArray.value.forEach((option) => {
      option.hover = hoverOption.value === option;
    });
  });
  const resetInputHeight = () => {
    vue.nextTick(() => {
      var _a, _b;
      if (!reference.value)
        return;
      const input2 = reference.value.$el.querySelector("input");
      originClientHeight = originClientHeight || (input2.clientHeight > 0 ? input2.clientHeight + 2 : 0);
      const _tags = tags.value;
      const cssVarOfSelectSize = getComputedStyle(input2).getPropertyValue(ns.cssVarName("input-height"));
      const gotSize = Number.parseFloat(cssVarOfSelectSize) || size.getComponentSize(selectSize.value || (form == null ? void 0 : form.size));
      const sizeInMap = selectSize.value || gotSize === originClientHeight || originClientHeight <= 0 ? gotSize : originClientHeight;
      const isElHidden = input2.offsetParent === null;
      !isElHidden && (input2.style.height = `${(states.selected.length === 0 ? sizeInMap : Math.max(_tags ? _tags.clientHeight + (_tags.clientHeight > sizeInMap ? 6 : 0) : 0, sizeInMap)) - 2}px`);
      if (states.visible && emptyText.value !== false) {
        (_b = (_a = tooltipRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
      }
    });
  };
  const handleQueryChange = async (val) => {
    if (states.previousQuery === val || states.isOnComposition)
      return;
    if (states.previousQuery === null && (shared.isFunction(props.filterMethod) || shared.isFunction(props.remoteMethod))) {
      states.previousQuery = val;
      return;
    }
    states.previousQuery = val;
    vue.nextTick(() => {
      var _a, _b;
      if (states.visible)
        (_b = (_a = tooltipRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
    });
    states.hoverIndex = -1;
    if (props.multiple && props.filterable) {
      vue.nextTick(() => {
        if (!selectDisabled.value) {
          const length = input.value.value.length * 15 + 20;
          states.inputLength = props.collapseTags ? Math.min(50, length) : length;
          managePlaceholder();
        }
        resetInputHeight();
      });
    }
    if (props.remote && shared.isFunction(props.remoteMethod)) {
      states.hoverIndex = -1;
      props.remoteMethod(val);
    } else if (shared.isFunction(props.filterMethod)) {
      props.filterMethod(val);
      vue.triggerRef(groupQueryChange);
    } else {
      states.filteredOptionsCount = states.optionsCount;
      queryChange.value.query = val;
      vue.triggerRef(queryChange);
      vue.triggerRef(groupQueryChange);
    }
    if (props.defaultFirstOption && (props.filterable || props.remote) && states.filteredOptionsCount) {
      await vue.nextTick();
      checkDefaultFirstOption();
    }
  };
  const managePlaceholder = () => {
    if (states.currentPlaceholder !== "") {
      states.currentPlaceholder = input.value.value ? "" : states.cachedPlaceHolder;
    }
  };
  const checkDefaultFirstOption = () => {
    const optionsInDropdown = optionsArray.value.filter((n) => n.visible && !n.disabled && !n.states.groupDisabled);
    const userCreatedOption = optionsInDropdown.find((n) => n.created);
    const firstOriginOption = optionsInDropdown[0];
    states.hoverIndex = getValueIndex(optionsArray.value, userCreatedOption || firstOriginOption);
  };
  const setSelected = () => {
    var _a;
    if (!props.multiple) {
      const option = getOption(props.modelValue);
      if ((_a = option.props) == null ? void 0 : _a.created) {
        states.createdLabel = option.props.value;
        states.createdSelected = true;
      } else {
        states.createdSelected = false;
      }
      states.selectedLabel = option.currentLabel;
      states.selected = option;
      if (props.filterable)
        states.query = states.selectedLabel;
      return;
    } else {
      states.selectedLabel = "";
    }
    const result = [];
    if (Array.isArray(props.modelValue)) {
      props.modelValue.forEach((value) => {
        result.push(getOption(value));
      });
    }
    states.selected = result;
    vue.nextTick(() => {
      resetInputHeight();
    });
  };
  const getOption = (value) => {
    let option;
    const isObjectValue = shared.toRawType(value).toLowerCase() === "object";
    const isNull = shared.toRawType(value).toLowerCase() === "null";
    const isUndefined2 = shared.toRawType(value).toLowerCase() === "undefined";
    for (let i = states.cachedOptions.size - 1; i >= 0; i--) {
      const cachedOption = cachedOptionsArray.value[i];
      const isEqualValue = isObjectValue ? lodashUnified.get(cachedOption.value, props.valueKey) === lodashUnified.get(value, props.valueKey) : cachedOption.value === value;
      if (isEqualValue) {
        option = {
          value,
          currentLabel: cachedOption.currentLabel,
          isDisabled: cachedOption.isDisabled
        };
        break;
      }
    }
    if (option)
      return option;
    const label = isObjectValue ? value.label : !isNull && !isUndefined2 ? value : "";
    const newOption = {
      value,
      currentLabel: label
    };
    if (props.multiple) {
      ;
      newOption.hitState = false;
    }
    return newOption;
  };
  const resetHoverIndex = () => {
    setTimeout(() => {
      const valueKey = props.valueKey;
      if (!props.multiple) {
        states.hoverIndex = optionsArray.value.findIndex((item) => {
          return getValueKey(item) === getValueKey(states.selected);
        });
      } else {
        if (states.selected.length > 0) {
          states.hoverIndex = Math.min.apply(null, states.selected.map((selected) => {
            return optionsArray.value.findIndex((item) => {
              return lodashUnified.get(item, valueKey) === lodashUnified.get(selected, valueKey);
            });
          }));
        } else {
          states.hoverIndex = -1;
        }
      }
    }, 300);
  };
  const handleResize = () => {
    var _a, _b;
    resetInputWidth();
    (_b = (_a = tooltipRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
    props.multiple && resetInputHeight();
  };
  const resetInputWidth = () => {
    var _a;
    states.inputWidth = (_a = reference.value) == null ? void 0 : _a.$el.offsetWidth;
  };
  const onInputChange = () => {
    if (props.filterable && states.query !== states.selectedLabel) {
      states.query = states.selectedLabel;
      handleQueryChange(states.query);
    }
  };
  const debouncedOnInputChange = lodashUnified.debounce(() => {
    onInputChange();
  }, debounce.value);
  const debouncedQueryChange = lodashUnified.debounce((e) => {
    handleQueryChange(e.target.value);
  }, debounce.value);
  const emitChange = (val) => {
    if (!lodashUnified.isEqual(props.modelValue, val)) {
      ctx.emit(event.CHANGE_EVENT, val);
    }
  };
  const getLastNotDisabledIndex = (value) => lodashUnified.findLastIndex(value, (it) => !states.disabledOptions.has(it));
  const deletePrevTag = (e) => {
    if (e.code === aria.EVENT_CODE.delete)
      return;
    if (e.target.value.length <= 0 && !toggleLastOptionHitState()) {
      const value = props.modelValue.slice();
      const lastNotDisabledIndex = getLastNotDisabledIndex(value);
      if (lastNotDisabledIndex < 0)
        return;
      value.splice(lastNotDisabledIndex, 1);
      ctx.emit(event.UPDATE_MODEL_EVENT, value);
      emitChange(value);
    }
    if (e.target.value.length === 1 && props.modelValue.length === 0) {
      states.currentPlaceholder = states.cachedPlaceHolder;
    }
  };
  const deleteTag = (event$1, tag) => {
    const index = states.selected.indexOf(tag);
    if (index > -1 && !selectDisabled.value) {
      const value = props.modelValue.slice();
      value.splice(index, 1);
      ctx.emit(event.UPDATE_MODEL_EVENT, value);
      emitChange(value);
      ctx.emit("remove-tag", tag.value);
    }
    event$1.stopPropagation();
    focus();
  };
  const deleteSelected = (event$1) => {
    event$1.stopPropagation();
    const value = props.multiple ? [] : "";
    if (!shared.isString(value)) {
      for (const item of states.selected) {
        if (item.isDisabled)
          value.push(item.value);
      }
    }
    ctx.emit(event.UPDATE_MODEL_EVENT, value);
    emitChange(value);
    states.hoverIndex = -1;
    states.visible = false;
    ctx.emit("clear");
    focus();
  };
  const handleOptionSelect = (option) => {
    var _a;
    if (props.multiple) {
      const value = (props.modelValue || []).slice();
      const optionIndex = getValueIndex(value, option.value);
      if (optionIndex > -1) {
        value.splice(optionIndex, 1);
      } else if (props.multipleLimit <= 0 || value.length < props.multipleLimit) {
        value.push(option.value);
      }
      ctx.emit(event.UPDATE_MODEL_EVENT, value);
      emitChange(value);
      if (option.created) {
        states.query = "";
        handleQueryChange("");
        states.inputLength = 20;
      }
      if (props.filterable)
        (_a = input.value) == null ? void 0 : _a.focus();
    } else {
      ctx.emit(event.UPDATE_MODEL_EVENT, option.value);
      emitChange(option.value);
      states.visible = false;
    }
    setSoftFocus();
    if (states.visible)
      return;
    vue.nextTick(() => {
      scrollToOption(option);
    });
  };
  const getValueIndex = (arr = [], value) => {
    if (!shared.isObject(value))
      return arr.indexOf(value);
    const valueKey = props.valueKey;
    let index = -1;
    arr.some((item, i) => {
      if (vue.toRaw(lodashUnified.get(item, valueKey)) === lodashUnified.get(value, valueKey)) {
        index = i;
        return true;
      }
      return false;
    });
    return index;
  };
  const setSoftFocus = () => {
    const _input = input.value || reference.value;
    if (_input) {
      _input == null ? void 0 : _input.focus();
    }
  };
  const scrollToOption = (option) => {
    var _a, _b, _c, _d, _e;
    const targetOption = Array.isArray(option) ? option[0] : option;
    let target = null;
    if (targetOption == null ? void 0 : targetOption.value) {
      const options = optionsArray.value.filter((item) => item.value === targetOption.value);
      if (options.length > 0) {
        target = options[0].$el;
      }
    }
    if (tooltipRef.value && target) {
      const menu = (_d = (_c = (_b = (_a = tooltipRef.value) == null ? void 0 : _a.popperRef) == null ? void 0 : _b.contentRef) == null ? void 0 : _c.querySelector) == null ? void 0 : _d.call(_c, `.${ns.be("dropdown", "wrap")}`);
      if (menu) {
        scroll.scrollIntoView(menu, target);
      }
    }
    (_e = scrollbar.value) == null ? void 0 : _e.handleScroll();
  };
  const onOptionCreate = (vm) => {
    states.optionsCount++;
    states.filteredOptionsCount++;
    states.options.set(vm.value, vm);
    states.cachedOptions.set(vm.value, vm);
    vm.disabled && states.disabledOptions.set(vm.value, vm);
  };
  const onOptionDestroy = (key, vm) => {
    if (states.options.get(key) === vm) {
      states.optionsCount--;
      states.filteredOptionsCount--;
      states.options.delete(key);
    }
  };
  const resetInputState = (e) => {
    if (e.code !== aria.EVENT_CODE.backspace)
      toggleLastOptionHitState(false);
    states.inputLength = input.value.value.length * 15 + 20;
    resetInputHeight();
  };
  const toggleLastOptionHitState = (hit) => {
    if (!Array.isArray(states.selected))
      return;
    const lastNotDisabledIndex = getLastNotDisabledIndex(states.selected.map((it) => it.value));
    const option = states.selected[lastNotDisabledIndex];
    if (!option)
      return;
    if (hit === true || hit === false) {
      option.hitState = hit;
      return hit;
    }
    option.hitState = !option.hitState;
    return option.hitState;
  };
  const handleComposition = (event) => {
    const text = event.target.value;
    if (event.type === "compositionend") {
      states.isOnComposition = false;
      vue.nextTick(() => handleQueryChange(text));
    } else {
      const lastCharacter = text[text.length - 1] || "";
      states.isOnComposition = !i18n.isKorean(lastCharacter);
    }
  };
  const handleMenuEnter = () => {
    vue.nextTick(() => scrollToOption(states.selected));
  };
  const handleFocus = (event) => {
    if (!states.focused) {
      if (props.automaticDropdown || props.filterable) {
        if (props.filterable && !states.visible) {
          states.menuVisibleOnFocus = true;
        }
        states.visible = true;
      }
      states.focused = true;
      ctx.emit("focus", event);
    }
  };
  const focus = () => {
    var _a, _b;
    if (states.visible) {
      ;
      (_a = input.value || reference.value) == null ? void 0 : _a.focus();
    } else {
      (_b = reference.value) == null ? void 0 : _b.focus();
    }
  };
  const blur = () => {
    var _a, _b, _c;
    states.visible = false;
    (_a = reference.value) == null ? void 0 : _a.blur();
    (_c = (_b = iOSInput.value) == null ? void 0 : _b.blur) == null ? void 0 : _c.call(_b);
  };
  const handleBlur = (event) => {
    var _a, _b, _c;
    if (((_a = tooltipRef.value) == null ? void 0 : _a.isFocusInsideContent(event)) || ((_b = tagTooltipRef.value) == null ? void 0 : _b.isFocusInsideContent(event)) || ((_c = selectWrapper.value) == null ? void 0 : _c.contains(event.relatedTarget))) {
      return;
    }
    states.visible && handleClose();
    states.focused = false;
    ctx.emit("blur", event);
  };
  const handleClearClick = (event) => {
    deleteSelected(event);
  };
  const handleClose = () => {
    states.visible = false;
  };
  const handleKeydownEscape = (event) => {
    if (states.visible) {
      event.preventDefault();
      event.stopPropagation();
      states.visible = false;
    }
  };
  const toggleMenu = (e) => {
    if (e && !states.mouseEnter) {
      return;
    }
    if (!selectDisabled.value) {
      if (states.menuVisibleOnFocus) {
        states.menuVisibleOnFocus = false;
      } else {
        if (!tooltipRef.value || !tooltipRef.value.isFocusInsideContent()) {
          states.visible = !states.visible;
        }
      }
      focus();
    }
  };
  const selectOption = () => {
    if (!states.visible) {
      toggleMenu();
    } else {
      if (optionsArray.value[states.hoverIndex]) {
        handleOptionSelect(optionsArray.value[states.hoverIndex]);
      }
    }
  };
  const getValueKey = (item) => {
    return shared.isObject(item.value) ? lodashUnified.get(item.value, props.valueKey) : item.value;
  };
  const optionsAllDisabled = vue.computed(() => optionsArray.value.filter((option) => option.visible).every((option) => option.disabled));
  const showTagList = vue.computed(() => props.multiple ? states.selected.slice(0, props.maxCollapseTags) : []);
  const collapseTagList = vue.computed(() => props.multiple ? states.selected.slice(props.maxCollapseTags) : []);
  const navigateOptions = (direction) => {
    if (!states.visible) {
      states.visible = true;
      return;
    }
    if (states.options.size === 0 || states.filteredOptionsCount === 0)
      return;
    if (states.isOnComposition)
      return;
    if (!optionsAllDisabled.value) {
      if (direction === "next") {
        states.hoverIndex++;
        if (states.hoverIndex === states.options.size) {
          states.hoverIndex = 0;
        }
      } else if (direction === "prev") {
        states.hoverIndex--;
        if (states.hoverIndex < 0) {
          states.hoverIndex = states.options.size - 1;
        }
      }
      const option = optionsArray.value[states.hoverIndex];
      if (option.disabled === true || option.states.groupDisabled === true || !option.visible) {
        navigateOptions(direction);
      }
      vue.nextTick(() => scrollToOption(hoverOption.value));
    }
  };
  const handleMouseEnter = () => {
    states.mouseEnter = true;
  };
  const handleMouseLeave = () => {
    states.mouseEnter = false;
  };
  const handleDeleteTooltipTag = (event, tag) => {
    var _a, _b;
    deleteTag(event, tag);
    (_b = (_a = tagTooltipRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
  };
  const selectTagsStyle = vue.computed(() => ({
    maxWidth: `${vue.unref(states.inputWidth) - 32 - (showStatusIconAndState.value ? 22 : 0)}px`,
    width: "100%"
  }));
  return {
    optionList,
    optionsArray,
    hoverOption,
    selectSize,
    handleResize,
    debouncedOnInputChange,
    debouncedQueryChange,
    deletePrevTag,
    deleteTag,
    deleteSelected,
    handleOptionSelect,
    scrollToOption,
    readonly,
    resetInputHeight,
    showClose,
    iconComponent,
    iconReverse,
    showNewOption,
    collapseTagSize,
    setSelected,
    managePlaceholder,
    selectDisabled,
    emptyText,
    toggleLastOptionHitState,
    resetInputState,
    handleComposition,
    onOptionCreate,
    onOptionDestroy,
    handleMenuEnter,
    handleFocus,
    focus,
    blur,
    handleBlur,
    handleClearClick,
    handleClose,
    handleKeydownEscape,
    toggleMenu,
    selectOption,
    getValueKey,
    navigateOptions,
    handleDeleteTooltipTag,
    dropMenuVisible,
    queryChange,
    groupQueryChange,
    showTagList,
    collapseTagList,
    selectTagsStyle,
    reference,
    input,
    iOSInput,
    tooltipRef,
    tagTooltipRef,
    tags,
    selectWrapper,
    scrollbar,
    handleMouseEnter,
    handleMouseLeave
  };
};

exports.useSelect = useSelect;
exports.useSelectStates = useSelectStates;
//# sourceMappingURL=useSelect.js.map
