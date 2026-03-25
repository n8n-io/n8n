import { Logger } from '@opentelemetry/api-logs';
import { Resource } from '@opentelemetry/resources';
import { LogRecordProcessor } from '../LogRecordProcessor';
import { LogRecordLimits } from '../types';
export declare class LoggerProviderSharedState {
    readonly resource: Resource;
    readonly forceFlushTimeoutMillis: number;
    readonly logRecordLimits: Required<LogRecordLimits>;
    readonly loggers: Map<string, Logger>;
    activeProcessor: LogRecordProcessor;
    readonly registeredLogRecordProcessors: LogRecordProcessor[];
    constructor(resource: Resource, forceFlushTimeoutMillis: number, logRecordLimits: Required<LogRecordLimits>);
}
//# sourceMappingURL=LoggerProviderSharedState.d.ts.map