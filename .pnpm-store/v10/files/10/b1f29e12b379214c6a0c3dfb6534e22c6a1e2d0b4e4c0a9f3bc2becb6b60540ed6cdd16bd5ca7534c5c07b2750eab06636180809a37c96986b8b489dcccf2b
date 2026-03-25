Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('@opentelemetry/instrumentation');
const core = require('@sentry/core');
const constants = require('./constants.js');

const SUPPORTED_VERSIONS = ['>=3.0.0 <7'];

// List of patched methods
// From: https://sdk.vercel.ai/docs/ai-sdk-core/telemetry#collected-data
const INSTRUMENTED_METHODS = [
  'generateText',
  'streamText',
  'generateObject',
  'streamObject',
  'embed',
  'embedMany',
] ;

function isToolError(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj ;
  return (
    'type' in candidate &&
    'error' in candidate &&
    'toolName' in candidate &&
    'toolCallId' in candidate &&
    candidate.type === 'tool-error' &&
    candidate.error instanceof Error
  );
}

/**
 * Check for tool errors in the result and capture them
 * Tool errors are not rejected in Vercel V5, it is added as metadata to the result content
 */
function checkResultForToolErrors(result) {
  if (typeof result !== 'object' || result === null || !('content' in result)) {
    return;
  }

  const resultObj = result ;
  if (!Array.isArray(resultObj.content)) {
    return;
  }

  for (const item of resultObj.content) {
    if (isToolError(item)) {
      // Try to get the span associated with this tool call ID
      const associatedSpan = core._INTERNAL_getSpanForToolCallId(item.toolCallId) ;

      if (associatedSpan) {
        // We have the span, so link the error using span and trace IDs from the span
        const spanContext = associatedSpan.spanContext();

        core.withScope(scope => {
          // Set the span and trace context for proper linking
          scope.setContext('trace', {
            trace_id: spanContext.traceId,
            span_id: spanContext.spanId,
          });

          scope.setTag('vercel.ai.tool.name', item.toolName);
          scope.setTag('vercel.ai.tool.callId', item.toolCallId);

          scope.setLevel('error');

          core.captureException(item.error, {
            mechanism: {
              type: 'auto.vercelai.otel',
              handled: false,
            },
          });
        });

        // Clean up the span mapping since we've processed this tool error
        // We won't get multiple { type: 'tool-error' } parts for the same toolCallId.
        core._INTERNAL_cleanupToolCallSpan(item.toolCallId);
      } else {
        // Fallback: capture without span linking
        core.withScope(scope => {
          scope.setTag('vercel.ai.tool.name', item.toolName);
          scope.setTag('vercel.ai.tool.callId', item.toolCallId);
          scope.setLevel('error');

          core.captureException(item.error, {
            mechanism: {
              type: 'auto.vercelai.otel',
              handled: false,
            },
          });
        });
      }
    }
  }
}

/**
 * Determines whether to record inputs and outputs for Vercel AI telemetry based on the configuration hierarchy.
 *
 * The order of precedence is:
 * 1. The vercel ai integration options
 * 2. The experimental_telemetry options in the vercel ai method calls
 * 3. When telemetry is explicitly enabled (isEnabled: true), default to recording
 * 4. Otherwise, use the sendDefaultPii option from client options
 */
function determineRecordingSettings(
  integrationRecordingOptions,
  methodTelemetryOptions,
  telemetryExplicitlyEnabled,
  defaultRecordingEnabled,
) {
  const recordInputs =
    integrationRecordingOptions?.recordInputs !== undefined
      ? integrationRecordingOptions.recordInputs
      : methodTelemetryOptions.recordInputs !== undefined
        ? methodTelemetryOptions.recordInputs
        : telemetryExplicitlyEnabled === true
          ? true // When telemetry is explicitly enabled, default to recording inputs
          : defaultRecordingEnabled;

  const recordOutputs =
    integrationRecordingOptions?.recordOutputs !== undefined
      ? integrationRecordingOptions.recordOutputs
      : methodTelemetryOptions.recordOutputs !== undefined
        ? methodTelemetryOptions.recordOutputs
        : telemetryExplicitlyEnabled === true
          ? true // When telemetry is explicitly enabled, default to recording inputs
          : defaultRecordingEnabled;

  return { recordInputs, recordOutputs };
}

