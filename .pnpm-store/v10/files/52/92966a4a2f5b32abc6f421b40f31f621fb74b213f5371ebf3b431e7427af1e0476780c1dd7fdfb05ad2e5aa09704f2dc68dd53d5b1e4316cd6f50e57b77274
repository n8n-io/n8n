'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../constants/index.js');
require('../../../hooks/index.js');
var index = require('../../../hooks/use-namespace/index.js');
var rand = require('../../../utils/rand.js');
var aria = require('../../../constants/aria.js');
var style = require('../../../utils/dom/style.js');

const useDropdown = () => {
  const elDropdown = vue.inject("elDropdown", {});
  const _elDropdownSize = vue.computed(() => elDropdown == null ? void 0 : elDropdown.dropdownSize);
  return {
    elDropdown,
    _elDropdownSize
  };
};
const initDropdownDomEvent = (dropdownChildren, triggerElm, _instance) => {
  const ns = index.useNamespace("dropdown");
  const menuItems = vue.ref(null);
  const menuItemsArray = vue.ref(null);
  const dropdownElm = vue.ref(null);
  const listId = vue.ref(`dropdown-menu-${rand.generateId()}`);
  dropdownElm.value = dropdownChildren == null ? void 0 : dropdownChildren.subTree.el;
  function removeTabindex() {
    var _a;
    triggerElm.setAttribute("tabindex", "-1");
    (_a = menuItemsArray.value) == null ? void 0 : _a.forEach((item) => {
      item.setAttribute("tabindex", "-1");
    });
  }
  function resetTabindex(ele) {
    removeTabindex();
    ele == null ? void 0 : ele.setAttribute("tabindex", "0");
  }
  function handleTriggerKeyDown(ev) {
    const code = ev.code;
    if ([aria.EVENT_CODE.up, aria.EVENT_CODE.down].includes(code)) {
      removeTabindex();
      resetTabindex(menuItems.value[0]);
      menuItems.value[0].focus();
      ev.preventDefault();
      ev.stopPropagation();
    } else if (code === aria.EVENT_CODE.enter) {
      _instance.handleClick();
    } else if ([aria.EVENT_CODE.tab, aria.EVENT_CODE.esc].includes(code)) {
      _instance.hide();
    }
  }
  function handleItemKeyDown(ev) {
    const code = ev.code;
    const target = ev.target;
    const currentIndex = menuItemsArray.value.indexOf(target);
    const max = menuItemsArray.value.length - 1;
    let nextIndex;
    if ([aria.EVENT_CODE.up, aria.EVENT_CODE.down].includes(code)) {
      if (code === aria.EVENT_CODE.up) {
        nextIndex = currentIndex !== 0 ? currentIndex - 1 : 0;
      } else {
        nextIndex = currentIndex < max ? currentIndex + 1 : max;
      }
      removeTabindex();
      resetTabindex(menuItems.value[nextIndex]);
      menuItems.value[nextIndex].focus();
      ev.preventDefault();
      ev.stopPropagation();
    } else if (code === aria.EVENT_CODE.enter) {
      triggerElmFocus();
      target.click();
      if (_instance.props.hideOnClick) {
        _instance.hide();
      }
    } else if ([aria.EVENT_CODE.tab, aria.EVENT_CODE.esc].includes(code)) {
      _instance.hide();
      triggerElmFocus();
    }
  }
  function initAria() {
    dropdownElm.value.setAttribute("id", listId.value);
    triggerElm.setAttribute("aria-haspopup", "list");
    triggerElm.setAttribute("aria-controls", listId.value);
    if (!_instance.props.splitButton) {
      triggerElm.setAttribute("role", "button");
      triggerElm.setAttribute("tabindex", _instance.props.tabindex);
      style.addClass(triggerElm, ns.b("selfdefine"));
    }
  }
  function initEvent() {
    var _a;
    triggerElm == null ? void 0 : triggerElm.addEventListener("keydown", handleTriggerKeyDown);
    (_a = dropdownElm.value) == null ? void 0 : _a.addEventListener("keydown", handleItemKeyDown, true);
  }
  function initDomOperation() {
    menuItems.value = dropdownElm.value.querySelectorAll("[tabindex='-1']");
    menuItemsArray.value = Array.from(menuItems.value);
    initEvent();
    initAria();
  }
  function triggerElmFocus() {
    triggerElm.focus();
  }
  initDomOperation();
};

exports.initDropdownDomEvent = initDropdownDomEvent;
exports.useDropdown = useDropdown;
//# sourceMappingURL=useDropdown.js.map
