import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import type { Attributes, AttributeValue } from "@opentelemetry/api";
import type { Tags } from "../types.js";
import type { TelemetryItem as Envelope } from "../generated/index.js";
/**
 * Span to Azure envelope parsing.
 * @internal
 */
export declare function readableSpanToEnvelope(span: ReadableSpan, ikey: string): Envelope;
/**
 * Span Events to Azure envelopes parsing.
 * @internal
 */
export declare function spanEventsToEnvelopes(span: ReadableSpan, ikey: string): Envelope[];
export declare function getPeerIp(attributes: Attributes): AttributeValue | undefined;
export declare function getLocationIp(tags: Tags, attributes: Attributes): void;
export declare function getHttpClientIp(attributes: Attributes): AttributeValue | undefined;
export declare function getUserAgent(attributes: Attributes): AttributeValue | undefined;
export declare function getHttpUrl(attributes: Attributes): AttributeValue | undefined;
export declare function getHttpMethod(attributes: Attributes): AttributeValue | undefined;
export declare function getHttpStatusCode(attributes: Attributes): AttributeValue | undefined;
export declare function getHttpScheme(attributes: Attributes): AttributeValue | undefined;
export declare function getHttpTarget(attributes: Attributes): AttributeValue | undefined;
export declare function getHttpHost(attributes: Attributes): AttributeValue | undefined;
export declare function getNetPeerName(attributes: Attributes): AttributeValue | undefined;
export declare function getNetPeerPort(attributes: Attributes): AttributeValue | undefined;
//# sourceMappingURL=spanUtils.d.ts.map