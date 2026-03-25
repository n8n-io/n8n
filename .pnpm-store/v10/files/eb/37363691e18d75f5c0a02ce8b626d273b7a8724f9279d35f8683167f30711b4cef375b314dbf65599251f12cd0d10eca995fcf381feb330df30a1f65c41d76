"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerDependencies = exports.default = exports.assignDependencies = void 0;
const assignDependencies = (target, ...sources) => {
  if (sources.length === 0) {
    return target;
  }
  for (const source of sources) {
    if (typeof source === 'object' && source !== null) {
      for (const tag of Object.keys(source)) {
        if (typeof tag === 'string') {
          const list = [];
          if (target[tag]) {
            list.push(...target[tag]);
          }
          if (source[tag]) {
            list.push(...source[tag]);
          }
          target[tag] = Array.from(new Set(list));
        } else {
          console.warn('dependency "tag" must be of type string');
        }
      }
    } else {
      console.warn('"dependencies" must be an object.');
    }
  }
  return target;
};
exports.assignDependencies = assignDependencies;
const dependencies = {};
const registerDependencies = dep => {
  assignDependencies(dependencies, dep);
};
exports.registerDependencies = registerDependencies;
var _default = exports.default = dependencies;