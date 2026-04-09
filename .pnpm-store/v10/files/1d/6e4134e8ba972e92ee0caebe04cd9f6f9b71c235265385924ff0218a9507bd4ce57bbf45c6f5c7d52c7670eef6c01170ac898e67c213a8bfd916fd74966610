Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');

const supportedVersions = ['>=4.0.0 <7'];

/**
 * Sentry OpenAI instrumentation using OpenTelemetry.
 */
class SentryOpenAiInstrumentation extends instrumentation.InstrumentationBase {
   constructor(config = {}) {
    super('@sentry/instrumentation-openai', core.SDK_VERSION, config);
  }

  /**
   * Initializes the instrumentation by defining the modules to be patched.
   */
   init() {
    const module = new instrumentation.InstrumentationNodeModuleDefinition('openai', supportedVersions, this._patch.bind(this));
    return module;
  }

  /**
   * Core patch logic applying instrumentation to the OpenAI and AzureOpenAI client constructors.
   */
   _patch(exports$1) {
    let result = exports$1;
    result = this._patchClient(result, 'OpenAI');
    result = this._patchClient(result, 'AzureOpenAI');
    return result;
  }

  /**
   * Patch logic applying instrumentation to the specified client constructor.
   */
   _patchClient(exports$1, exportKey) {
    const Original = exports$1[exportKey];
    if (!Original) {
      return exports$1;
    }

    const config = this.getConfig();

    const WrappedOpenAI = function ( ...args) {
      // Check if wrapping should be skipped (e.g., when LangChain is handling instrumentation)
      if (core._INTERNAL_shouldSkipAiProviderWrapping(core.OPENAI_INTEGRATION_NAME)) {
        return Reflect.construct(Original, args) ;
      }

      const instance = Reflect.construct(Original, args);

      return core.instrumentOpenAiClient(instance , config);
    } ;

    // Preserve static and prototype chains
    Object.setPrototypeOf(WrappedOpenAI, Original);
    Object.setPrototypeOf(WrappedOpenAI.prototype, Original.prototype);

    for (const key of Object.getOwnPropertyNames(Original)) {
      if (!['length', 'name', 'prototype'].includes(key)) {
        const descriptor = Object.getOwnPropertyDescriptor(Original, key);
        if (descriptor) {
          Object.defineProperty(WrappedOpenAI, key, descriptor);
        }
      }
    }

    // Constructor replacement - handle read-only properties
    // The OpenAI property might have only a getter, so use defineProperty
    try {
      exports$1[exportKey] = WrappedOpenAI;
    } catch {
      // If direct assignment fails, override the property descriptor
      Object.defineProperty(exports$1, exportKey, {
        value: WrappedOpenAI,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    // Wrap the default export if it points to the original constructor
    // Constructor replacement - handle read-only properties
    // The OpenAI property might have only a getter, so use defineProperty
    if (exports$1.default === Original) {
      try {
        exports$1.default = WrappedOpenAI;
      } catch {
        // If direct assignment fails, override the property descriptor
        Object.defineProperty(exports$1, 'default', {
          value: WrappedOpenAI,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }
    return exports$1;
  }
}

exports.SentryOpenAiInstrumentation = SentryOpenAiInstrumentation;
//# sourceMappingURL=instrumentation.js.map
