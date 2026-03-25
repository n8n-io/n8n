/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { PerformanceEvent } from "./PerformanceEvent.js";
import { IPerformanceMeasurement } from "./IPerformanceMeasurement.js";
import { AccountInfo } from "../../account/AccountInfo.js";

export type PerformanceCallbackFunction = (events: PerformanceEvent[]) => void;

export type InProgressPerformanceEvent = {
    end: (
        event?: Partial<PerformanceEvent>,
        error?: unknown,
        account?: AccountInfo
    ) => PerformanceEvent | null;
    discard: () => void;
    add: (fields: { [key: string]: {} | undefined }) => void;
    increment: (fields: { [key: string]: number | undefined }) => void;
    event: PerformanceEvent;
    /**
     * @deprecated This attribute will be removed in the next major version
     */
    measurement: IPerformanceMeasurement;
};

export interface IPerformanceClient {
    startMeasurement(
        measureName: string,
        correlationId?: string
    ): InProgressPerformanceEvent;
    endMeasurement(event: PerformanceEvent): PerformanceEvent | null;
    discardMeasurements(correlationId: string): void;
    addFields(
        fields: { [key: string]: {} | undefined },
        correlationId: string
    ): void;
    incrementFields(
        fields: { [key: string]: number | undefined },
        correlationId: string
    ): void;
    removePerformanceCallback(callbackId: string): boolean;
    addPerformanceCallback(callback: PerformanceCallbackFunction): string;
    emitEvents(events: PerformanceEvent[], correlationId: string): void;
    /**
     * @deprecated This method will be removed in the next major version
     */
    startPerformanceMeasurement(
        measureName: string,
        correlationId: string
    ): IPerformanceMeasurement;
    generateId(): string;
    calculateQueuedTime(preQueueTime: number, currentTime: number): number;
    addQueueMeasurement(
        eventName: string,
        correlationId?: string,
        queueTime?: number,
        manuallyCompleted?: boolean
    ): void;
    setPreQueueTime(eventName: string, correlationId?: string): void;
}

/**
 * Queue measurement type
 */
export type QueueMeasurement = {
    /**
     * Name of performance event
     */
    eventName: string;

    /**
     * Time spent in JS queue
     */
    queueTime: number;

    /**
     * Incomplete pre-queue events are instrumentation bugs that should be fixed.
     */
    manuallyCompleted?: boolean;
};
