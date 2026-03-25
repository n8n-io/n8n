'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
var types = require('../../utils/types.js');

const zIndex = vue.ref(0);
const defaultInitialZIndex = 2e3;
const zIndexContextKey = Symbol("zIndexContextKey");
const useZIndex = (zIndexOverrides) => {
  const zIndexInjection = zIndexOverrides || (vue.getCurrentInstance() ? vue.inject(zIndexContextKey, void 0) : void 0);
  const initialZIndex = vue.computed(() => {
    const zIndexFromInjection = vue.unref(zIndexInjection);
    return types.isNumber(zIndexFromInjection) ? zIndexFromInjection : defaultInitialZIndex;
  });
  const currentZIndex = vue.computed(() => initialZIndex.value + zIndex.value);
  const nextZIndex = () => {
    zIndex.value++;
    return currentZIndex.value;
  };
  return {
    initialZIndex,
    currentZIndex,
    nextZIndex
  };
};

exports.defaultInitialZIndex = defaultInitialZIndex;
exports.useZIndex = useZIndex;
exports.zIndexContextKey = zIndexContextKey;
//# sourceMappingURL=index.js.map
