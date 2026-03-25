import { RedisCommandArguments } from '.';
export declare function transformArguments(): RedisCommandArguments;
type RawReply = [
    'flags',
    Array<string>,
    'redirect',
    number,
    'prefixes',
    Array<string>
];
interface Reply {
    flags: Set<string>;
    redirect: number;
    prefixes: Array<string>;
}
export declare function transformReply(reply: RawReply): Reply;
export {};
