/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IPerformanceMeasurement,
    SubMeasurement,
} from "@azure/msal-common/browser";

export class BrowserPerformanceMeasurement implements IPerformanceMeasurement {
    private readonly measureName: string;
    private readonly correlationId: string;
    private readonly startMark: string;
    private readonly endMark: string;

    constructor(name: string, correlationId: string) {
        this.correlationId = correlationId;
        this.measureName = BrowserPerformanceMeasurement.makeMeasureName(
            name,
            correlationId
        );
        this.startMark = BrowserPerformanceMeasurement.makeStartMark(
            name,
            correlationId
        );
        this.endMark = BrowserPerformanceMeasurement.makeEndMark(
            name,
            correlationId
        );
    }

    private static makeMeasureName(name: string, correlationId: string) {
        return `msal.measure.${name}.${correlationId}`;
    }

    private static makeStartMark(name: string, correlationId: string) {
        return `msal.start.${name}.${correlationId}`;
    }

    private static makeEndMark(name: string, correlationId: string) {
        return `msal.end.${name}.${correlationId}`;
    }

    static supportsBrowserPerformance(): boolean {
        return (
            typeof window !== "undefined" &&
            typeof window.performance !== "undefined" &&
            typeof window.performance.mark === "function" &&
            typeof window.performance.measure === "function" &&
            typeof window.performance.clearMarks === "function" &&
            typeof window.performance.clearMeasures === "function" &&
            typeof window.performance.getEntriesByName === "function"
        );
    }

    /**
     * Flush browser marks and measurements.
     * @param {string} correlationId
     * @param {SubMeasurement} measurements
     */
    public static flushMeasurements(
        correlationId: string,
        measurements: SubMeasurement[]
    ): void {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                measurements.forEach((measurement) => {
                    const measureName =
                        BrowserPerformanceMeasurement.makeMeasureName(
                            measurement.name,
                            correlationId
                        );
                    const entriesForMeasurement =
                        window.performance.getEntriesByName(
                            measureName,
                            "measure"
                        );
                    if (entriesForMeasurement.length > 0) {
                        window.performance.clearMeasures(measureName);
                        window.performance.clearMarks(
                            BrowserPerformanceMeasurement.makeStartMark(
                                measureName,
                                correlationId
                            )
                        );
                        window.performance.clearMarks(
                            BrowserPerformanceMeasurement.makeEndMark(
                                measureName,
                                correlationId
                            )
                        );
                    }
                });
            } catch (e) {
                // Silently catch and return null
            }
        }
    }

    startMeasurement(): void {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                window.performance.mark(this.startMark);
            } catch (e) {
                // Silently catch
            }
        }
    }

    endMeasurement(): void {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                window.performance.mark(this.endMark);
                window.performance.measure(
                    this.measureName,
                    this.startMark,
                    this.endMark
                );
            } catch (e) {
                // Silently catch
            }
        }
    }

    flushMeasurement(): number | null {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                const entriesForMeasurement =
                    window.performance.getEntriesByName(
                        this.measureName,
                        "measure"
                    );
                if (entriesForMeasurement.length > 0) {
                    const durationMs = entriesForMeasurement[0].duration;
                    window.performance.clearMeasures(this.measureName);
                    window.performance.clearMarks(this.startMark);
                    window.performance.clearMarks(this.endMark);
                    return durationMs;
                }
            } catch (e) {
                // Silently catch and return null
            }
        }
        return null;
    }
}
