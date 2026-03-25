Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const components = require('./vendor/components.js');

const attachErrorHandler = (app, options) => {
  const { errorHandler: originalErrorHandler } = app.config;

  app.config.errorHandler = (error, vm, lifecycleHook) => {
    const componentName = components.formatComponentName(vm, false);
    const trace = vm ? components.generateComponentTrace(vm) : '';
    const metadata = {
      componentName,
      lifecycleHook,
      trace,
    };

    // TODO(v11): guard via sendDefaultPii?
    if (options?.attachProps !== false && vm) {
      // Vue2 - $options.propsData
      // Vue3 - $props
      if (vm.$options?.propsData) {
        metadata.propsData = vm.$options.propsData;
      } else if (vm.$props) {
        metadata.propsData = vm.$props;
      }
    }

    // Capture exception in the next event loop, to make sure that all breadcrumbs are recorded in time.
    setTimeout(() => {
      core.captureException(error, {
        captureContext: { contexts: { vue: metadata } },
        mechanism: { handled: !!originalErrorHandler, type: 'auto.function.vue.error_handler' },
      });
    });

    // Check if the current `app.config.errorHandler` is explicitly set by the user before calling it.
    if (typeof originalErrorHandler === 'function' && app.config.errorHandler) {
      (originalErrorHandler ).call(app, error, vm, lifecycleHook);
    } else {
      throw error;
    }
  };
};

exports.attachErrorHandler = attachErrorHandler;
//# sourceMappingURL=errorhandler.js.map
