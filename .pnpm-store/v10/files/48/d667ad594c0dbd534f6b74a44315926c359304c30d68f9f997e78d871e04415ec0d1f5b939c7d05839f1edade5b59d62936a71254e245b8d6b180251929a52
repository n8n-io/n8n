'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
require('../../../../utils/index.js');
var shared = require('@vue/shared');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const useShortcut = (lang) => {
  const { emit } = vue.getCurrentInstance();
  const attrs = vue.useAttrs();
  const slots = vue.useSlots();
  const handleShortcutClick = (shortcut) => {
    const shortcutValues = shared.isFunction(shortcut.value) ? shortcut.value() : shortcut.value;
    if (shortcutValues) {
      emit("pick", [
        dayjs__default["default"](shortcutValues[0]).locale(lang.value),
        dayjs__default["default"](shortcutValues[1]).locale(lang.value)
      ]);
      return;
    }
    if (shortcut.onClick) {
      shortcut.onClick({
        attrs,
        slots,
        emit
      });
    }
  };
  return handleShortcutClick;
};

exports.useShortcut = useShortcut;
//# sourceMappingURL=use-shortcut.js.map
