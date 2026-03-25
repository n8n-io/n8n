'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../constants/index.js');
var aria = require('../../constants/aria.js');

const modalStack = [];
const closeModal = (e) => {
  if (modalStack.length === 0)
    return;
  if (e.code === aria.EVENT_CODE.esc) {
    e.stopPropagation();
    const topModal = modalStack[modalStack.length - 1];
    topModal.handleClose();
  }
};
const useModal = (instance, visibleRef) => {
  vue.watch(visibleRef, (val) => {
    if (val) {
      modalStack.push(instance);
    } else {
      modalStack.splice(modalStack.indexOf(instance), 1);
    }
  });
};
if (core.isClient)
  core.useEventListener(document, "keydown", closeModal);

exports.useModal = useModal;
//# sourceMappingURL=index.js.map
