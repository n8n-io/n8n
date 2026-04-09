Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');

const supportedVersions = ['>=0.10.0 <2'];

/**
 * Represents the patched shape of the Google GenAI module export.
 */

/**
 * Sentry Google GenAI instrumentation using OpenTelemetry.
 */
class SentryGoogleGenAiInstrumentation extends instrumentation.InstrumentationBase {
   constructor(config = {}) {
    super('@sentry/instrumentation-google-genai', core.SDK_VERSION, config);
  }

  /**
   * Initializes the instrumentation by defining the modules to be patched.
   */
   init() {
    const module = new instrumentation.InstrumentationNodeModuleDefinition(
      '@google/genai',
      supportedVersions,
      exports$1 => this._patch(exports$1),
      exports$1 => exports$1,
      // In CJS, @google/genai re-exports from (dist/node/index.cjs) file.
      // Patching only the root module sometimes misses the real implementation or
      // gets overwritten when that file is loaded. We add a file-level patch so that
      // _patch runs again on the concrete implementation
      [
        new instrumentation.InstrumentationNodeModuleFile(
          '@google/genai/dist/node/index.cjs',
          supportedVersions,
          exports$1 => this._patch(exports$1),
          exports$1 => exports$1,
        ),
      ],
    );
    return module;
  }

  /**
   * Core patch logic applying instrumentation to the Google GenAI client constructor.
   */
   _patch(exports$1) {
    const Original = exports$1.GoogleGenAI;
    const config = this.getConfig();

    if (typeof Original !== 'function') {
      return exports$1;
    }

    const WrappedGoogleGenAI = function ( ...args) {
      // Check if wrapping should be skipped (e.g., when LangChain is handling instrumentation)
      if (core._INTERNAL_shouldSkipAiProviderWrapping(core.GOOGLE_GENAI_INTEGRATION_NAME)) {
        return Reflect.construct(Original, args) ;
      }

      const instance = Reflect.construct(Original, args);

      return core.instrumentGoogleGenAIClient(instance, config);
    };

    // Preserve static and prototype chains
    Object.setPrototypeOf(WrappedGoogleGenAI, Original);
    Object.setPrototypeOf(WrappedGoogleGenAI.prototype, Original.prototype);

    for (const key of Object.getOwnPropertyNames(Original)) {
      if (!['length', 'name', 'prototype'].includes(key)) {
        const descriptor = Object.getOwnPropertyDescriptor(Original, key);
        if (descriptor) {
          Object.defineProperty(WrappedGoogleGenAI, key, descriptor);
        }
      }
    }

    // Replace google genai exports with the wrapped constructor
    core.replaceExports(exports$1, 'GoogleGenAI', WrappedGoogleGenAI);

    return exports$1;
  }
}

exports.SentryGoogleGenAiInstrumentation = SentryGoogleGenAiInstrumentation;
//# sourceMappingURL=instrumentation.js.map
