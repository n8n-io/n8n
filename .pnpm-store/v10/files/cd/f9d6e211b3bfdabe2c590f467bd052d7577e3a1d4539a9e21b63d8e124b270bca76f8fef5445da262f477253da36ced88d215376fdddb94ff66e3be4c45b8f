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
      exports$1 => exports$1,
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
          exports$1 => exports$1,
        ),
      ],
    );
    return module;
  }

  /**
   * Core patch logic applying instrumentation to the LangGraph module.
   */
   _patch(exports$1) {
    // Patch StateGraph.compile to instrument both compile() and invoke()
    if (exports$1.StateGraph && typeof exports$1.StateGraph === 'function') {
      core.instrumentLangGraph(
        exports$1.StateGraph.prototype ,
        this.getConfig(),
      );
    }

    return exports$1;
  }
}

exports.SentryLangGraphInstrumentation = SentryLangGraphInstrumentation;
//# sourceMappingURL=instrumentation.js.map
