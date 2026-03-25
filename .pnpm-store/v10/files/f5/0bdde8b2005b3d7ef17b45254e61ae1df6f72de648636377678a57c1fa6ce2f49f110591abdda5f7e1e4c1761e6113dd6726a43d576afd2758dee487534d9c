Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');

const supportedVersions = ['>=0.0.0 <2.0.0'];

/**
 * Sentry LangGraph instrumentation using OpenTelemetry.
 */
class SentryLangGraphInstrumentation extends instrumentation.InstrumentationBase {
   constructor(config = {}) {
    super('@sentry/instrumentation-langgraph', core.SDK_VERSION, config);
  }

  /**
   * Initializes the instrumentation by defining the modules to be patched.
   */
   init() {
    const module = new instrumentation.InstrumentationNodeModuleDefinition(
      '@langchain/langgraph',
      supportedVersions,
      this._patch.bind(this),
      exports => exports,
      [
        new instrumentation.InstrumentationNodeModuleFile(
          /**
           * In CJS, LangGraph packages re-export from dist/index.cjs files.
           * Patching only the root module sometimes misses the real implementation or
           * gets overwritten when that file is loaded. We add a file-level patch so that
           * _patch runs again on the concrete implementation
           */
          '@langchain/langgraph/dist/index.cjs',
          supportedVersions,
          this._patch.bind(this),
          exports => exports,
        ),
      ],
    );
    return module;
  }

  /**
   * Core patch logic applying instrumentation to the LangGraph module.
   */
   _patch(exports) {
    const client = core.getClient();
    const defaultPii = Boolean(client?.getOptions().sendDefaultPii);

    const config = this.getConfig();
    const recordInputs = config.recordInputs ?? defaultPii;
    const recordOutputs = config.recordOutputs ?? defaultPii;

    const options = {
      recordInputs,
      recordOutputs,
    };

    // Patch StateGraph.compile to instrument both compile() and invoke()
    if (exports.StateGraph && typeof exports.StateGraph === 'function') {
      const StateGraph = exports.StateGraph

;

      StateGraph.prototype.compile = core.instrumentStateGraphCompile(
        StateGraph.prototype.compile ,
        options,
      );
    }

    return exports;
  }
}

exports.SentryLangGraphInstrumentation = SentryLangGraphInstrumentation;
//# sourceMappingURL=instrumentation.js.map
