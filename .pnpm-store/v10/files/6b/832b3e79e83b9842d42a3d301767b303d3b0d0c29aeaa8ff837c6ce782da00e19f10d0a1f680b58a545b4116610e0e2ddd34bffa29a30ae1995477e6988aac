/**
 * Inline definitions of LaunchDarkly types so we don't have to include their
 * SDK in devDependencies. These are only for type-checking and can be extended
 * as needed - for exact definitions, reference `launchdarkly-js-client-sdk`.
 */
/**
 * Currently, the Sentry integration does not read from values of this type.
 */
export type LDContext = object;
/**
 * An object that combines the result of a feature flag evaluation with information about
 * how it was calculated.
 */
export interface LDEvaluationDetail {
    value: unknown;
}
/**
 * Callback interface for collecting information about the SDK at runtime.
 *
 * This interface is used to collect information about flag usage.
 *
 * This interface should not be used by the application to access flags for the purpose of controlling application
 * flow. It is intended for monitoring, analytics, or debugging purposes.
 */
export interface LDInspectionFlagUsedHandler {
    type: 'flag-used';
    /**
     * Name of the inspector. Will be used for logging issues with the inspector.
     */
    name: string;
    /**
     * If `true`, then the inspector will be ran synchronously with evaluation.
     * Synchronous inspectors execute inline with evaluation and care should be taken to ensure
     * they have minimal performance overhead.
     */
    synchronous?: boolean;
    /**
     * This method is called when a flag is accessed via a variation method, or it can be called based on actions in
     * wrapper SDKs which have different methods of tracking when a flag was accessed. It is not called when a call is made
     * to allFlags.
     */
    method: (flagKey: string, flagDetail: LDEvaluationDetail, context: LDContext) => void;
}
//# sourceMappingURL=types.d.ts.map
