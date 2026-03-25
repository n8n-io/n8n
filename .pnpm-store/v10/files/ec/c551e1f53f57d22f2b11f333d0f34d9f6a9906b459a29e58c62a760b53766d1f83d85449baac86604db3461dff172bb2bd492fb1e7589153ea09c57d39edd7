import type { Link } from '@opentelemetry/api';
import type { ReadableSpan, TimedEvent } from '@opentelemetry/sdk-trace-base';
import type { Encoder } from '../common/utils';
import { IEvent, IExportTraceServiceRequest, ILink, ISpan } from './internal-types';
import { OtlpEncodingOptions } from '../common/internal-types';
export declare function sdkSpanToOtlpSpan(span: ReadableSpan, encoder: Encoder): ISpan;
export declare function toOtlpLink(link: Link, encoder: Encoder): ILink;
export declare function toOtlpSpanEvent(timedEvent: TimedEvent, encoder: Encoder): IEvent;
export declare function createExportTraceServiceRequest(spans: ReadableSpan[], options?: OtlpEncodingOptions): IExportTraceServiceRequest;
//# sourceMappingURL=internal.d.ts.map