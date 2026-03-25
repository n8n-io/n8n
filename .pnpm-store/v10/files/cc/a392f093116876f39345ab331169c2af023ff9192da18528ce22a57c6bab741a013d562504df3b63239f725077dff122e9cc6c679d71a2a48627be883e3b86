import type { InstrumentationConfig, InstrumentationModuleDefinition } from '@opentelemetry/instrumentation';
import { InstrumentationBase } from '@opentelemetry/instrumentation';
interface RecordingOptions {
    recordInputs?: boolean;
    recordOutputs?: boolean;
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
export declare function determineRecordingSettings(integrationRecordingOptions: RecordingOptions | undefined, methodTelemetryOptions: RecordingOptions, telemetryExplicitlyEnabled: boolean | undefined, defaultRecordingEnabled: boolean): {
    recordInputs: boolean;
    recordOutputs: boolean;
};
/**
 * This detects is added by the Sentry Vercel AI Integration to detect if the integration should
 * be enabled.
 *
 * It also patches the `ai` module to enable Vercel AI telemetry automatically for all methods.
 */
export declare class SentryVercelAiInstrumentation extends InstrumentationBase {
    private _isPatched;
    private _callbacks;
    constructor(config?: InstrumentationConfig);
    /**
     * Initializes the instrumentation by defining the modules to be patched.
     */
    init(): InstrumentationModuleDefinition;
    /**
     * Call the provided callback when the module is patched.
     * If it has already been patched, the callback will be called immediately.
     */
    callWhenPatched(callback: () => void): void;
    /**
     * Patches module exports to enable Vercel AI telemetry.
     */
    private _patch;
}
export {};
//# sourceMappingURL=instrumentation.d.ts.map