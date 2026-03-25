/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ApplicationTelemetry } from "../../config/ClientConfiguration.js";
import { Logger } from "../../logger/Logger.js";
import {
    InProgressPerformanceEvent,
    IPerformanceClient,
    PerformanceCallbackFunction,
    QueueMeasurement,
} from "./IPerformanceClient.js";
import {
    IntFields,
    PerformanceEvent,
    PerformanceEventAbbreviations,
    PerformanceEventContext,
    PerformanceEvents,
    PerformanceEventStackedContext,
    PerformanceEventStatus,
} from "./PerformanceEvent.js";
import { IPerformanceMeasurement } from "./IPerformanceMeasurement.js";
import { StubPerformanceMeasurement } from "./StubPerformanceClient.js";
import { AuthError } from "../../error/AuthError.js";
import { CacheError } from "../../error/CacheError.js";
import { ServerError } from "../../error/ServerError.js";
import { InteractionRequiredAuthError } from "../../error/InteractionRequiredAuthError.js";
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
export function startContext(
    event: PerformanceEvent,
    abbreviations: Map<string, string>,
    stack?: PerformanceEventStackedContext[]
): void {
    if (!stack) {
        return;
    }

    stack.push({
        name: abbreviations.get(event.name) || event.name,
    });
}

/**
 * Ends context by removing payload from the stack and returning parent or self, if stack is empty, payload
 *
 * @param event {PerformanceEvent}
 * @param abbreviations {Map<string, string>} event name abbreviations
 * @param stack {?PerformanceEventStackedContext[]} stack
 * @param error {?unknown} error
 */
export function endContext(
    event: PerformanceEvent,
    abbreviations: Map<string, string>,
    stack?: PerformanceEventStackedContext[],
    error?: unknown
): PerformanceEventContext | undefined {
    if (!stack?.length) {
        return;
    }

    const peek = (stack: PerformanceEventStackedContext[]) => {
        return stack.length ? stack[stack.length - 1] : undefined;
    };

    const abbrEventName = abbreviations.get(event.name) || event.name;
    const top = peek(stack);
    if (top?.name !== abbrEventName) {
        return;
    }

    const current = stack?.pop();
    if (!current) {
        return;
    }

    const errorCode =
        error instanceof AuthError
            ? error.errorCode
            : error instanceof Error
            ? error.name
            : undefined;
    const subErr = error instanceof AuthError ? error.subError : undefined;

    if (errorCode && current.childErr !== errorCode) {
        current.err = errorCode;
        if (subErr) {
            current.subErr = subErr;
        }
    }

    delete current.name;
    delete current.childErr;

    const context: PerformanceEventContext = {
        ...current,
        dur: event.durationMs,
    };

    if (!event.success) {
        context.fail = 1;
    }

    const parent = peek(stack);
    if (!parent) {
        return { [abbrEventName]: context };
    }

    if (errorCode) {
        parent.childErr = errorCode;
    }

    let childName: string;
    if (!parent[abbrEventName]) {
        childName = abbrEventName;
    } else {
        const siblings = Object.keys(parent).filter((key) =>
            key.startsWith(abbrEventName)
        ).length;
        childName = `${abbrEventName}_${siblings + 1}`;
    }
    parent[childName] = context;
    return parent;
}

/**
 * Adds error name and stack trace to the telemetry event
 * @param error {Error}
 * @param logger {Logger}
 * @param event {PerformanceEvent}
 * @param stackMaxSize {number} max error stack size to capture
 */
export function addError(
    error: unknown,
    logger: Logger,
    event: PerformanceEvent,
    stackMaxSize: number = 5
): void {
    if (!(error instanceof Error)) {
        logger.trace(
            "PerformanceClient.addErrorStack: Input error is not instance of Error",
            event.correlationId
        );
        return;
    } else if (error instanceof AuthError) {
        event.errorCode = error.errorCode;
        event.subErrorCode = error.subError;
        if (
            error instanceof ServerError ||
            error instanceof InteractionRequiredAuthError
        ) {
            event.serverErrorNo = error.errorNo;
        }
        return;
    } else if (error instanceof CacheError) {
        event.errorCode = error.errorCode;
        return;
    } else if (event.errorStack?.length) {
        logger.trace(
            "PerformanceClient.addErrorStack: Stack already exist",
            event.correlationId
        );
        return;
    } else if (!error.stack?.length) {
        logger.trace(
            "PerformanceClient.addErrorStack: Input stack is empty",
            event.correlationId
        );
        return;
    }

    if (error.stack) {
        event.errorStack = compactStack(error.stack, stackMaxSize);
    }
    event.errorName = error.name;
}

