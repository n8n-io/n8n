/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Logger } from "../logger/Logger.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";

/**
 * Wraps a function with a performance measurement.
 * Usage: invoke(functionToCall, performanceClient, "EventName", "correlationId")(...argsToPassToFunction)
 * @param callback
 * @param eventName
 * @param logger
 * @param telemetryClient
 * @param correlationId
 * @returns
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const invoke = <T extends Array<any>, U>(
    callback: (...args: T) => U,
    eventName: string,
    logger: Logger,
    telemetryClient?: IPerformanceClient,
    correlationId?: string
) => {
    return (...args: T): U => {
        logger.trace(`Executing function ${eventName}`);
        const inProgressEvent = telemetryClient?.startMeasurement(
            eventName,
            correlationId
        );
        if (correlationId) {
            // Track number of times this API is called in a single request
            const eventCount = eventName + "CallCount";
            telemetryClient?.incrementFields(
                { [eventCount]: 1 },
                correlationId
            );
        }
        try {
            const result = callback(...args);
            inProgressEvent?.end({
                success: true,
            });
            logger.trace(`Returning result from ${eventName}`);
            return result;
        } catch (e) {
            logger.trace(`Error occurred in ${eventName}`);
            try {
                logger.trace(JSON.stringify(e));
            } catch (e) {
                logger.trace("Unable to print error message.");
            }
            inProgressEvent?.end(
                {
                    success: false,
                },
                e
            );
            throw e;
        }
    };
};

/**
 * Wraps an async function with a performance measurement.
 * Usage: invokeAsync(functionToCall, performanceClient, "EventName", "correlationId")(...argsToPassToFunction)
 * @param callback
 * @param eventName
 * @param logger
 * @param telemetryClient
 * @param correlationId
 * @returns
 * @internal
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const invokeAsync = <T extends Array<any>, U>(
    callback: (...args: T) => Promise<U>,
    eventName: string,
    logger: Logger,
    telemetryClient?: IPerformanceClient,
    correlationId?: string
) => {
    return (...args: T): Promise<U> => {
        logger.trace(`Executing function ${eventName}`);
        const inProgressEvent = telemetryClient?.startMeasurement(
            eventName,
            correlationId
        );
        if (correlationId) {
            // Track number of times this API is called in a single request
            const eventCount = eventName + "CallCount";
            telemetryClient?.incrementFields(
                { [eventCount]: 1 },
                correlationId
            );
        }
        telemetryClient?.setPreQueueTime(eventName, correlationId);
        return callback(...args)
            .then((response) => {
                logger.trace(`Returning result from ${eventName}`);
                inProgressEvent?.end({
                    success: true,
                });
                return response;
            })
            .catch((e) => {
                logger.trace(`Error occurred in ${eventName}`);
                try {
                    logger.trace(JSON.stringify(e));
                } catch (e) {
                    logger.trace("Unable to print error message.");
                }
                inProgressEvent?.end(
                    {
                        success: false,
                    },
                    e
                );
                throw e;
            });
    };
};
