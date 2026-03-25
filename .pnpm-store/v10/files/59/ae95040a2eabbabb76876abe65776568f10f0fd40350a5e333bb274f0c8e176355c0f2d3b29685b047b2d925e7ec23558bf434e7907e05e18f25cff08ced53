import type { PresenceOpts, PresenceOnJoinCallback, PresenceOnLeaveCallback } from 'phoenix';
import type RealtimeChannel from './RealtimeChannel';
type Presence<T extends {
    [key: string]: any;
} = {}> = {
    presence_ref: string;
} & T;
export type RealtimePresenceState<T extends {
    [key: string]: any;
} = {}> = {
    [key: string]: Presence<T>[];
};
export type RealtimePresenceJoinPayload<T extends {
    [key: string]: any;
}> = {
    event: `${REALTIME_PRESENCE_LISTEN_EVENTS.JOIN}`;
    key: string;
    currentPresences: Presence<T>[];
    newPresences: Presence<T>[];
};
export type RealtimePresenceLeavePayload<T extends {
    [key: string]: any;
}> = {
    event: `${REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE}`;
    key: string;
    currentPresences: Presence<T>[];
    leftPresences: Presence<T>[];
};
export declare enum REALTIME_PRESENCE_LISTEN_EVENTS {
    SYNC = "sync",
    JOIN = "join",
    LEAVE = "leave"
}
type RawPresenceState = {
    [key: string]: {
        metas: {
            phx_ref?: string;
            phx_ref_prev?: string;
            [key: string]: any;
        }[];
    };
};
type RawPresenceDiff = {
    joins: RawPresenceState;
    leaves: RawPresenceState;
};
export default class RealtimePresence {
    channel: RealtimeChannel;
    state: RealtimePresenceState;
    pendingDiffs: RawPresenceDiff[];
    joinRef: string | null;
    caller: {
        onJoin: PresenceOnJoinCallback;
        onLeave: PresenceOnLeaveCallback;
        onSync: () => void;
    };
    /**
     * Initializes the Presence.
     *
     * @param channel - The RealtimeChannel
     * @param opts - The options,
     *        for example `{events: {state: 'state', diff: 'diff'}}`
     */
    constructor(channel: RealtimeChannel, opts?: PresenceOpts);
}
export {};
//# sourceMappingURL=RealtimePresence.d.ts.map