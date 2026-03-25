import { RedisCommandArgument, RedisCommandArguments } from '.';
import { AuthOptions } from './AUTH';
interface HelloOptions {
    protover: number;
    auth?: Required<AuthOptions>;
    clientName?: string;
}
export declare function transformArguments(options?: HelloOptions): RedisCommandArguments;
type HelloRawReply = [
    _: never,
    server: RedisCommandArgument,
    _: never,
    version: RedisCommandArgument,
    _: never,
    proto: number,
    _: never,
    id: number,
    _: never,
    mode: RedisCommandArgument,
    _: never,
    role: RedisCommandArgument,
    _: never,
    modules: Array<RedisCommandArgument>
];
interface HelloTransformedReply {
    server: RedisCommandArgument;
    version: RedisCommandArgument;
    proto: number;
    id: number;
    mode: RedisCommandArgument;
    role: RedisCommandArgument;
    modules: Array<RedisCommandArgument>;
}
export declare function transformReply(reply: HelloRawReply): HelloTransformedReply;
export {};
