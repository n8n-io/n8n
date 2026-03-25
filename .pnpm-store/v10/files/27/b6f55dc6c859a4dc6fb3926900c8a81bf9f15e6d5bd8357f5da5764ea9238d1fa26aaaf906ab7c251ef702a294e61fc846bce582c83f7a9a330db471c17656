Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const ModulePatch = require('@apm-js-collab/tracing-hooks');
const core = require('@sentry/core');
const moduleModule = require('module');
const detection = require('../utils/detection.js');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
let instrumentationConfigs;

/**
 * Add an instrumentation config to be used by the injection loader.
 */
function addInstrumentationConfig(config) {
  if (!detection.supportsEsmLoaderHooks()) {
    return;
  }

  if (!instrumentationConfigs) {
    instrumentationConfigs = [];
  }

  instrumentationConfigs.push(config);

  core.GLOBAL_OBJ._sentryInjectLoaderHookRegister = () => {
    if (core.GLOBAL_OBJ._sentryInjectLoaderHookRegistered) {
      return;
    }

    core.GLOBAL_OBJ._sentryInjectLoaderHookRegistered = true;

    const instrumentations = instrumentationConfigs || [];

    // Patch require to support CJS modules
    const requirePatch = new ModulePatch.default({ instrumentations });
    requirePatch.patch();

    // Add ESM loader to support ESM modules
    try {
      // @ts-expect-error register is available in these versions
      moduleModule.register('@apm-js-collab/tracing-hooks/hook.mjs', (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('sdk/injectLoader.js', document.baseURI).href)), {
        data: { instrumentations },
      });
    } catch (error) {
      core.debug.warn("Failed to register '@apm-js-collab/tracing-hooks' hook", error);
    }
  };
}

exports.addInstrumentationConfig = addInstrumentationConfig;
//# sourceMappingURL=injectLoader.js.map
