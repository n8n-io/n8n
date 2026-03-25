/// <reference types="node" />
/// <reference types="node" />
import { RedisCommandArguments, RedisCommandRawReply } from '../commands';
import { ChannelListeners, PubSubListener, PubSubType, PubSubTypeListeners } from './pub-sub';
export interface QueueCommandOptions {
    asap?: boolean;
    chainId?: symbol;
    signal?: AbortSignal;
    returnBuffers?: boolean;
}
export interface CommandWaitingToBeSent extends CommandWaitingForReply {
    args: RedisCommandArguments;
    chainId?: symbol;
    abort?: {
        signal: AbortSignal;
        listener(): void;
    };
}
interface CommandWaitingForReply {
    resolve(reply?: unknown): void;
    reject(err: unknown): void;
    channelsCounter?: number;
    returnBuffers?: boolean;
}
export type OnShardedChannelMoved = (channel: string, listeners: ChannelListeners) => void;
export default class RedisCommandsQueue {
    #private;
    get isPubSubActive(): boolean;
    constructor(maxLength: number | null | undefined, onShardedChannelMoved: OnShardedChannelMoved);
    addCommand<T = RedisCommandRawReply>(args: RedisCommandArguments, options?: QueueCommandOptions): Promise<T>;
    subscribe<T extends boolean>(type: PubSubType, channels: string | Array<string>, listener: PubSubListener<T>, returnBuffers?: T): Promise<void> | undefined;
    unsubscribe<T extends boolean>(type: PubSubType, channels?: string | Array<string>, listener?: PubSubListener<T>, returnBuffers?: T): Promise<void> | undefined;
    resubscribe(): Promise<any> | undefined;
    extendPubSubChannelListeners(type: PubSubType, channel: string, listeners: ChannelListeners): Promise<void> | undefined;
    extendPubSubListeners(type: PubSubType, listeners: PubSubTypeListeners): Promise<void> | undefined;
    getPubSubListeners(type: PubSubType): PubSubTypeListeners;
    getCommandToSend(): RedisCommandArguments | undefined;
    onReplyChunk(chunk: Buffer): void;
    flushWaitingForReply(err: Error): void;
    flushAll(err: Error): void;
}
export {};
