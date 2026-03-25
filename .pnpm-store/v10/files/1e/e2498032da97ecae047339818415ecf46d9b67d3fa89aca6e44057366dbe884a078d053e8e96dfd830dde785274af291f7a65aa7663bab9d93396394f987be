'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const instances = vue.shallowReactive([]);
const getInstance = (id) => {
  const idx = instances.findIndex((instance) => instance.id === id);
  const current = instances[idx];
  let prev;
  if (idx > 0) {
    prev = instances[idx - 1];
  }
  return { current, prev };
};
const getLastOffset = (id) => {
  const { prev } = getInstance(id);
  if (!prev)
    return 0;
  return prev.vm.exposed.bottom.value;
};
const getOffsetOrSpace = (id, offset) => {
  const idx = instances.findIndex((instance) => instance.id === id);
  return idx > 0 ? 20 : offset;
};

exports.getInstance = getInstance;
exports.getLastOffset = getLastOffset;
exports.getOffsetOrSpace = getOffsetOrSpace;
exports.instances = instances;
//# sourceMappingURL=instance.js.map
