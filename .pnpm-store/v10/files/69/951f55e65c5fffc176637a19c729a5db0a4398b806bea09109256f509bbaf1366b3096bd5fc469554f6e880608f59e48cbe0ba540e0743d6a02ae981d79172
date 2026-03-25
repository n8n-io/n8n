import { AddEventResult, EventBuffer, EventBufferType, RecordingEvent } from '../types';
/**
 * A basic event buffer that does not do any compression.
 * Used as fallback if the compression worker cannot be loaded or is disabled.
 */
export declare class EventBufferArray implements EventBuffer {
    /** All the events that are buffered to be sent. */
    events: RecordingEvent[];
    /** @inheritdoc */
    hasCheckout: boolean;
    /** @inheritdoc */
    waitForCheckout: boolean;
    private _totalSize;
    constructor();
    /*@inheritdoc */
    readonly hasEvents: boolean;
    /*@inheritdoc */
    readonly type: EventBufferType;
    /** @inheritdoc */
    destroy(): void;
    /** @inheritdoc */
    addEvent(event: RecordingEvent): Promise<AddEventResult>;
    /** @inheritdoc */
    finish(): Promise<string>;
    /** @inheritdoc */
    clear(): void;
    /** @inheritdoc */
    getEarliestTimestamp(): number | null;
}
//# sourceMappingURL=EventBufferArray.d.ts.map
