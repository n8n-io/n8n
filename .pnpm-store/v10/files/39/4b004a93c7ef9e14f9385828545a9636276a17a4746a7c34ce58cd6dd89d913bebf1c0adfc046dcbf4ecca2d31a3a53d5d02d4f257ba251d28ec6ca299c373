'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../../constants/index.js');
require('../../../../hooks/index.js');
var index = require('../../../../hooks/use-namespace/index.js');
var aria = require('../../../../constants/aria.js');

function useKeydown({ el$ }, store) {
  const ns = index.useNamespace("tree");
  const treeItems = vue.shallowRef([]);
  const checkboxItems = vue.shallowRef([]);
  vue.onMounted(() => {
    initTabIndex();
  });
  vue.onUpdated(() => {
    treeItems.value = Array.from(el$.value.querySelectorAll("[role=treeitem]"));
    checkboxItems.value = Array.from(el$.value.querySelectorAll("input[type=checkbox]"));
  });
  vue.watch(checkboxItems, (val) => {
    val.forEach((checkbox) => {
      checkbox.setAttribute("tabindex", "-1");
    });
  });
  const handleKeydown = (ev) => {
    const currentItem = ev.target;
    if (!currentItem.className.includes(ns.b("node")))
      return;
    const code = ev.code;
    treeItems.value = Array.from(el$.value.querySelectorAll(`.${ns.is("focusable")}[role=treeitem]`));
    const currentIndex = treeItems.value.indexOf(currentItem);
    let nextIndex;
    if ([aria.EVENT_CODE.up, aria.EVENT_CODE.down].includes(code)) {
      ev.preventDefault();
      if (code === aria.EVENT_CODE.up) {
        nextIndex = currentIndex === -1 ? 0 : currentIndex !== 0 ? currentIndex - 1 : treeItems.value.length - 1;
        const startIndex = nextIndex;
        while (true) {
          if (store.value.getNode(treeItems.value[nextIndex].dataset.key).canFocus)
            break;
          nextIndex--;
          if (nextIndex === startIndex) {
            nextIndex = -1;
            break;
          }
          if (nextIndex < 0) {
            nextIndex = treeItems.value.length - 1;
          }
        }
      } else {
        nextIndex = currentIndex === -1 ? 0 : currentIndex < treeItems.value.length - 1 ? currentIndex + 1 : 0;
        const startIndex = nextIndex;
        while (true) {
          if (store.value.getNode(treeItems.value[nextIndex].dataset.key).canFocus)
            break;
          nextIndex++;
          if (nextIndex === startIndex) {
            nextIndex = -1;
            break;
          }
          if (nextIndex >= treeItems.value.length) {
            nextIndex = 0;
          }
        }
      }
      nextIndex !== -1 && treeItems.value[nextIndex].focus();
    }
    if ([aria.EVENT_CODE.left, aria.EVENT_CODE.right].includes(code)) {
      ev.preventDefault();
      currentItem.click();
    }
    const hasInput = currentItem.querySelector('[type="checkbox"]');
    if ([aria.EVENT_CODE.enter, aria.EVENT_CODE.space].includes(code) && hasInput) {
      ev.preventDefault();
      hasInput.click();
    }
  };
  core.useEventListener(el$, "keydown", handleKeydown);
  const initTabIndex = () => {
    var _a;
    treeItems.value = Array.from(el$.value.querySelectorAll(`.${ns.is("focusable")}[role=treeitem]`));
    checkboxItems.value = Array.from(el$.value.querySelectorAll("input[type=checkbox]"));
    const checkedItem = el$.value.querySelectorAll(`.${ns.is("checked")}[role=treeitem]`);
    if (checkedItem.length) {
      checkedItem[0].setAttribute("tabindex", "0");
      return;
    }
    (_a = treeItems.value[0]) == null ? void 0 : _a.setAttribute("tabindex", "0");
  };
}

exports.useKeydown = useKeydown;
//# sourceMappingURL=useKeydown.js.map
