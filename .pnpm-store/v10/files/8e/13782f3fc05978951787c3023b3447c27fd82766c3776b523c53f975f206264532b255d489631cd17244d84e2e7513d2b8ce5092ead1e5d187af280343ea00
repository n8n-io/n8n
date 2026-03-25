/// <reference types="node" />
import { RedisCommandArgument, RedisCommandArguments } from '.';
interface CommonOptions {
    REDIRECT?: number;
    NOLOOP?: boolean;
}
interface BroadcastOptions {
    BCAST?: boolean;
    PREFIX?: RedisCommandArgument | Array<RedisCommandArgument>;
}
interface OptInOptions {
    OPTIN?: boolean;
}
interface OptOutOptions {
    OPTOUT?: boolean;
}
type ClientTrackingOptions = CommonOptions & (BroadcastOptions | OptInOptions | OptOutOptions);
export declare function transformArguments<M extends boolean>(mode: M, options?: M extends true ? ClientTrackingOptions : undefined): RedisCommandArguments;
export declare function transformReply(): 'OK' | Buffer;
export {};
