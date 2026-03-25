import { ApplicationTelemetry } from "../../config/ClientConfiguration.js";
import { Logger } from "../../logger/Logger.js";
import { InProgressPerformanceEvent, IPerformanceClient, PerformanceCallbackFunction, QueueMeasurement } from "./IPerformanceClient.js";
import { PerformanceEvent, PerformanceEventContext, PerformanceEvents, PerformanceEventStackedContext } from "./PerformanceEvent.js";
import { IPerformanceMeasurement } from "./IPerformanceMeasurement.js";
import { AccountInfo } from "../../account/AccountInfo.js";
export interface PreQueueEvent {
    name: PerformanceEvents;
    time: number;
}
/**
 * Starts context by adding payload to the stack
 * @param event {PerformanceEvent}
 * @param abbreviations {Map<string, string>} event name abbreviations
 * @param stack {?PerformanceEventStackedContext[]} stack
 */
export declare function startContext(event: PerformanceEvent, abbreviations: Map<string, string>, stack?: PerformanceEventStackedContext[]): void;
/**
 * Ends context by removing payload from the stack and returning parent or self, if stack is empty, payload
 *
 * @param event {PerformanceEvent}
 * @param abbreviations {Map<string, string>} event name abbreviations
 * @param stack {?PerformanceEventStackedContext[]} stack
 * @param error {?unknown} error
 */
export declare function endContext(event: PerformanceEvent, abbreviations: Map<string, string>, stack?: PerformanceEventStackedContext[], error?: unknown): PerformanceEventContext | undefined;
/**
 * Adds error name and stack trace to the telemetry event
 * @param error {Error}
 * @param logger {Logger}
 * @param event {PerformanceEvent}
 * @param stackMaxSize {number} max error stack size to capture
 */
export declare function addError(error: unknown, logger: Logger, event: PerformanceEvent, stackMaxSize?: number): void;
/**
 * Compacts error stack into array by fetching N first entries
 * @param stack {string} error stack
 * @param stackMaxSize {number} max error stack size to capture
 * @returns {string[]}
 */
export declare function compactStack(stack: string, stackMaxSize: number): string[];
/**
 * Compacts error stack line by shortening file path
 * Example: https://localhost/msal-common/src/authority/Authority.js:100:1 -> Authority.js:100:1
 * @param line {string} stack line
 * @returns {string}
 */
