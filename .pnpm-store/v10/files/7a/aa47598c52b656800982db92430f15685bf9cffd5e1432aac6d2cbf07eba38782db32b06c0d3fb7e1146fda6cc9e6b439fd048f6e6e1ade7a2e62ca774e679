import { EventEmitter } from 'events';
/**
 * This module defines an ad-hoc debug logger for Google Cloud Platform
 * client libraries in Node. An ad-hoc debug logger is a tool which lets
 * users use an external, unified interface (in this case, environment
 * variables) to determine what logging they want to see at runtime. This
 * isn't necessarily fed into the console, but is meant to be under the
 * control of the user. The kind of logging that will be produced by this
 * is more like "call retry happened", not "events you'd want to record
 * in Cloud Logger".
 *
 * More for Googlers implementing libraries with it:
 * go/cloud-client-logging-design
 */
/**
 * Possible log levels. These are a subset of Cloud Observability levels.
 * https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
 */
export declare enum LogSeverity {
    DEFAULT = "DEFAULT",
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR"
}
/**
 * A set of suggested log metadata fields.
 */
export interface LogFields {
    /**
     * Log level - undefined/null === DEFAULT.
     */
    severity?: LogSeverity;
    /**
     * If this log is associated with an OpenTelemetry trace, you can put the
     * trace ID here to pass on that association.
     */
    telemetryTraceId?: string;
    /**
     * If this log is associated with an OpenTelemetry trace, you can put the
     * span ID here to pass on that association.
     */
    telemetrySpanId?: string;
    /**
     * This is a catch-all for any other items you might want to go into
     * structured logs. Library implementers, please see the spec docs above
     * for the items envisioned to go here.
     */
    other?: unknown;
}
/**
 * Adds typings for event sinks.
 */
export declare interface AdhocDebugLogger {
    on(event: 'log', listener: (fields: LogFields, args: unknown[]) => void): this;
    on(event: string, listener: Function): this;
}
/**
 * Our logger instance. This actually contains the meat of dealing
 * with log lines, including EventEmitter. This contains the function
 * that will be passed back to users of the package.
 */
export declare class AdhocDebugLogger extends EventEmitter {
    namespace: string;
    upstream: AdhocDebugLogCallable;
    func: AdhocDebugLogFunction;
    /**
     * @param upstream The backend will pass a function that will be
     *   called whenever our logger function is invoked.
     */
    constructor(namespace: string, upstream: AdhocDebugLogCallable);
    invoke(fields: LogFields, ...args: unknown[]): void;
    invokeSeverity(severity: LogSeverity, ...args: unknown[]): void;
}
/**
 * This can be used in place of a real logger while waiting for Promises or disabling logging.
 */
export declare const placeholder: AdhocDebugLogFunction;
/**
 * When the user receives a log function (below), this will be the basic function
 * call interface for it.
 */
export interface AdhocDebugLogCallable {
    (fields: LogFields, ...args: unknown[]): void;
}
/**
 * Adds typing info for the EventEmitter we're adding to the returned function.
 *
 * Note that this interface may change at any time, as we're reserving the
 * right to add new backends at the logger level.
 *
 * @private
 * @internal
 */
export interface AdhocDebugLogFunction extends AdhocDebugLogCallable {
    instance: AdhocDebugLogger;
    on(event: 'log', listener: (fields: LogFields, args: unknown[]) => void): this;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    sublog(namespace: string): AdhocDebugLogFunction;
}
/**
 * One of these can be passed to support a third-party backend, like "debug".
 * We're splitting this out because ESM can complicate optional module loading.
 *
 * Note that this interface may change at any time, as we're reserving the
 * right to add new backends at the logger level.
 *
 * @private
 * @internal
 */
export interface DebugLogBackend {
    /**
     * Outputs a log to this backend.
     *
     * @param namespace The "system" that will be used for filtering. This may also
     *   include a "subsystem" in the form "system:subsystem".
     * @param fields Logging fields to be included as metadata.
     * @param args Any parameters to passed to a utils.format() type formatter.
     */
    log(namespace: string, fields: LogFields, ...args: unknown[]): void;
    /**
     * Passes in the system/subsystem filters from the global environment variables.
     * This lets the backend merge with any native ones.
     *
     * @param filters A list of wildcards matching systems or system:subsystem pairs.
     */
    setFilters(filters: string[]): void;
}
/**
 * The base class for debug logging backends. It's possible to use this, but the
 * same non-guarantees above still apply (unstable interface, etc).
 *
 * @private
 * @internal
 */
export declare abstract class DebugLogBackendBase implements DebugLogBackend {
    cached: Map<string, AdhocDebugLogCallable>;
    filters: string[];
    filtersSet: boolean;
    constructor();
    /**
     * Creates a callback function that we can call to send log lines out.
     *
     * @param namespace The system/subsystem namespace.
     */
    abstract makeLogger(namespace: string): AdhocDebugLogCallable;
    /**
     * Provides a callback for the subclass to hook if it needs to do something
     * specific with `this.filters`.
     */
    abstract setFilters(): void;
    log(namespace: string, fields: LogFields, ...args: unknown[]): void;
}
/**
 * @returns A backend based on Node util.debuglog; this is the default.
 */
export declare function getNodeBackend(): DebugLogBackend;
type DebugPackage = any;
/**
 * Creates a "debug" package backend. The user must call require('debug') and pass
 * the resulting object to this function.
 *
 * ```
 *  setBackend(getDebugBackend(require('debug')))
 * ```
 *
 * https://www.npmjs.com/package/debug
 *
 * Note: Google does not explicitly endorse or recommend this package; it's just
 * being provided as an option.
 *
 * @returns A backend based on the npm "debug" package.
 */
export declare function getDebugBackend(debugPkg: DebugPackage): DebugLogBackend;
/**
 * Creates a "structured logging" backend. This pretty much works like the
 * Node logger, but it outputs structured logging JSON matching Google
 * Cloud's ingestion specs instead of plain text.
 *
 * ```
 *  setBackend(getStructuredBackend())
 * ```
 *
 * @param upstream If you want to use something besides the Node backend to
 *   write the actual log lines into, pass that here.
 * @returns A backend based on Google Cloud structured logging.
 */
export declare function getStructuredBackend(upstream?: DebugLogBackend): DebugLogBackend;
/**
 * The environment variables that we standardized on, for all ad-hoc logging.
 */
export declare const env: {
    /**
     * Filter wildcards specific to the Node syntax, and similar to the built-in
     * utils.debuglog() environment variable. If missing, disables logging.
     */
    nodeEnables: string;
};
/**
 * Set the backend to use for our log output.
 * - A backend object
 * - null to disable logging
 * - undefined for "nothing yet", defaults to the Node backend
 *
 * @param backend Results from one of the get*Backend() functions.
 */
export declare function setBackend(backend: DebugLogBackend | null | undefined): void;
/**
 * Creates a logging function. Multiple calls to this with the same namespace
 * will produce the same logger, with the same event emitter hooks.
 *
 * Namespaces can be a simple string ("system" name), or a qualified string
 * (system:subsystem), which can be used for filtering, or for "system:*".
 *
 * @param namespace The namespace, a descriptive text string.
 * @returns A function you can call that works similar to console.log().
 */
export declare function log(namespace: string, parent?: AdhocDebugLogFunction): AdhocDebugLogFunction;
export {};
