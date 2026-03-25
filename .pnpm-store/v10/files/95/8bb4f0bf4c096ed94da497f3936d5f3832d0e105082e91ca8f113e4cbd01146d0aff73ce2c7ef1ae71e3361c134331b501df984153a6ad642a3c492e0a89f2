'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../types.js');
var shared = require('@vue/shared');

const composeRefs = (...refs) => {
  return (el) => {
    refs.forEach((ref) => {
      if (shared.isFunction(ref)) {
        ref(el);
      } else {
        ref.value = el;
      }
    });
  };
};

exports.composeRefs = composeRefs;
//# sourceMappingURL=refs.js.map
