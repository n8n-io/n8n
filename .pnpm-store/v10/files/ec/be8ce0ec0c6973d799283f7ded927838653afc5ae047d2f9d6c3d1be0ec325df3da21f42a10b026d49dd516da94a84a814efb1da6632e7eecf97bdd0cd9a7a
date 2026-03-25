import { ComponentLoggerOptions, DiagLogger } from './types';
/**
 * Component Logger which is meant to be used as part of any component which
 * will add automatically additional namespace in front of the log message.
 * It will then forward all message to global diag logger
 * @example
 * const cLogger = diag.createComponentLogger({ namespace: '@opentelemetry/instrumentation-http' });
 * cLogger.debug('test');
 * // @opentelemetry/instrumentation-http test
 */
export declare class DiagComponentLogger implements DiagLogger {
    private _namespace;
    constructor(props: ComponentLoggerOptions);
    debug(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    verbose(...args: any[]): void;
}
//# sourceMappingURL=ComponentLogger.d.ts.map