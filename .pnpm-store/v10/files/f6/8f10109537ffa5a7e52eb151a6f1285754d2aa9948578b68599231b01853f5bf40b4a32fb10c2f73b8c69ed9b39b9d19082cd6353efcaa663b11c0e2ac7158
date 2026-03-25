Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const core = require('@sentry/core');
const integration = require('./integration.js');

/**
 * Inits the Vue SDK
 */
function init(options = {}) {
  const opts = {
    defaultIntegrations: [...browser.getDefaultIntegrations(options), integration.vueIntegration()],
    ...options,
  };

  core.applySdkMetadata(opts, 'vue');

  return browser.init(opts);
}

exports.init = init;
//# sourceMappingURL=sdk.js.map
