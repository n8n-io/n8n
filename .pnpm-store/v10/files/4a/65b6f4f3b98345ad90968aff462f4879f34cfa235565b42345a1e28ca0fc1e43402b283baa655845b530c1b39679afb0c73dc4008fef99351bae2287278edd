import { ReadableSpan, TimedEvent } from '@opentelemetry/sdk-trace-base';
import * as zipkinTypes from './types';
export declare const defaultStatusCodeTagName = "otel.status_code";
export declare const defaultStatusErrorTagName = "error";
/**
 * Translate OpenTelemetry ReadableSpan to ZipkinSpan format
 * @param span Span to be translated
 */
export declare function toZipkinSpan(span: ReadableSpan, serviceName: string, statusCodeTagName: string, statusErrorTagName: string): zipkinTypes.Span;
/** Converts OpenTelemetry Span properties to Zipkin Tags format. */
export declare function _toZipkinTags({ attributes, resource, status, droppedAttributesCount, droppedEventsCount, droppedLinksCount, }: ReadableSpan, statusCodeTagName: string, statusErrorTagName: string): zipkinTypes.Tags;
/**
 * Converts OpenTelemetry Events to Zipkin Annotations format.
 */
export declare function _toZipkinAnnotations(events: TimedEvent[]): zipkinTypes.Annotation[];
//# sourceMappingURL=transform.d.ts.map