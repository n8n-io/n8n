import { SpanKind, SpanStatus, SpanAttributes, HrTime, Link, SpanContext } from '@opentelemetry/api';
import { IResource } from '@opentelemetry/resources';
import { InstrumentationLibrary } from '@opentelemetry/core';
import { TimedEvent } from '../TimedEvent';
export interface ReadableSpan {
    readonly name: string;
    readonly kind: SpanKind;
    readonly spanContext: () => SpanContext;
    readonly parentSpanId?: string;
    readonly startTime: HrTime;
    readonly endTime: HrTime;
    readonly status: SpanStatus;
    readonly attributes: SpanAttributes;
    readonly links: Link[];
    readonly events: TimedEvent[];
    readonly duration: HrTime;
    readonly ended: boolean;
    readonly resource: IResource;
    readonly instrumentationLibrary: InstrumentationLibrary;
    readonly droppedAttributesCount: number;
    readonly droppedEventsCount: number;
    readonly droppedLinksCount: number;
}
//# sourceMappingURL=ReadableSpan.d.ts.map