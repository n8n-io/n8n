/// <reference types="node" />
import { RedisCommandArgument } from "../commands";
export declare enum PubSubType {
    CHANNELS = "CHANNELS",
    PATTERNS = "PATTERNS",
    SHARDED = "SHARDED"
}
export type PubSubListener<RETURN_BUFFERS extends boolean = false> = <T extends RETURN_BUFFERS extends true ? Buffer : string>(message: T, channel: T) => unknown;
export interface ChannelListeners {
    unsubscribing: boolean;
    buffers: Set<PubSubListener<true>>;
    strings: Set<PubSubListener<false>>;
}
export type PubSubTypeListeners = Map<string, ChannelListeners>;
export type PubSubCommand = ReturnType<typeof PubSub.prototype.subscribe | typeof PubSub.prototype.unsubscribe | typeof PubSub.prototype.extendTypeListeners>;
export declare class PubSub {
    #private;
    static isStatusReply(reply: Array<Buffer>): boolean;
    static isShardedUnsubscribe(reply: Array<Buffer>): boolean;
    get isActive(): boolean;
    subscribe<T extends boolean>(type: PubSubType, channels: string | Array<string>, listener: PubSubListener<T>, returnBuffers?: T): {
        args: RedisCommandArgument[];
        channelsCounter: number;
        resolve: () => void;
        reject: () => void;
    } | undefined;
    extendChannelListeners(type: PubSubType, channel: string, listeners: ChannelListeners): {
        args: (string | Buffer)[];
        channelsCounter: number;
        resolve: () => number;
        reject: () => void;
    } | undefined;
    extendTypeListeners(type: PubSubType, listeners: PubSubTypeListeners): {
        args: RedisCommandArgument[];
        channelsCounter: number;
        resolve: () => number;
        reject: () => void;
    } | undefined;
    unsubscribe<T extends boolean>(type: PubSubType, channels?: string | Array<string>, listener?: PubSubListener<T>, returnBuffers?: T): {
        args: RedisCommandArgument[];
        channelsCounter: number;
        resolve: () => void;
        reject: undefined;
    } | undefined;
    reset(): void;
    resubscribe(): Array<PubSubCommand>;
    handleMessageReply(reply: Array<Buffer>): boolean;
    removeShardedListeners(channel: string): ChannelListeners;
    getTypeListeners(type: PubSubType): PubSubTypeListeners;
}
