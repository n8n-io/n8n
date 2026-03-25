import { getDefaultIntegrations, init as init$1 } from '@sentry/browser';
import { applySdkMetadata } from '@sentry/core';
import { vueIntegration } from './integration.js';

/**
 * Inits the Vue SDK
 */
function init(options = {}) {
  const opts = {
    defaultIntegrations: [...getDefaultIntegrations(options), vueIntegration()],
    ...options,
  };

  applySdkMetadata(opts, 'vue');

  return init$1(opts);
}

export { init };
//# sourceMappingURL=sdk.js.map
