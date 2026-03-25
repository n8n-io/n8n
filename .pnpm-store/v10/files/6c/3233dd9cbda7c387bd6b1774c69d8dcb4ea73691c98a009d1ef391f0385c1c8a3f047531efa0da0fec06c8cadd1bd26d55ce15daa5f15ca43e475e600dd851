import { InProgressPerformanceEvent, IPerformanceClient, PerformanceClient, PerformanceEvents } from "@azure/msal-common/browser";
import { Configuration } from "../config/Configuration.js";
export declare class BrowserPerformanceClient extends PerformanceClient implements IPerformanceClient {
    constructor(configuration: Configuration, intFields?: Set<string>, abbreviations?: Map<string, string>);
    generateId(): string;
    private getPageVisibility;
    private deleteIncompleteSubMeasurements;
    /**
     * Starts measuring performance for a given operation. Returns a function that should be used to end the measurement.
     * Also captures browser page visibilityState.
     *
     * @param {PerformanceEvents} measureName
     * @param {?string} [correlationId]
     * @returns {((event?: Partial<PerformanceEvent>) => PerformanceEvent| null)}
     */
    startMeasurement(measureName: string, correlationId?: string): InProgressPerformanceEvent;
    /**
     * Adds pre-queue time to preQueueTimeByCorrelationId map.
     * @param {PerformanceEvents} eventName
     * @param {?string} correlationId
     * @returns
     */
    setPreQueueTime(eventName: PerformanceEvents, correlationId?: string): void;
    /**
     * Calculates and adds queue time measurement for given performance event.
     *
     * @param {PerformanceEvents} eventName
     * @param {?string} correlationId
     * @param {?number} queueTime
     * @param {?boolean} manuallyCompleted - indicator for manually completed queue measurements
     * @returns
     */
    addQueueMeasurement(eventName: string, correlationId?: string, queueTime?: number, manuallyCompleted?: boolean): void;
}
//# sourceMappingURL=BrowserPerformanceClient.d.ts.map