import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare function transformArguments(username: RedisCommandArgument): RedisCommandArguments;
type AclGetUserRawReply = [
    'flags',
    Array<RedisCommandArgument>,
    'passwords',
    Array<RedisCommandArgument>,
    'commands',
    RedisCommandArgument,
    'keys',
    Array<RedisCommandArgument> | RedisCommandArgument,
    'channels',
    Array<RedisCommandArgument> | RedisCommandArgument,
    'selectors' | undefined,
    Array<Array<string>> | undefined
];
interface AclUser {
    flags: Array<RedisCommandArgument>;
    passwords: Array<RedisCommandArgument>;
    commands: RedisCommandArgument;
    keys: Array<RedisCommandArgument> | RedisCommandArgument;
    channels: Array<RedisCommandArgument> | RedisCommandArgument;
    selectors?: Array<Array<string>>;
}
export declare function transformReply(reply: AclGetUserRawReply): AclUser;
export {};
