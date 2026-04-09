import { Logger } from '@opentelemetry/api-logs';
import { Resource } from '@opentelemetry/resources';
import type { InstrumentationScope } from '@opentelemetry/core';
import { LogRecordProcessor } from '../LogRecordProcessor';
import { LogRecordLimits, LoggerConfig, LoggerConfigurator } from '../types';
/**
 * Default LoggerConfigurator that returns the default config for all loggers
 */
export declare const DEFAULT_LOGGER_CONFIGURATOR: LoggerConfigurator;
export declare class LoggerProviderSharedState {
    readonly loggers: Map<string, Logger>;
    activeProcessor: LogRecordProcessor;
    readonly registeredLogRecordProcessors: LogRecordProcessor[];
    readonly resource: Resource;
    readonly forceFlushTimeoutMillis: number;
    readonly logRecordLimits: Required<LogRecordLimits>;
    readonly processors: LogRecordProcessor[];
    private _loggerConfigurator;
    private _loggerConfigs;
    constructor(resource: Resource, forceFlushTimeoutMillis: number, logRecordLimits: Required<LogRecordLimits>, processors: LogRecordProcessor[], loggerConfigurator?: LoggerConfigurator);
    /**
     * Get the LoggerConfig for a given instrumentation scope.
     * Uses the LoggerConfigurator function to compute the config on first access
     * and caches the result.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    getLoggerConfig(instrumentationScope: InstrumentationScope): Required<LoggerConfig>;
}
//# sourceMappingURL=LoggerProviderSharedState.d.ts.map