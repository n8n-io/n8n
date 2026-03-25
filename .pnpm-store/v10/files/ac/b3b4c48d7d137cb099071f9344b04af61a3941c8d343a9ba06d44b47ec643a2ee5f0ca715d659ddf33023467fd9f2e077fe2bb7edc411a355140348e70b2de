'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
var index = require('../use-namespace/index.js');
var index$1 = require('../use-id/index.js');
var core = require('@vueuse/core');

let cachedContainer;
const usePopperContainerId = () => {
  const namespace = index.useGetDerivedNamespace();
  const idInjection = index$1.useIdInjection();
  const id = vue.computed(() => {
    return `${namespace.value}-popper-container-${idInjection.prefix}`;
  });
  const selector = vue.computed(() => `#${id.value}`);
  return {
    id,
    selector
  };
};
const createContainer = (id) => {
  const container = document.createElement("div");
  container.id = id;
  document.body.appendChild(container);
  return container;
};
const usePopperContainer = () => {
  const { id, selector } = usePopperContainerId();
  vue.onBeforeMount(() => {
    if (!core.isClient)
      return;
    if (process.env.NODE_ENV === "test" || !cachedContainer && !document.body.querySelector(selector.value)) {
      cachedContainer = createContainer(id.value);
    }
  });
  return {
    id,
    selector
  };
};

exports.usePopperContainer = usePopperContainer;
exports.usePopperContainerId = usePopperContainerId;
//# sourceMappingURL=index.js.map
