'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
var error = require('../../utils/error.js');

const useDeprecated = ({ from, replacement, scope, version, ref, type = "API" }, condition) => {
  vue.watch(() => vue.unref(condition), (val) => {
    if (val) {
      error.debugWarn(scope, `[${type}] ${from} is about to be deprecated in version ${version}, please use ${replacement} instead.
For more detail, please visit: ${ref}
`);
    }
  }, {
    immediate: true
  });
};

exports.useDeprecated = useDeprecated;
//# sourceMappingURL=index.js.map