/**
 * This detects is added by the Sentry Vercel AI Integration to detect if the integration should
 * be enabled.
 *
 * It also patches the `ai` module to enable Vercel AI telemetry automatically for all methods.
 */
class SentryVercelAiInstrumentation extends instrumentation.InstrumentationBase {
   __init() {this._isPatched = false;}
   __init2() {this._callbacks = [];}

   constructor(config = {}) {
    super('@sentry/instrumentation-vercel-ai', core.SDK_VERSION, config);SentryVercelAiInstrumentation.prototype.__init.call(this);SentryVercelAiInstrumentation.prototype.__init2.call(this);  }

  /**
   * Initializes the instrumentation by defining the modules to be patched.
   */
   init() {
    const module = new instrumentation.InstrumentationNodeModuleDefinition('ai', SUPPORTED_VERSIONS, this._patch.bind(this));
    return module;
  }

  /**
   * Call the provided callback when the module is patched.
   * If it has already been patched, the callback will be called immediately.
   */
   callWhenPatched(callback) {
    if (this._isPatched) {
      callback();
    } else {
      this._callbacks.push(callback);
    }
  }

  /**
   * Patches module exports to enable Vercel AI telemetry.
   */
   _patch(moduleExports) {
    this._isPatched = true;

    this._callbacks.forEach(callback => callback());
    this._callbacks = [];

    const generatePatch = (originalMethod) => {
      return new Proxy(originalMethod, {
        apply: (target, thisArg, args) => {
          const existingExperimentalTelemetry = args[0].experimental_telemetry || {};
          const isEnabled = existingExperimentalTelemetry.isEnabled;

          const client = core.getClient();
          const integration = client?.getIntegrationByName(constants.INTEGRATION_NAME);
          const integrationOptions = integration?.options;
          const shouldRecordInputsAndOutputs = integration ? Boolean(client?.getOptions().sendDefaultPii) : false;

          const { recordInputs, recordOutputs } = determineRecordingSettings(
            integrationOptions,
            existingExperimentalTelemetry,
            isEnabled,
            shouldRecordInputsAndOutputs,
          );

          args[0].experimental_telemetry = {
            ...existingExperimentalTelemetry,
            isEnabled: isEnabled !== undefined ? isEnabled : true,
            recordInputs,
            recordOutputs,
          };

          return core.handleCallbackErrors(
            () => Reflect.apply(target, thisArg, args),
            error => {
              // This error bubbles up to unhandledrejection handler (if not handled before),
              // where we do not know the active span anymore
              // So to circumvent this, we set the active span on the error object
              // which is picked up by the unhandledrejection handler
              if (error && typeof error === 'object') {
                core.addNonEnumerableProperty(error, '_sentry_active_span', core.getActiveSpan());
              }
            },
            () => {},
            result => {
              checkResultForToolErrors(result);
            },
          );
        },
      });
    };

    // Is this an ESM module?
    // https://tc39.es/ecma262/#sec-module-namespace-objects
    if (Object.prototype.toString.call(moduleExports) === '[object Module]') {
      // In ESM we take the usual route and just replace the exports we want to instrument
      for (const method of INSTRUMENTED_METHODS) {
        moduleExports[method] = generatePatch(moduleExports[method]);
      }

      return moduleExports;
    } else {
      // In CJS we can't replace the exports in the original module because they
      // don't have setters, so we create a new object with the same properties
      const patchedModuleExports = INSTRUMENTED_METHODS.reduce((acc, curr) => {
        acc[curr] = generatePatch(moduleExports[curr]);
        return acc;
      }, {} );

      return { ...moduleExports, ...patchedModuleExports };
    }
  }
}

exports.SentryVercelAiInstrumentation = SentryVercelAiInstrumentation;
exports.determineRecordingSettings = determineRecordingSettings;
//# sourceMappingURL=instrumentation.js.map
