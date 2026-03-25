Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const env = require('./env.js');

/**
 * NOTE: In order to avoid circular dependencies, if you add a function to this module and it needs to print something,
 * you must either a) use `console.log` rather than the `debug` singleton, or b) put your function elsewhere.
 */


/**
 * Checks whether we're in the Node.js or Browser environment
 *
 * @returns Answer to given question
 */
function isNodeEnv() {
  // explicitly check for browser bundles as those can be optimized statically
  // by terser/rollup.
  return (
    !env.isBrowserBundle() &&
    Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]'
  );
}

/**
 * Requires a module which is protected against bundler minification.
 *
 * @param request The module path to resolve
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dynamicRequire(mod, request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return mod.require(request);
}

/**
 * Helper for dynamically loading module that should work with linked dependencies.
 * The problem is that we _should_ be using `require(require.resolve(moduleName, { paths: [cwd()] }))`
 * However it's _not possible_ to do that with Webpack, as it has to know all the dependencies during
 * build time. `require.resolve` is also not available in any other way, so we cannot create,
 * a fake helper like we do with `dynamicRequire`.
 *
 * We always prefer to use local package, thus the value is not returned early from each `try/catch` block.
 * That is to mimic the behavior of `require.resolve` exactly.
 *
 * @param moduleName module name to require
 * @param existingModule module to use for requiring
 * @returns possibly required module
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadModule(moduleName, existingModule = module) {
  let mod;

  try {
    mod = dynamicRequire(existingModule, moduleName);
  } catch {
    // no-empty
  }

  if (!mod) {
    try {
      const { cwd } = dynamicRequire(existingModule, 'process');
      mod = dynamicRequire(existingModule, `${cwd()}/node_modules/${moduleName}`) ;
    } catch {
      // no-empty
    }
  }

  return mod;
}

exports.isNodeEnv = isNodeEnv;
exports.loadModule = loadModule;
//# sourceMappingURL=node.js.map
