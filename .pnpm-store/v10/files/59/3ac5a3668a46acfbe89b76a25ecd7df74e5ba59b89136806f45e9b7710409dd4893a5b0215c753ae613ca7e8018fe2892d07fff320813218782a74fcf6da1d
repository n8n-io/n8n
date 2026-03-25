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
   _patch(exports) {
    let result = exports;
    result = this._patchClient(result, 'OpenAI');
    result = this._patchClient(result, 'AzureOpenAI');
    return result;
  }

  /**
   * Patch logic applying instrumentation to the specified client constructor.
   */
   _patchClient(exports, exportKey) {
    const Original = exports[exportKey];
    if (!Original) {
      return exports;
    }

    const config = this.getConfig();

    const WrappedOpenAI = function ( ...args) {
      // Check if wrapping should be skipped (e.g., when LangChain is handling instrumentation)
      if (core._INTERNAL_shouldSkipAiProviderWrapping(core.OPENAI_INTEGRATION_NAME)) {
        return Reflect.construct(Original, args) ;
      }

      const instance = Reflect.construct(Original, args);
      const client = core.getClient();
      const defaultPii = Boolean(client?.getOptions().sendDefaultPii);

      const recordInputs = config.recordInputs ?? defaultPii;
      const recordOutputs = config.recordOutputs ?? defaultPii;

      return core.instrumentOpenAiClient(instance , {
        recordInputs,
        recordOutputs,
      });
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
      exports[exportKey] = WrappedOpenAI;
    } catch (error) {
      // If direct assignment fails, override the property descriptor
      Object.defineProperty(exports, exportKey, {
        value: WrappedOpenAI,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    // Wrap the default export if it points to the original constructor
    // Constructor replacement - handle read-only properties
    // The OpenAI property might have only a getter, so use defineProperty
    if (exports.default === Original) {
      try {
        exports.default = WrappedOpenAI;
      } catch (error) {
        // If direct assignment fails, override the property descriptor
        Object.defineProperty(exports, 'default', {
          value: WrappedOpenAI,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }
    return exports;
  }
}

exports.SentryOpenAiInstrumentation = SentryOpenAiInstrumentation;
//# sourceMappingURL=instrumentation.js.map
