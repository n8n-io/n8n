/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IPerformanceClient,
    InProgressPerformanceEvent,
} from "./IPerformanceClient.js";
import { IPerformanceMeasurement } from "./IPerformanceMeasurement.js";
import {
    PerformanceEvent,
    PerformanceEventStatus,
} from "./PerformanceEvent.js";

export class StubPerformanceMeasurement implements IPerformanceMeasurement {
    startMeasurement(): void {
        return;
    }
    endMeasurement(): void {
        return;
    }
    flushMeasurement(): number | null {
        return null;
    }
}

export class StubPerformanceClient implements IPerformanceClient {
    generateId(): string {
        return "callback-id";
    }

    startMeasurement(
        measureName: string,
        correlationId?: string | undefined
    ): InProgressPerformanceEvent {
        return {
            end: () => null,
            discard: () => {},
            add: () => {},
            increment: () => {},
            event: {
                eventId: this.generateId(),
                status: PerformanceEventStatus.InProgress,
                authority: "",
                libraryName: "",
                libraryVersion: "",
                clientId: "",
                name: measureName,
                startTimeMs: Date.now(),
                correlationId: correlationId || "",
            },
            measurement: new StubPerformanceMeasurement(),
        };
    }

    startPerformanceMeasurement(): IPerformanceMeasurement {
        return new StubPerformanceMeasurement();
    }
    calculateQueuedTime(): number {
        return 0;
    }

    addQueueMeasurement(): void {
        return;
    }

    setPreQueueTime(): void {
        return;
    }

    endMeasurement(): PerformanceEvent | null {
        return null;
    }

    discardMeasurements(): void {
        return;
    }

    removePerformanceCallback(): boolean {
        return true;
    }

    addPerformanceCallback(): string {
        return "";
    }

    emitEvents(): void {
        return;
    }

    addFields(): void {
        return;
    }

    incrementFields(): void {
        return;
    }

    cacheEventByCorrelationId(): void {
        return;
    }
}