/**
 * Compacts error stack into array by fetching N first entries
 * @param stack {string} error stack
 * @param stackMaxSize {number} max error stack size to capture
 * @returns {string[]}
 */
export function compactStack(stack: string, stackMaxSize: number): string[] {
    if (stackMaxSize < 0) {
        return [];
    }

    const stackArr = stack.split("\n") || [];

    const res = [];

    // Check for a handful of known, common runtime errors and log them (with redaction where applicable).
    const firstLine = stackArr[0];
    if (
        firstLine.startsWith("TypeError: Cannot read property") ||
        firstLine.startsWith("TypeError: Cannot read properties of") ||
        firstLine.startsWith("TypeError: Cannot set property") ||
        firstLine.startsWith("TypeError: Cannot set properties of") ||
        firstLine.endsWith("is not a function")
    ) {
        // These types of errors are not at risk of leaking PII. They will indicate unavailable APIs
        res.push(compactStackLine(firstLine));
    } else if (
        firstLine.startsWith("SyntaxError") ||
        firstLine.startsWith("TypeError")
    ) {
        // Prevent unintentional leaking of arbitrary info by redacting contents between both single and double quotes
        res.push(
            compactStackLine(
                // Example: SyntaxError: Unexpected token 'e', "test" is not valid JSON -> SyntaxError: Unexpected token <redacted>, <redacted> is not valid JSON
                firstLine.replace(/['].*[']|["].*["]/g, "<redacted>")
            )
        );
    }

    // Get top N stack lines
    for (let ix = 1; ix < stackArr.length; ix++) {
        if (res.length >= stackMaxSize) {
            break;
        }
        const line = stackArr[ix];
        res.push(compactStackLine(line));
    }
    return res;
}

/**
 * Compacts error stack line by shortening file path
 * Example: https://localhost/msal-common/src/authority/Authority.js:100:1 -> Authority.js:100:1
 * @param line {string} stack line
 * @returns {string}
 */
export function compactStackLine(line: string): string {
    const filePathIx = line.lastIndexOf(" ") + 1;
    if (filePathIx < 1) {
        return line;
    }
    const filePath = line.substring(filePathIx);

    let fileNameIx = filePath.lastIndexOf("/");
    fileNameIx = fileNameIx < 0 ? filePath.lastIndexOf("\\") : fileNameIx;

    if (fileNameIx >= 0) {
        return (
            line.substring(0, filePathIx) +
            "(" +
            filePath.substring(fileNameIx + 1) +
            (filePath.charAt(filePath.length - 1) === ")" ? "" : ")")
        ).trimStart();
    }

    return line.trimStart();
}

export function getAccountType(
    account?: AccountInfo
): "AAD" | "MSA" | "B2C" | undefined {
    const idTokenClaims = account?.idTokenClaims;
    if (idTokenClaims?.tfp || idTokenClaims?.acr) {
        return "B2C";
    }

    if (!idTokenClaims?.tid) {
        return undefined;
    } else if (idTokenClaims?.tid === "9188040d-6c67-4c5b-b112-36a304b66dad") {
        return "MSA";
    }
    return "AAD";
}

