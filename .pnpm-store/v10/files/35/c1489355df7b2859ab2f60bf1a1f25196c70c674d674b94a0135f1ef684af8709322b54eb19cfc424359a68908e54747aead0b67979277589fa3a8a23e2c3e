import { SentrySpanArguments, Span, SpanAttributes, SpanAttributeValue, SpanContextData, SpanTimeInput } from '../types-hoist/span';
import { SpanStatus } from '../types-hoist/spanStatus';
/**
 * A Sentry Span that is non-recording, meaning it will not be sent to Sentry.
 */
export declare class SentryNonRecordingSpan implements Span {
    private _traceId;
    private _spanId;
    constructor(spanContext?: SentrySpanArguments);
    /** @inheritdoc */
    spanContext(): SpanContextData;
    /** @inheritdoc */
    end(_timestamp?: SpanTimeInput): void;
    /** @inheritdoc */
    setAttribute(_key: string, _value: SpanAttributeValue | undefined): this;
    /** @inheritdoc */
    setAttributes(_values: SpanAttributes): this;
    /** @inheritdoc */
    setStatus(_status: SpanStatus): this;
    /** @inheritdoc */
    updateName(_name: string): this;
    /** @inheritdoc */
    isRecording(): boolean;
    /** @inheritdoc */
    addEvent(_name: string, _attributesOrStartTime?: SpanAttributes | SpanTimeInput, _startTime?: SpanTimeInput): this;
    /** @inheritDoc */
    addLink(_link: unknown): this;
    /** @inheritDoc */
    addLinks(_links: unknown[]): this;
    /**
     * This should generally not be used,
     * but we need it for being compliant with the OTEL Span interface.
     *
     * @hidden
     * @internal
     */
    recordException(_exception: unknown, _time?: number | undefined): void;
}
//# sourceMappingURL=sentryNonRecordingSpan.d.ts.map
