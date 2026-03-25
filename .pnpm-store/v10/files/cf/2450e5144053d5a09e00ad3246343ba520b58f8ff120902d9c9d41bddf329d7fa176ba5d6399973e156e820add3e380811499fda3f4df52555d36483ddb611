import { IPerformanceMeasurement, SubMeasurement } from "@azure/msal-common/browser";
export declare class BrowserPerformanceMeasurement implements IPerformanceMeasurement {
    private readonly measureName;
    private readonly correlationId;
    private readonly startMark;
    private readonly endMark;
    constructor(name: string, correlationId: string);
    private static makeMeasureName;
    private static makeStartMark;
    private static makeEndMark;
    static supportsBrowserPerformance(): boolean;
    /**
     * Flush browser marks and measurements.
     * @param {string} correlationId
     * @param {SubMeasurement} measurements
     */
    static flushMeasurements(correlationId: string, measurements: SubMeasurement[]): void;
    startMeasurement(): void;
    endMeasurement(): void;
    flushMeasurement(): number | null;
}
//# sourceMappingURL=BrowserPerformanceMeasurement.d.ts.map