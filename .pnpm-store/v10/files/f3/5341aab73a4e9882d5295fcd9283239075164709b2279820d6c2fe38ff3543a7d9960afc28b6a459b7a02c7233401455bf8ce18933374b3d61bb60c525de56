// Copied from https://github.com/nodejs/node/blob/v17.0.1/lib/internal/modules/cjs/helpers.js

'use strict';

const {
  ArrayPrototypeForEach,
  ObjectDefineProperty,
  ObjectPrototypeHasOwnProperty,
  SafeSet,
  StringPrototypeIncludes,
  StringPrototypeStartsWith,
} = require('./node-primordials');

const { getOptionValue } = require('./node-options');
const userConditions = getOptionValue('--conditions');

const noAddons = getOptionValue('--no-addons');
const addonConditions = noAddons ? [] : ['node-addons'];

// TODO: Use this set when resolving pkg#exports conditions in loader.js.
const cjsConditions = new SafeSet([
  'require',
  'node',
  ...addonConditions,
  ...userConditions,
]);

/**
 * @param {any} object
 * @param {string} [dummyModuleName]
 * @return {void}
 */
function addBuiltinLibsToObject(object, dummyModuleName) {
  // Make built-in modules available directly (loaded lazily).
  const Module = require('module').Module;
  const { builtinModules } = Module;

  // To require built-in modules in user-land and ignore modules whose
  // `canBeRequiredByUsers` is false. So we create a dummy module object and not
  // use `require()` directly.
  const dummyModule = new Module(dummyModuleName);

  ArrayPrototypeForEach(builtinModules, (name) => {
    // Neither add underscored modules, nor ones that contain slashes (e.g.,
    // 'fs/promises') or ones that are already defined.
    if (StringPrototypeStartsWith(name, '_') ||
        StringPrototypeIncludes(name, '/') ||
        ObjectPrototypeHasOwnProperty(object, name)) {
      return;
    }
    // Goals of this mechanism are:
    // - Lazy loading of built-in modules
    // - Having all built-in modules available as non-enumerable properties
    // - Allowing the user to re-assign these variables as if there were no
    //   pre-existing globals with the same name.

    const setReal = (val) => {
      // Deleting the property before re-assigning it disables the
      // getter/setter mechanism.
      delete object[name];
      object[name] = val;
    };

    ObjectDefineProperty(object, name, {
      get: () => {
        // Node 12 hack; remove when we drop node12 support
        const lib = (dummyModule.require || require)(name);

        // Disable the current getter/setter and set up a new
        // non-enumerable property.
        delete object[name];
        ObjectDefineProperty(object, name, {
          get: () => lib,
          set: setReal,
          configurable: true,
          enumerable: false
        });

        return lib;
      },
      set: setReal,
      configurable: true,
      enumerable: false
    });
  });
}

exports.addBuiltinLibsToObject = addBuiltinLibsToObject;
exports.cjsConditions = cjsConditions;
