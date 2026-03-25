import { debug as coreDebug } from '@sentry/core';
interface LoggerConfig {
    captureExceptions: boolean;
    traceInternals: boolean;
}
type CoreDebugLogger = typeof coreDebug;
interface ReplayDebugLogger extends CoreDebugLogger {
    /**
     * Calls `debug.log` but saves breadcrumb in the next tick due to race
     * conditions before replay is initialized.
     */
    infoTick: CoreDebugLogger['log'];
    /**
     * Captures exceptions (`Error`) if "capture internal exceptions" is enabled
     */
    exception: CoreDebugLogger['error'];
    /**
     * Configures the logger with additional debugging behavior
     */
    setConfig(config: Partial<LoggerConfig>): void;
}
export declare const debug: ReplayDebugLogger;
export {};
//# sourceMappingURL=logger.d.ts.map
