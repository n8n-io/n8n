import { JSONRPCMessage } from '../../types.js';
import { EventStore } from '../../server/streamableHttp.js';
/**
 * Simple in-memory implementation of the EventStore interface for resumability
 * This is primarily intended for examples and testing, not for production use
 * where a persistent storage solution would be more appropriate.
 */
export declare class InMemoryEventStore implements EventStore {
    private events;
    /**
     * Generates a unique event ID for a given stream ID
     */
    private generateEventId;
    /**
     * Extracts the stream ID from an event ID
     */
    private getStreamIdFromEventId;
    /**
     * Stores an event with a generated event ID
     * Implements EventStore.storeEvent
     */
    storeEvent(streamId: string, message: JSONRPCMessage): Promise<string>;
    /**
     * Replays events that occurred after a specific event ID
     * Implements EventStore.replayEventsAfter
     */
    replayEventsAfter(lastEventId: string, { send }: {
        send: (eventId: string, message: JSONRPCMessage) => Promise<void>;
    }): Promise<string>;
}
//# sourceMappingURL=inMemoryEventStore.d.ts.map