import type * as logsAPI from '@opentelemetry/api-logs';
import * as api from '@opentelemetry/api';
import { InstrumentationScope } from '@opentelemetry/core';
import type { Resource } from '@opentelemetry/resources';
import type { ReadableLogRecord } from './export/ReadableLogRecord';
import { LoggerProviderSharedState } from './internal/LoggerProviderSharedState';
export declare class LogRecordImpl implements ReadableLogRecord {
    readonly hrTime: api.HrTime;
    readonly hrTimeObserved: api.HrTime;
    readonly spanContext?: api.SpanContext;
    readonly resource: Resource;
    readonly instrumentationScope: InstrumentationScope;
    readonly attributes: logsAPI.LogAttributes;
    private _severityText?;
    private _severityNumber?;
    private _body?;
    private _eventName?;
    private totalAttributesCount;
    private _isReadonly;
    private readonly _logRecordLimits;
    set severityText(severityText: string | undefined);
    get severityText(): string | undefined;
    set severityNumber(severityNumber: logsAPI.SeverityNumber | undefined);
    get severityNumber(): logsAPI.SeverityNumber | undefined;
    set body(body: logsAPI.LogBody | undefined);
    get body(): logsAPI.LogBody | undefined;
    get eventName(): string | undefined;
    set eventName(eventName: string | undefined);
    get droppedAttributesCount(): number;
    constructor(_sharedState: LoggerProviderSharedState, instrumentationScope: InstrumentationScope, logRecord: logsAPI.LogRecord);
    setAttribute(key: string, value?: logsAPI.AnyValue): this;
    setAttributes(attributes: logsAPI.LogAttributes): this;
    setBody(body: logsAPI.LogBody): this;
    setEventName(eventName: string): this;
    setSeverityNumber(severityNumber: logsAPI.SeverityNumber): this;
    setSeverityText(severityText: string): this;
    /**
     * @internal
     * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
     * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
     */
    _makeReadonly(): void;
    private _truncateToSize;
    private _truncateToLimitUtil;
    private _isLogRecordReadonly;
}
//# sourceMappingURL=LogRecordImpl.d.ts.map