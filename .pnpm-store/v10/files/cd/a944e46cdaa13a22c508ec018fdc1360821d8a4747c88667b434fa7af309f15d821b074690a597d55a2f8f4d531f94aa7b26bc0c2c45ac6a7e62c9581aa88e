import type RealtimeChannel from '../RealtimeChannel';
export default class Push {
    channel: RealtimeChannel;
    event: string;
    payload: {
        [key: string]: any;
    };
    timeout: number;
    sent: boolean;
    timeoutTimer: number | undefined;
    ref: string;
    receivedResp: {
        status: string;
        response: {
            [key: string]: any;
        };
    } | null;
    recHooks: {
        status: string;
        callback: Function;
    }[];
    refEvent: string | null;
    /**
     * Initializes the Push
     *
     * @param channel The Channel
     * @param event The event, for example `"phx_join"`
     * @param payload The payload, for example `{user_id: 123}`
     * @param timeout The push timeout in milliseconds
     */
    constructor(channel: RealtimeChannel, event: string, payload?: {
        [key: string]: any;
    }, timeout?: number);
    resend(timeout: number): void;
    send(): void;
    updatePayload(payload: {
        [key: string]: any;
    }): void;
    receive(status: string, callback: Function): this;
    startTimeout(): void;
    trigger(status: string, response: any): void;
    destroy(): void;
    private _cancelRefEvent;
    private _cancelTimeout;
    private _matchReceive;
    private _hasReceived;
}
//# sourceMappingURL=push.d.ts.map