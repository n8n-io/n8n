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
export declare const invoke: <T extends any[], U>(callback: (...args: T) => U, eventName: string, logger: Logger, telemetryClient?: IPerformanceClient, correlationId?: string) => (...args: T) => U;
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
export declare const invokeAsync: <T extends any[], U>(callback: (...args: T) => Promise<U>, eventName: string, logger: Logger, telemetryClient?: IPerformanceClient, correlationId?: string) => (...args: T) => Promise<U>;
//# sourceMappingURL=FunctionWrappers.d.ts.map