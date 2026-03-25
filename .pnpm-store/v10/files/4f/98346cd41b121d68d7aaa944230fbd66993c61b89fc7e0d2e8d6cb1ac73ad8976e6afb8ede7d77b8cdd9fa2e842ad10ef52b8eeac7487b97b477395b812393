'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const useProp = (name) => {
  const vm = vue.getCurrentInstance();
  return vue.computed(() => {
    var _a, _b;
    return (_b = (_a = vm == null ? void 0 : vm.proxy) == null ? void 0 : _a.$props) == null ? void 0 : _b[name];
  });
};

exports.useProp = useProp;
//# sourceMappingURL=index.js.map
