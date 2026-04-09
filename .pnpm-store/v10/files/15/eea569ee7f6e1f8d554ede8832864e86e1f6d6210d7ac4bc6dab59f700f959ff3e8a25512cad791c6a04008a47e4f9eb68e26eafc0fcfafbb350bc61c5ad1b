import { Logger } from '@opentelemetry/api-logs';
import { IResource } from '@opentelemetry/resources';
import { LogRecordProcessor } from '../LogRecordProcessor';
import { LogRecordLimits } from '../types';
export declare class LoggerProviderSharedState {
    readonly resource: IResource;
    readonly forceFlushTimeoutMillis: number;
    readonly logRecordLimits: Required<LogRecordLimits>;
    readonly loggers: Map<string, Logger>;
    activeProcessor: LogRecordProcessor;
    readonly registeredLogRecordProcessors: LogRecordProcessor[];
    constructor(resource: IResource, forceFlushTimeoutMillis: number, logRecordLimits: Required<LogRecordLimits>);
}
//# sourceMappingURL=LoggerProviderSharedState.d.ts.map