export abstract class PerformanceClient implements IPerformanceClient {
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
    constructor(
        clientId: string,
        authority: string,
        logger: Logger,
        libraryName: string,
        libraryVersion: string,
        applicationTelemetry: ApplicationTelemetry,
        intFields?: Set<string>,
        abbreviations?: Map<string, string>
    ) {
        this.authority = authority;
        this.libraryName = libraryName;
        this.libraryVersion = libraryVersion;
        this.applicationTelemetry = applicationTelemetry;
        this.clientId = clientId;
        this.logger = logger;
        this.callbacks = new Map();
        this.eventsByCorrelationId = new Map();
        this.eventStack = new Map();
        this.queueMeasurements = new Map();
        this.preQueueTimeByCorrelationId = new Map();
        this.intFields = intFields || new Set();
        for (const item of IntFields) {
            this.intFields.add(item);
        }
        this.abbreviations = abbreviations || new Map();
        for (const [key, value] of PerformanceEventAbbreviations) {
            this.abbreviations.set(key, value);
        }
    }

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
    startPerformanceMeasurement(
        measureName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        correlationId: string // eslint-disable-line @typescript-eslint/no-unused-vars
    ): IPerformanceMeasurement {
        return {} as IPerformanceMeasurement;
    }

    /**
     * Sets pre-queue time by correlation Id
     *
     * @abstract
     * @param {PerformanceEvents} eventName
     * @param {string} correlationId
     * @returns
     */
    abstract setPreQueueTime(
        eventName: PerformanceEvents,
        correlationId?: string
    ): void;

    /**
     * Gets map of pre-queue times by correlation Id
     *
     * @param {PerformanceEvents} eventName
     * @param {string} correlationId
     * @returns {number}
     */
    getPreQueueTime(eventName: string, correlationId: string): number | void {
        const preQueueEvent: PreQueueEvent | undefined =
            this.preQueueTimeByCorrelationId.get(correlationId);

        if (!preQueueEvent) {
            this.logger.trace(
                `PerformanceClient.getPreQueueTime: no pre-queue times found for correlationId: ${correlationId}, unable to add queue measurement`
            );
            return;
        } else if (preQueueEvent.name !== eventName) {
            this.logger.trace(
                `PerformanceClient.getPreQueueTime: no pre-queue time found for ${eventName}, unable to add queue measurement`
            );
            return;
        }

        return preQueueEvent.time;
    }

    /**
     * Calculates the difference between current time and time when function was queued.
     * Note: It is possible to have 0 as the queue time if the current time and the queued time was the same.
     *
     * @param {number} preQueueTime
     * @param {number} currentTime
     * @returns {number}
     */
    calculateQueuedTime(preQueueTime: number, currentTime: number): number {
        if (preQueueTime < 1) {
            this.logger.trace(
                `PerformanceClient: preQueueTime should be a positive integer and not ${preQueueTime}`
            );
            return 0;
        }

        if (currentTime < 1) {
            this.logger.trace(
                `PerformanceClient: currentTime should be a positive integer and not ${currentTime}`
            );
            return 0;
        }

        if (currentTime < preQueueTime) {
            this.logger.trace(
                "PerformanceClient: currentTime is less than preQueueTime, check how time is being retrieved"
            );
            return 0;
        }

        return currentTime - preQueueTime;
    }

    /**
     * Adds queue measurement time to QueueMeasurements array for given correlation ID.
     *
     * @param {PerformanceEvents} eventName
     * @param {?string} correlationId
     * @param {?number} queueTime
     * @param {?boolean} manuallyCompleted - indicator for manually completed queue measurements
     * @returns
     */
    addQueueMeasurement(
        eventName: string,
        correlationId?: string,
        queueTime?: number,
        manuallyCompleted?: boolean
    ): void {
        if (!correlationId) {
            this.logger.trace(
                `PerformanceClient.addQueueMeasurement: correlationId not provided for ${eventName}, cannot add queue measurement`
            );
            return;
        }

        if (queueTime === 0) {
            // Possible for there to be no queue time after calculation
            this.logger.trace(
                `PerformanceClient.addQueueMeasurement: queue time provided for ${eventName} is ${queueTime}`
            );
        } else if (!queueTime) {
            this.logger.trace(
                `PerformanceClient.addQueueMeasurement: no queue time provided for ${eventName}`
            );
            return;
        }

        const queueMeasurement: QueueMeasurement = {
            eventName,
            // Always default queue time to 0 for manually completed (improperly instrumented)
            queueTime: manuallyCompleted ? 0 : queueTime,
            manuallyCompleted,
        };

        // Adds to existing correlation Id if present in queueMeasurements
        const existingMeasurements = this.queueMeasurements.get(correlationId);
        if (existingMeasurements) {
            existingMeasurements.push(queueMeasurement);
            this.queueMeasurements.set(correlationId, existingMeasurements);
        } else {
            // Sets new correlation Id if not present in queueMeasurements
            this.logger.trace(
                `PerformanceClient.addQueueMeasurement: adding correlationId ${correlationId} to queue measurements`
            );
            const measurementArray = [queueMeasurement];
            this.queueMeasurements.set(correlationId, measurementArray);
        }
        // Delete processed pre-queue event.
        this.preQueueTimeByCorrelationId.delete(correlationId);
    }

