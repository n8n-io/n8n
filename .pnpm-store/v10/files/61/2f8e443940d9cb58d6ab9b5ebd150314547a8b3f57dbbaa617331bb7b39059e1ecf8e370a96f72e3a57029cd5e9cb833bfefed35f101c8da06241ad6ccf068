'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
var index = require('../use-namespace/index.js');
var core = require('@vueuse/core');
var error = require('../../utils/error.js');

const defaultIdInjection = {
  prefix: Math.floor(Math.random() * 1e4),
  current: 0
};
const ID_INJECTION_KEY = Symbol("elIdInjection");
const useIdInjection = () => {
  return vue.getCurrentInstance() ? vue.inject(ID_INJECTION_KEY, defaultIdInjection) : defaultIdInjection;
};
const useId = (deterministicId) => {
  const idInjection = useIdInjection();
  if (!core.isClient && idInjection === defaultIdInjection) {
    error.debugWarn("IdInjection", `Looks like you are using server rendering, you must provide a id provider to ensure the hydration process to be succeed
usage: app.provide(ID_INJECTION_KEY, {
  prefix: number,
  current: number,
})`);
  }
  const namespace = index.useGetDerivedNamespace();
  const idRef = vue.computed(() => vue.unref(deterministicId) || `${namespace.value}-id-${idInjection.prefix}-${idInjection.current++}`);
  return idRef;
};

exports.ID_INJECTION_KEY = ID_INJECTION_KEY;
exports.useId = useId;
exports.useIdInjection = useIdInjection;
//# sourceMappingURL=index.js.map
