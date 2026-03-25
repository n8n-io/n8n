'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var utils = require('../utils.js');
var constants = require('../constants.js');
var useShortcut = require('./use-shortcut.js');
var index = require('../../../../hooks/use-namespace/index.js');
var index$1 = require('../../../../hooks/use-locale/index.js');
var shared = require('@vue/shared');

const useRangePicker = (props, {
  defaultValue,
  leftDate,
  rightDate,
  unit,
  onParsedValueChanged
}) => {
  const { emit } = vue.getCurrentInstance();
  const { pickerNs } = vue.inject(constants.ROOT_PICKER_INJECTION_KEY);
  const drpNs = index.useNamespace("date-range-picker");
  const { t, lang } = index$1.useLocale();
  const handleShortcutClick = useShortcut.useShortcut(lang);
  const minDate = vue.ref();
  const maxDate = vue.ref();
  const rangeState = vue.ref({
    endDate: null,
    selecting: false
  });
  const handleChangeRange = (val) => {
    rangeState.value = val;
  };
  const handleRangeConfirm = (visible = false) => {
    const _minDate = vue.unref(minDate);
    const _maxDate = vue.unref(maxDate);
    if (utils.isValidRange([_minDate, _maxDate])) {
      emit("pick", [_minDate, _maxDate], visible);
    }
  };
  const onSelect = (selecting) => {
    rangeState.value.selecting = selecting;
    if (!selecting) {
      rangeState.value.endDate = null;
    }
  };
  const restoreDefault = () => {
    const [start, end] = utils.getDefaultValue(vue.unref(defaultValue), {
      lang: vue.unref(lang),
      unit,
      unlinkPanels: props.unlinkPanels
    });
    minDate.value = void 0;
    maxDate.value = void 0;
    leftDate.value = start;
    rightDate.value = end;
  };
  vue.watch(defaultValue, (val) => {
    if (val) {
      restoreDefault();
    }
  }, { immediate: true });
  vue.watch(() => props.parsedValue, (parsedValue) => {
    if (shared.isArray(parsedValue) && parsedValue.length === 2) {
      const [start, end] = parsedValue;
      minDate.value = start;
      leftDate.value = start;
      maxDate.value = end;
      onParsedValueChanged(vue.unref(minDate), vue.unref(maxDate));
    } else {
      restoreDefault();
    }
  }, { immediate: true });
  return {
    minDate,
    maxDate,
    rangeState,
    lang,
    ppNs: pickerNs,
    drpNs,
    handleChangeRange,
    handleRangeConfirm,
    handleShortcutClick,
    onSelect,
    t
  };
};

exports.useRangePicker = useRangePicker;
//# sourceMappingURL=use-range-picker.js.map
