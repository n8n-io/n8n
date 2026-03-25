import { RedisCommandArgument, RedisCommandArguments } from '.';
import { RangeReply, RawRangeReply } from './generic-transformers';
export { FIRST_KEY_INDEX, IS_READ_ONLY } from './LCS';
export declare function transformArguments(key1: RedisCommandArgument, key2: RedisCommandArgument): RedisCommandArguments;
type RawReply = [
    'matches',
    Array<[
        key1: RawRangeReply,
        key2: RawRangeReply,
        length: number
    ]>,
    'len',
    number
];
interface Reply {
    matches: Array<{
        key1: RangeReply;
        key2: RangeReply;
        length: number;
    }>;
    length: number;
}
export declare function transformReply(reply: RawReply): Reply;
