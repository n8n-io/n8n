/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { PerformanceEventStatus } from './PerformanceEvent.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class StubPerformanceMeasurement {
    startMeasurement() {
        return;
    }
    endMeasurement() {
        return;
    }
    flushMeasurement() {
        return null;
    }
}
class StubPerformanceClient {
    generateId() {
        return "callback-id";
    }
    startMeasurement(measureName, correlationId) {
        return {
            end: () => null,
            discard: () => { },
            add: () => { },
            increment: () => { },
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
    startPerformanceMeasurement() {
        return new StubPerformanceMeasurement();
    }
    calculateQueuedTime() {
        return 0;
    }
    addQueueMeasurement() {
        return;
    }
    setPreQueueTime() {
        return;
    }
    endMeasurement() {
        return null;
    }
    discardMeasurements() {
        return;
    }
    removePerformanceCallback() {
        return true;
    }
    addPerformanceCallback() {
        return "";
    }
    emitEvents() {
        return;
    }
    addFields() {
        return;
    }
    incrementFields() {
        return;
    }
    cacheEventByCorrelationId() {
        return;
    }
}

export { StubPerformanceClient, StubPerformanceMeasurement };
//# sourceMappingURL=StubPerformanceClient.mjs.map
