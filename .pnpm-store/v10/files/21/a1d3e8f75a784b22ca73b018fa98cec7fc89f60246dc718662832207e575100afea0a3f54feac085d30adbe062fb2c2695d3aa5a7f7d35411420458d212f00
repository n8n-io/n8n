
// Node imports this from 'internal/bootstrap/loaders'
const Module = require('module');
const NativeModule = {
  canBeRequiredByUsers(specifier) {
    return Module.builtinModules.includes(specifier)
  }
};
exports.NativeModule = NativeModule;