    /**
     * Starts measuring performance for a given operation. Returns a function that should be used to end the measurement.
     *
     * @param {PerformanceEvents} measureName
     * @param {?string} [correlationId]
     * @returns {InProgressPerformanceEvent}
     */
    startMeasurement(
        measureName: string,
        correlationId?: string
    ): InProgressPerformanceEvent {
        // Generate a placeholder correlation if the request does not provide one
        const eventCorrelationId = correlationId || this.generateId();
        if (!correlationId) {
            this.logger.info(
                `PerformanceClient: No correlation id provided for ${measureName}, generating`,
                eventCorrelationId
            );
        }

        this.logger.trace(
            `PerformanceClient: Performance measurement started for ${measureName}`,
            eventCorrelationId
        );

        const inProgressEvent: PerformanceEvent = {
            eventId: this.generateId(),
            status: PerformanceEventStatus.InProgress,
            authority: this.authority,
            libraryName: this.libraryName,
            libraryVersion: this.libraryVersion,
            clientId: this.clientId,
            name: measureName,
            startTimeMs: Date.now(),
            correlationId: eventCorrelationId,
            appName: this.applicationTelemetry?.appName,
            appVersion: this.applicationTelemetry?.appVersion,
        };

        // Store in progress events so they can be discarded if not ended properly
        this.cacheEventByCorrelationId(inProgressEvent);
        startContext(
            inProgressEvent,
            this.abbreviations,
            this.eventStack.get(eventCorrelationId)
        );

        // Return the event and functions the caller can use to properly end/flush the measurement
        return {
            end: (
                event?: Partial<PerformanceEvent>,
                error?: unknown,
                account?: AccountInfo
            ): PerformanceEvent | null => {
                return this.endMeasurement(
                    {
                        // Initial set of event properties
                        ...inProgressEvent,
                        // Properties set when event ends
                        ...event,
                    },
                    error,
                    account
                );
            },
            discard: () => {
                return this.discardMeasurements(inProgressEvent.correlationId);
            },
            add: (fields: { [key: string]: {} | undefined }) => {
                return this.addFields(fields, inProgressEvent.correlationId);
            },
            increment: (fields: { [key: string]: number | undefined }) => {
                return this.incrementFields(
                    fields,
                    inProgressEvent.correlationId
                );
            },
            event: inProgressEvent,
            measurement: new StubPerformanceMeasurement(),
        };
    }

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
    endMeasurement(
        event: PerformanceEvent,
        error?: unknown,
        account?: AccountInfo
    ): PerformanceEvent | null {
        const rootEvent: PerformanceEvent | undefined =
            this.eventsByCorrelationId.get(event.correlationId);
        if (!rootEvent) {
            this.logger.trace(
                `PerformanceClient: Measurement not found for ${event.eventId}`,
                event.correlationId
            );
            return null;
        }

        const isRoot = event.eventId === rootEvent.eventId;
        let queueInfo = {
            totalQueueTime: 0,
            totalQueueCount: 0,
            manuallyCompletedCount: 0,
        };

        event.durationMs = Math.round(
            event.durationMs || this.getDurationMs(event.startTimeMs)
        );

        const context = JSON.stringify(
            endContext(
                event,
                this.abbreviations,
                this.eventStack.get(rootEvent.correlationId),
                error
            )
        );

        if (isRoot) {
            queueInfo = this.getQueueInfo(event.correlationId);
            this.discardMeasurements(rootEvent.correlationId);
        } else {
            rootEvent.incompleteSubMeasurements?.delete(event.eventId);
        }

        this.logger.trace(
            `PerformanceClient: Performance measurement ended for ${event.name}: ${event.durationMs} ms`,
            event.correlationId
        );

        if (error) {
            addError(error, this.logger, rootEvent);
        }

        // Add sub-measurement attribute to root event.
        if (!isRoot) {
            rootEvent[event.name + "DurationMs"] = Math.floor(event.durationMs);
            return { ...rootEvent };
        }

        if (
            isRoot &&
            !error &&
            (rootEvent.errorCode || rootEvent.subErrorCode)
        ) {
            this.logger.trace(
                `PerformanceClient: Remove error and sub-error codes for root event ${event.name} as intermediate error was successfully handled`,
                event.correlationId
            );
            rootEvent.errorCode = undefined;
            rootEvent.subErrorCode = undefined;
        }

        let finalEvent: PerformanceEvent = { ...rootEvent, ...event };
        let incompleteSubsCount: number = 0;
        // Incomplete sub-measurements are discarded. They are likely an instrumentation bug that should be fixed.
        finalEvent.incompleteSubMeasurements?.forEach((subMeasurement) => {
            this.logger.trace(
                `PerformanceClient: Incomplete submeasurement ${subMeasurement.name} found for ${event.name}`,
                finalEvent.correlationId
            );
            incompleteSubsCount++;
        });
        finalEvent.incompleteSubMeasurements = undefined;

        finalEvent = {
            ...finalEvent,
            queuedTimeMs: queueInfo.totalQueueTime,
            queuedCount: queueInfo.totalQueueCount,
            queuedManuallyCompletedCount: queueInfo.manuallyCompletedCount,
            status: PerformanceEventStatus.Completed,
            incompleteSubsCount,
            context,
        };
        if (account) {
            finalEvent.accountType = getAccountType(account);
            finalEvent.dataBoundary = account.dataBoundary;
        }

        this.truncateIntegralFields(finalEvent);
        this.emitEvents([finalEvent], event.correlationId);

        return finalEvent;
    }

