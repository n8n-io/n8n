Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');

const supportedVersions = ['>=0.19.2 <1.0.0'];

/**
 * Sentry Anthropic AI instrumentation using OpenTelemetry.
 */
class SentryAnthropicAiInstrumentation extends instrumentation.InstrumentationBase {
   constructor(config = {}) {
    super('@sentry/instrumentation-anthropic-ai', core.SDK_VERSION, config);
  }

  /**
   * Initializes the instrumentation by defining the modules to be patched.
   */
   init() {
    const module = new instrumentation.InstrumentationNodeModuleDefinition(
      '@anthropic-ai/sdk',
      supportedVersions,
      this._patch.bind(this),
    );
    return module;
  }

  /**
   * Core patch logic applying instrumentation to the Anthropic AI client constructor.
   */
   _patch(exports$1) {
    const Original = exports$1.Anthropic;

    const config = this.getConfig();

    const WrappedAnthropic = function ( ...args) {
      // Check if wrapping should be skipped (e.g., when LangChain is handling instrumentation)
      if (core._INTERNAL_shouldSkipAiProviderWrapping(core.ANTHROPIC_AI_INTEGRATION_NAME)) {
        return Reflect.construct(Original, args) ;
      }

      const instance = Reflect.construct(Original, args);

      return core.instrumentAnthropicAiClient(instance , config);
    } ;

    // Preserve static and prototype chains
    Object.setPrototypeOf(WrappedAnthropic, Original);
    Object.setPrototypeOf(WrappedAnthropic.prototype, Original.prototype);

    for (const key of Object.getOwnPropertyNames(Original)) {
      if (!['length', 'name', 'prototype'].includes(key)) {
        const descriptor = Object.getOwnPropertyDescriptor(Original, key);
        if (descriptor) {
          Object.defineProperty(WrappedAnthropic, key, descriptor);
        }
      }
    }

    // Constructor replacement - handle read-only properties
    // The Anthropic property might have only a getter, so use defineProperty
    try {
      exports$1.Anthropic = WrappedAnthropic;
    } catch {
      // If direct assignment fails, override the property descriptor
      Object.defineProperty(exports$1, 'Anthropic', {
        value: WrappedAnthropic,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    // Wrap the default export if it points to the original constructor
    // Constructor replacement - handle read-only properties
    // The Anthropic property might have only a getter, so use defineProperty
    if (exports$1.default === Original) {
      try {
        exports$1.default = WrappedAnthropic;
      } catch {
        // If direct assignment fails, override the property descriptor
        Object.defineProperty(exports$1, 'default', {
          value: WrappedAnthropic,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }
    return exports$1;
  }
}

exports.SentryAnthropicAiInstrumentation = SentryAnthropicAiInstrumentation;
//# sourceMappingURL=instrumentation.js.map
