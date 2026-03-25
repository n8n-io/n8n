import type { Resource } from '@opentelemetry/resources';
import type { HrTime, SpanContext } from '@opentelemetry/api';
import type { InstrumentationScope } from '@opentelemetry/core';
import type { LogBody, LogAttributes, SeverityNumber } from '@opentelemetry/api-logs';
export interface ReadableLogRecord {
    readonly hrTime: HrTime;
    readonly hrTimeObserved: HrTime;
    readonly spanContext?: SpanContext;
    readonly severityText?: string;
    readonly severityNumber?: SeverityNumber;
    readonly body?: LogBody;
    readonly resource: Resource;
    readonly instrumentationScope: InstrumentationScope;
    readonly attributes: LogAttributes;
    readonly droppedAttributesCount: number;
}
//# sourceMappingURL=ReadableLogRecord.d.ts.map