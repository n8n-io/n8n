import { GLOBAL_OBJ, defineIntegration, consoleSandbox, hasSpansEnabled } from '@sentry/core';
import { DEFAULT_HOOKS } from './constants.js';
import { DEBUG_BUILD } from './debug-build.js';
import { attachErrorHandler } from './errorhandler.js';
import { createTracingMixins } from './tracing.js';

const globalWithVue = GLOBAL_OBJ ;

const DEFAULT_CONFIG = {
  Vue: globalWithVue.Vue,
  attachProps: true,
  attachErrorHandler: true,
  tracingOptions: {
    hooks: DEFAULT_HOOKS,
    timeout: 2000,
    trackComponents: false,
  },
};

const INTEGRATION_NAME = 'Vue';

const vueIntegration = defineIntegration((integrationOptions = {}) => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      const options = { ...DEFAULT_CONFIG, ...client.getOptions(), ...integrationOptions };
      if (!options.Vue && !options.app) {
        consoleSandbox(() => {
          // eslint-disable-next-line no-console
          console.warn(
            '[@sentry/vue]: Misconfigured SDK. Vue specific errors will not be captured. Update your `Sentry.init` call with an appropriate config option: `app` (Application Instance - Vue 3) or `Vue` (Vue Constructor - Vue 2).',
          );
        });
        return;
      }

      if (options.app) {
        const apps = Array.isArray(options.app) ? options.app : [options.app];
        apps.forEach(app => vueInit(app, options));
      } else if (options.Vue) {
        vueInit(options.Vue, options);
      }
    },
  };
});

const vueInit = (app, options) => {
  if (DEBUG_BUILD) {
    // Check app is not mounted yet - should be mounted _after_ init()!
    // This is _somewhat_ private, but in the case that this doesn't exist we simply ignore it
    // See: https://github.com/vuejs/core/blob/eb2a83283caa9de0a45881d860a3cbd9d0bdd279/packages/runtime-core/src/component.ts#L394
    const appWithInstance = app

;

    const isMounted = appWithInstance._instance?.isMounted;
    if (isMounted === true) {
      consoleSandbox(() => {
        // eslint-disable-next-line no-console
        console.warn(
          '[@sentry/vue]: Misconfigured SDK. Vue app is already mounted. Make sure to call `app.mount()` after `Sentry.init()`.',
        );
      });
    }
  }

  if (options.attachErrorHandler) {
    attachErrorHandler(app, options);
  }

  if (hasSpansEnabled(options)) {
    app.mixin(createTracingMixins(options.tracingOptions));
  }
};

export { vueIntegration };
//# sourceMappingURL=integration.js.map
