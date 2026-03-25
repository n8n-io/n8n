import { CHANNEL_STATES } from './lib/constants';
import Push from './lib/push';
import type RealtimeClient from './RealtimeClient';
import Timer from './lib/timer';
import RealtimePresence, { REALTIME_PRESENCE_LISTEN_EVENTS } from './RealtimePresence';
import type { RealtimePresenceJoinPayload, RealtimePresenceLeavePayload, RealtimePresenceState } from './RealtimePresence';
export type RealtimeChannelOptions = {
    config: {
        /**
         * self option enables client to receive message it broadcast
         * ack option instructs server to acknowledge that broadcast message was received
         */
        broadcast?: {
            self?: boolean;
            ack?: boolean;
        };
        /**
         * key option is used to track presence payload across clients
         */
        presence?: {
            key?: string;
        };
        /**
         * defines if the channel is private or not and if RLS policies will be used to check data
         */
        private?: boolean;
    };
};
type RealtimePostgresChangesPayloadBase = {
    schema: string;
    table: string;
    commit_timestamp: string;
    errors: string[];
};
export type RealtimePostgresInsertPayload<T extends {
    [key: string]: any;
}> = RealtimePostgresChangesPayloadBase & {
    eventType: `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`;
    new: T;
    old: {};
};
export type RealtimePostgresUpdatePayload<T extends {
    [key: string]: any;
}> = RealtimePostgresChangesPayloadBase & {
    eventType: `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE}`;
    new: T;
    old: Partial<T>;
};
export type RealtimePostgresDeletePayload<T extends {
    [key: string]: any;
}> = RealtimePostgresChangesPayloadBase & {
    eventType: `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE}`;
    new: {};
    old: Partial<T>;
};
export type RealtimePostgresChangesPayload<T extends {
    [key: string]: any;
}> = RealtimePostgresInsertPayload<T> | RealtimePostgresUpdatePayload<T> | RealtimePostgresDeletePayload<T>;
export type RealtimePostgresChangesFilter<T extends `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT}`> = {
    /**
     * The type of database change to listen to.
     */
    event: T;
    /**
     * The database schema to listen to.
     */
    schema: string;
    /**
     * The database table to listen to.
     */
    table?: string;
    /**
     * Receive database changes when filter is matched.
     */
    filter?: string;
};
export type RealtimeChannelSendResponse = 'ok' | 'timed out' | 'error';
export declare enum REALTIME_POSTGRES_CHANGES_LISTEN_EVENT {
    ALL = "*",
    INSERT = "INSERT",
    UPDATE = "UPDATE",
    DELETE = "DELETE"
}
export declare enum REALTIME_LISTEN_TYPES {
    BROADCAST = "broadcast",
    PRESENCE = "presence",
    POSTGRES_CHANGES = "postgres_changes",
    SYSTEM = "system"
}
export declare enum REALTIME_SUBSCRIBE_STATES {
    SUBSCRIBED = "SUBSCRIBED",
    TIMED_OUT = "TIMED_OUT",
    CLOSED = "CLOSED",
    CHANNEL_ERROR = "CHANNEL_ERROR"
}
export declare const REALTIME_CHANNEL_STATES: typeof CHANNEL_STATES;
/** A channel is the basic building block of Realtime
 * and narrows the scope of data flow to subscribed clients.
 * You can think of a channel as a chatroom where participants are able to see who's online
 * and send and receive messages.
 */
