/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class BrowserPerformanceMeasurement {
    constructor(name, correlationId) {
        this.correlationId = correlationId;
        this.measureName = BrowserPerformanceMeasurement.makeMeasureName(name, correlationId);
        this.startMark = BrowserPerformanceMeasurement.makeStartMark(name, correlationId);
        this.endMark = BrowserPerformanceMeasurement.makeEndMark(name, correlationId);
    }
    static makeMeasureName(name, correlationId) {
        return `msal.measure.${name}.${correlationId}`;
    }
    static makeStartMark(name, correlationId) {
        return `msal.start.${name}.${correlationId}`;
    }
    static makeEndMark(name, correlationId) {
        return `msal.end.${name}.${correlationId}`;
    }
    static supportsBrowserPerformance() {
        return (typeof window !== "undefined" &&
            typeof window.performance !== "undefined" &&
            typeof window.performance.mark === "function" &&
            typeof window.performance.measure === "function" &&
            typeof window.performance.clearMarks === "function" &&
            typeof window.performance.clearMeasures === "function" &&
            typeof window.performance.getEntriesByName === "function");
    }
    /**
     * Flush browser marks and measurements.
     * @param {string} correlationId
     * @param {SubMeasurement} measurements
     */
    static flushMeasurements(correlationId, measurements) {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                measurements.forEach((measurement) => {
                    const measureName = BrowserPerformanceMeasurement.makeMeasureName(measurement.name, correlationId);
                    const entriesForMeasurement = window.performance.getEntriesByName(measureName, "measure");
                    if (entriesForMeasurement.length > 0) {
                        window.performance.clearMeasures(measureName);
                        window.performance.clearMarks(BrowserPerformanceMeasurement.makeStartMark(measureName, correlationId));
                        window.performance.clearMarks(BrowserPerformanceMeasurement.makeEndMark(measureName, correlationId));
                    }
                });
            }
            catch (e) {
                // Silently catch and return null
            }
        }
    }
    startMeasurement() {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                window.performance.mark(this.startMark);
            }
            catch (e) {
                // Silently catch
            }
        }
    }
    endMeasurement() {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                window.performance.mark(this.endMark);
                window.performance.measure(this.measureName, this.startMark, this.endMark);
            }
            catch (e) {
                // Silently catch
            }
        }
    }
    flushMeasurement() {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                const entriesForMeasurement = window.performance.getEntriesByName(this.measureName, "measure");
                if (entriesForMeasurement.length > 0) {
                    const durationMs = entriesForMeasurement[0].duration;
                    window.performance.clearMeasures(this.measureName);
                    window.performance.clearMarks(this.startMark);
                    window.performance.clearMarks(this.endMark);
                    return durationMs;
                }
            }
            catch (e) {
                // Silently catch and return null
            }
        }
        return null;
    }
}

export { BrowserPerformanceMeasurement };
//# sourceMappingURL=BrowserPerformanceMeasurement.mjs.map