export declare function compactStackLine(line: string): string;
export declare function getAccountType(account?: AccountInfo): "AAD" | "MSA" | "B2C" | undefined;
export declare abstract class PerformanceClient implements IPerformanceClient {
    protected authority: string;
    protected libraryName: string;
    protected libraryVersion: string;
    protected applicationTelemetry: ApplicationTelemetry;
    protected clientId: string;
    protected logger: Logger;
    protected callbacks: Map<string, PerformanceCallbackFunction>;
    /**
     * Multiple events with the same correlation id.
     * @protected
     * @type {Map<string, PerformanceEvent>}
     */
    protected eventsByCorrelationId: Map<string, PerformanceEvent>;
    /**
     * Map of pre-queue times by correlation Id
     *
     * @protected
     * @type {Map<string, PreQueueEvent>}
     */
    protected preQueueTimeByCorrelationId: Map<string, PreQueueEvent>;
    /**
     * Map of queue measurements by correlation Id
     *
     * @protected
     * @type {Map<string, Array<QueueMeasurement>>}
     */
    protected queueMeasurements: Map<string, Array<QueueMeasurement>>;
    protected intFields: Set<string>;
    /**
     * Map of stacked events by correlation id.
     *
     * @protected
     */
    protected eventStack: Map<string, PerformanceEventStackedContext[]>;
    /**
     * Event name abbreviations
     *
     * @protected
     */
    protected abbreviations: Map<string, string>;
    /**
     * Creates an instance of PerformanceClient,
     * an abstract class containing core performance telemetry logic.
     *
     * @constructor
     * @param {string} clientId Client ID of the application
     * @param {string} authority Authority used by the application
     * @param {Logger} logger Logger used by the application
     * @param {string} libraryName Name of the library
     * @param {string} libraryVersion Version of the library
     * @param {ApplicationTelemetry} applicationTelemetry application name and version
     * @param {Set<String>} intFields integer fields to be truncated
     * @param {Map<string, string>} abbreviations event name abbreviations
     */
    constructor(clientId: string, authority: string, logger: Logger, libraryName: string, libraryVersion: string, applicationTelemetry: ApplicationTelemetry, intFields?: Set<string>, abbreviations?: Map<string, string>);
    /**
     * Generates and returns a unique id, typically a guid.
     *
     * @abstract
     * @returns {string}
     */
    abstract generateId(): string;
    /**
     * Starts and returns an platform-specific implementation of IPerformanceMeasurement.
     * Note: this function can be changed to abstract at the next major version bump.
     *
     * @param {string} measureName
     * @param {string} correlationId
     * @returns {IPerformanceMeasurement}
     * @deprecated This method will be removed in the next major version
     */
    startPerformanceMeasurement(measureName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    correlationId: string): IPerformanceMeasurement;
    /**
     * Sets pre-queue time by correlation Id
     *
     * @abstract
     * @param {PerformanceEvents} eventName
     * @param {string} correlationId
     * @returns
     */
    abstract setPreQueueTime(eventName: PerformanceEvents, correlationId?: string): void;
    /**
     * Gets map of pre-queue times by correlation Id
     *
     * @param {PerformanceEvents} eventName
     * @param {string} correlationId
     * @returns {number}
     */
    getPreQueueTime(eventName: string, correlationId: string): number | void;
    /**
     * Calculates the difference between current time and time when function was queued.
     * Note: It is possible to have 0 as the queue time if the current time and the queued time was the same.
     *
     * @param {number} preQueueTime
     * @param {number} currentTime
     * @returns {number}
     */
    calculateQueuedTime(preQueueTime: number, currentTime: number): number;
    /**
     * Adds queue measurement time to QueueMeasurements array for given correlation ID.
     *
     * @param {PerformanceEvents} eventName
     * @param {?string} correlationId
     * @param {?number} queueTime
     * @param {?boolean} manuallyCompleted - indicator for manually completed queue measurements
     * @returns
     */
    addQueueMeasurement(eventName: string, correlationId?: string, queueTime?: number, manuallyCompleted?: boolean): void;
    /**
     * Starts measuring performance for a given operation. Returns a function that should be used to end the measurement.
     *
     * @param {PerformanceEvents} measureName
     * @param {?string} [correlationId]
     * @returns {InProgressPerformanceEvent}
     */
    startMeasurement(measureName: string, correlationId?: string): InProgressPerformanceEvent;
    /**
     * Stops measuring the performance for an operation. Should only be called directly by PerformanceClient classes,
     * as consumers should instead use the function returned by startMeasurement.
     * Adds a new field named as "[event name]DurationMs" for sub-measurements, completes and emits an event
     * otherwise.
     *
     * @param {PerformanceEvent} event
     * @param {unknown} error
     * @param {AccountInfo?} account
     * @returns {(PerformanceEvent | null)}
     */
    endMeasurement(event: PerformanceEvent, error?: unknown, account?: AccountInfo): PerformanceEvent | null;
    /**
     * Saves extra information to be emitted when the measurements are flushed
     * @param fields
     * @param correlationId
     */
    addFields(fields: {
        [key: string]: {} | undefined;
    }, correlationId: string): void;
    /**
     * Increment counters to be emitted when the measurements are flushed
     * @param fields {string[]}
     * @param correlationId {string} correlation identifier
     */
    incrementFields(fields: {
        [key: string]: number | undefined;
    }, correlationId: string): void;
    /**
     * Upserts event into event cache.
     * First key is the correlation id, second key is the event id.
     * Allows for events to be grouped by correlation id,
     * and to easily allow for properties on them to be updated.
     *
     * @private
     * @param {PerformanceEvent} event
     */
    protected cacheEventByCorrelationId(event: PerformanceEvent): void;
    private getQueueInfo;
    /**
     * Removes measurements and aux data for a given correlation id.
     *
     * @param {string} correlationId
     */
    discardMeasurements(correlationId: string): void;
    /**
     * Registers a callback function to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback: PerformanceCallbackFunction): string;
    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId: string): boolean;
    /**
     * Emits events to all registered callbacks.
     *
     * @param {PerformanceEvent[]} events
     * @param {?string} [correlationId]
     */
    emitEvents(events: PerformanceEvent[], correlationId: string): void;
    /**
     * Enforce truncation of integral fields in performance event.
     * @param {PerformanceEvent} event performance event to update.
     */
    private truncateIntegralFields;
    /**
     * Returns event duration in milliseconds
     * @param startTimeMs {number}
     * @returns {number}
     */
    private getDurationMs;
}
//# sourceMappingURL=PerformanceClient.d.ts.map