    /**
     * Saves extra information to be emitted when the measurements are flushed
     * @param fields
     * @param correlationId
     */
    addFields(
        fields: { [key: string]: {} | undefined },
        correlationId: string
    ): void {
        this.logger.trace("PerformanceClient: Updating static fields");
        const event = this.eventsByCorrelationId.get(correlationId);
        if (event) {
            this.eventsByCorrelationId.set(correlationId, {
                ...event,
                ...fields,
            });
        } else {
            this.logger.trace(
                "PerformanceClient: Event not found for",
                correlationId
            );
        }
    }

    /**
     * Increment counters to be emitted when the measurements are flushed
     * @param fields {string[]}
     * @param correlationId {string} correlation identifier
     */
    incrementFields(
        fields: { [key: string]: number | undefined },
        correlationId: string
    ): void {
        this.logger.trace("PerformanceClient: Updating counters");
        const event = this.eventsByCorrelationId.get(correlationId);
        if (event) {
            for (const counter in fields) {
                if (!event.hasOwnProperty(counter)) {
                    event[counter] = 0;
                } else if (isNaN(Number(event[counter]))) {
                    return;
                }
                event[counter] += fields[counter];
            }
        } else {
            this.logger.trace(
                "PerformanceClient: Event not found for",
                correlationId
            );
        }
    }

    /**
     * Upserts event into event cache.
     * First key is the correlation id, second key is the event id.
     * Allows for events to be grouped by correlation id,
     * and to easily allow for properties on them to be updated.
     *
     * @private
     * @param {PerformanceEvent} event
     */
    protected cacheEventByCorrelationId(event: PerformanceEvent): void {
        const rootEvent = this.eventsByCorrelationId.get(event.correlationId);
        if (rootEvent) {
            this.logger.trace(
                `PerformanceClient: Performance measurement for ${event.name} added/updated`,
                event.correlationId
            );
            rootEvent.incompleteSubMeasurements =
                rootEvent.incompleteSubMeasurements || new Map();
            rootEvent.incompleteSubMeasurements.set(event.eventId, {
                name: event.name,
                startTimeMs: event.startTimeMs,
            });
        } else {
            this.logger.trace(
                `PerformanceClient: Performance measurement for ${event.name} started`,
                event.correlationId
            );
            this.eventsByCorrelationId.set(event.correlationId, { ...event });
            this.eventStack.set(event.correlationId, []);
        }
    }