export default class RealtimeChannel {
    /** Topic name can be any string. */
    topic: string;
    params: RealtimeChannelOptions;
    socket: RealtimeClient;
    bindings: {
        [key: string]: {
            type: string;
            filter: {
                [key: string]: any;
            };
            callback: Function;
            id?: string;
        }[];
    };
    timeout: number;
    state: CHANNEL_STATES;
    joinedOnce: boolean;
    joinPush: Push;
    rejoinTimer: Timer;
    pushBuffer: Push[];
    presence: RealtimePresence;
    broadcastEndpointURL: string;
    subTopic: string;
    private: boolean;
    constructor(
    /** Topic name can be any string. */
    topic: string, params: RealtimeChannelOptions | undefined, socket: RealtimeClient);
    /** Subscribe registers your client with the server */
    subscribe(callback?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void, timeout?: number): RealtimeChannel;
    presenceState<T extends {
        [key: string]: any;
    } = {}>(): RealtimePresenceState<T>;
    track(payload: {
        [key: string]: any;
    }, opts?: {
        [key: string]: any;
    }): Promise<RealtimeChannelSendResponse>;
    untrack(opts?: {
        [key: string]: any;
    }): Promise<RealtimeChannelSendResponse>;
    /**
     * Creates an event handler that listens to changes.
     */
    on(type: `${REALTIME_LISTEN_TYPES.PRESENCE}`, filter: {
        event: `${REALTIME_PRESENCE_LISTEN_EVENTS.SYNC}`;
    }, callback: () => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.PRESENCE}`, filter: {
        event: `${REALTIME_PRESENCE_LISTEN_EVENTS.JOIN}`;
    }, callback: (payload: RealtimePresenceJoinPayload<T>) => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.PRESENCE}`, filter: {
        event: `${REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE}`;
    }, callback: (payload: RealtimePresenceLeavePayload<T>) => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`, filter: RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`>, callback: (payload: RealtimePostgresChangesPayload<T>) => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`, filter: RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`>, callback: (payload: RealtimePostgresInsertPayload<T>) => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`, filter: RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE}`>, callback: (payload: RealtimePostgresUpdatePayload<T>) => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`, filter: RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE}`>, callback: (payload: RealtimePostgresDeletePayload<T>) => void): RealtimeChannel;
    /**
     * The following is placed here to display on supabase.com/docs/reference/javascript/subscribe.
     * @param type One of "broadcast", "presence", or "postgres_changes".
     * @param filter Custom object specific to the Realtime feature detailing which payloads to receive.
     * @param callback Function to be invoked when event handler is triggered.
     */
    on(type: `${REALTIME_LISTEN_TYPES.BROADCAST}`, filter: {
        event: string;
    }, callback: (payload: {
        type: `${REALTIME_LISTEN_TYPES.BROADCAST}`;
        event: string;
        [key: string]: any;
    }) => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.BROADCAST}`, filter: {
        event: string;
    }, callback: (payload: {
        type: `${REALTIME_LISTEN_TYPES.BROADCAST}`;
        event: string;
        payload: T;
    }) => void): RealtimeChannel;
    on<T extends {
        [key: string]: any;
    }>(type: `${REALTIME_LISTEN_TYPES.SYSTEM}`, filter: {}, callback: (payload: any) => void): RealtimeChannel;
    /**
     * Sends a message into the channel.
     *
     * @param args Arguments to send to channel
     * @param args.type The type of event to send
     * @param args.event The name of the event being sent
     * @param args.payload Payload to be sent
     * @param opts Options to be used during the send process
     */
    send(args: {
        type: 'broadcast' | 'presence' | 'postgres_changes';
        event: string;
        payload?: any;
        [key: string]: any;
    }, opts?: {
        [key: string]: any;
    }): Promise<RealtimeChannelSendResponse>;
    updateJoinPayload(payload: {
        [key: string]: any;
    }): void;
    /**
     * Leaves the channel.
     *
     * Unsubscribes from server events, and instructs channel to terminate on server.
     * Triggers onClose() hooks.
     *
     * To receive leave acknowledgements, use the a `receive` hook to bind to the server ack, ie:
     * channel.unsubscribe().receive("ok", () => alert("left!") )
     */
    unsubscribe(timeout?: number): Promise<'ok' | 'timed out' | 'error'>;
    /**
     * Teardown the channel.
     *
     * Destroys and stops related timers.
     */
    teardown(): void;
}
export {};
//# sourceMappingURL=RealtimeChannel.d.ts.map