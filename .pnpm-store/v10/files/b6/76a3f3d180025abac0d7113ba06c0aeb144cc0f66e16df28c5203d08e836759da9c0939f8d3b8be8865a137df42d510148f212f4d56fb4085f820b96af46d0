import { RedisCommandArgument, RedisCommandArguments } from '.';
import { transformArguments as transformXAutoClaimArguments } from './XAUTOCLAIM';
export { FIRST_KEY_INDEX } from './XAUTOCLAIM';
export declare function transformArguments(...args: Parameters<typeof transformXAutoClaimArguments>): RedisCommandArguments;
type XAutoClaimJustIdRawReply = [RedisCommandArgument, Array<RedisCommandArgument>];
interface XAutoClaimJustIdReply {
    nextId: RedisCommandArgument;
    messages: Array<RedisCommandArgument>;
}
export declare function transformReply(reply: XAutoClaimJustIdRawReply): XAutoClaimJustIdReply;
