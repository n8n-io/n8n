import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare function transformArguments(count?: number): RedisCommandArguments;
type AclLogRawReply = [
    _: RedisCommandArgument,
    count: number,
    _: RedisCommandArgument,
    reason: RedisCommandArgument,
    _: RedisCommandArgument,
    context: RedisCommandArgument,
    _: RedisCommandArgument,
    object: RedisCommandArgument,
    _: RedisCommandArgument,
    username: RedisCommandArgument,
    _: RedisCommandArgument,
    ageSeconds: RedisCommandArgument,
    _: RedisCommandArgument,
    clientInfo: RedisCommandArgument
];
interface AclLog {
    count: number;
    reason: RedisCommandArgument;
    context: RedisCommandArgument;
    object: RedisCommandArgument;
    username: RedisCommandArgument;
    ageSeconds: number;
    clientInfo: RedisCommandArgument;
}
export declare function transformReply(reply: Array<AclLogRawReply>): Array<AclLog>;
export {};
