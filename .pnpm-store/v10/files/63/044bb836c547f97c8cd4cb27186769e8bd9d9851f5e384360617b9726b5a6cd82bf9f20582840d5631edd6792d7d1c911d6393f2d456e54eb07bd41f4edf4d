import type * as logsAPI from '@opentelemetry/api-logs';
import type { InstrumentationScope } from '@opentelemetry/core';
import { LoggerProviderSharedState } from './internal/LoggerProviderSharedState';
export declare class Logger implements logsAPI.Logger {
    readonly instrumentationScope: InstrumentationScope;
    private _sharedState;
    constructor(instrumentationScope: InstrumentationScope, _sharedState: LoggerProviderSharedState);
    emit(logRecord: logsAPI.LogRecord): void;
}
//# sourceMappingURL=Logger.d.ts.map