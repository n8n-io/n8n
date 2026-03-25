import { Exception } from '../common/Exception';
import { TimeInput } from '../common/Time';
import { SpanAttributes } from './attributes';
import { Span } from './span';
import { SpanContext } from './span_context';
import { SpanStatus } from './status';
import { Link } from './link';
/**
 * The NonRecordingSpan is the default {@link Span} that is used when no Span
 * implementation is available. All operations are no-op including context
 * propagation.
 */
export declare class NonRecordingSpan implements Span {
    private readonly _spanContext;
    constructor(_spanContext?: SpanContext);
    spanContext(): SpanContext;
    setAttribute(_key: string, _value: unknown): this;
    setAttributes(_attributes: SpanAttributes): this;
    addEvent(_name: string, _attributes?: SpanAttributes): this;
    addLink(_link: Link): this;
    addLinks(_links: Link[]): this;
    setStatus(_status: SpanStatus): this;
    updateName(_name: string): this;
    end(_endTime?: TimeInput): void;
    isRecording(): boolean;
    recordException(_exception: Exception, _time?: TimeInput): void;
}
//# sourceMappingURL=NonRecordingSpan.d.ts.map