    private getQueueInfo(correlationId: string): {
        totalQueueTime: number;
        totalQueueCount: number;
        manuallyCompletedCount: number;
    } {
        const queueMeasurementForCorrelationId =
            this.queueMeasurements.get(correlationId);
        if (!queueMeasurementForCorrelationId) {
            this.logger.trace(
                `PerformanceClient: no queue measurements found for for correlationId: ${correlationId}`
            );
        }

        let totalQueueTime = 0;
        let totalQueueCount = 0;
        let manuallyCompletedCount = 0;
        queueMeasurementForCorrelationId?.forEach((measurement) => {
            totalQueueTime += measurement.queueTime;
            totalQueueCount++;
            manuallyCompletedCount += measurement.manuallyCompleted ? 1 : 0;
        });

        return {
            totalQueueTime,
            totalQueueCount,
            manuallyCompletedCount,
        };
    }

    /**
     * Removes measurements and aux data for a given correlation id.
     *
     * @param {string} correlationId
     */
    discardMeasurements(correlationId: string): void {
        this.logger.trace(
            "PerformanceClient: Performance measurements discarded",
            correlationId
        );
        this.eventsByCorrelationId.delete(correlationId);

        this.logger.trace(
            "PerformanceClient: QueueMeasurements discarded",
            correlationId
        );
        this.queueMeasurements.delete(correlationId);

        this.logger.trace(
            "PerformanceClient: Pre-queue times discarded",
            correlationId
        );
        this.preQueueTimeByCorrelationId.delete(correlationId);

        this.logger.trace(
            "PerformanceClient: Event stack discarded",
            correlationId
        );
        this.eventStack.delete(correlationId);
    }

    /**
     * Registers a callback function to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback: PerformanceCallbackFunction): string {
        for (const [id, cb] of this.callbacks) {
            if (cb.toString() === callback.toString()) {
                this.logger.warning(
                    `PerformanceClient: Performance callback is already registered with id: ${id}`
                );
                return id;
            }
        }

        const callbackId = this.generateId();
        this.callbacks.set(callbackId, callback);
        this.logger.verbose(
            `PerformanceClient: Performance callback registered with id: ${callbackId}`
        );

        return callbackId;
    }

    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId: string): boolean {
        const result = this.callbacks.delete(callbackId);

        if (result) {
            this.logger.verbose(
                `PerformanceClient: Performance callback ${callbackId} removed.`
            );
        } else {
            this.logger.verbose(
                `PerformanceClient: Performance callback ${callbackId} not removed.`
            );
        }

        return result;
    }

    /**
     * Emits events to all registered callbacks.
     *
     * @param {PerformanceEvent[]} events
     * @param {?string} [correlationId]
     */
    emitEvents(events: PerformanceEvent[], correlationId: string): void {
        this.logger.verbose(
            "PerformanceClient: Emitting performance events",
            correlationId
        );

        this.callbacks.forEach(
            (callback: PerformanceCallbackFunction, callbackId: string) => {
                this.logger.trace(
                    `PerformanceClient: Emitting event to callback ${callbackId}`,
                    correlationId
                );
                callback.apply(null, [events]);
            }
        );
    }

    /**
     * Enforce truncation of integral fields in performance event.
     * @param {PerformanceEvent} event performance event to update.
     */
    private truncateIntegralFields(event: PerformanceEvent): void {
        this.intFields.forEach((key) => {
            if (key in event && typeof event[key] === "number") {
                event[key] = Math.floor(event[key]);
            }
        });
    }

    /**
     * Returns event duration in milliseconds
     * @param startTimeMs {number}
     * @returns {number}
     */
    private getDurationMs(startTimeMs: number): number {
        const durationMs = Date.now() - startTimeMs;
        // Handle clock skew
        return durationMs < 0 ? durationMs : 0;
    }
}
