import { RedisCommandArgument, RedisCommandArguments } from '.';
import { ZMember } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 1;
interface NX {
    NX?: true;
}
interface XX {
    XX?: true;
}
interface LT {
    LT?: true;
}
interface GT {
    GT?: true;
}
interface CH {
    CH?: true;
}
interface INCR {
    INCR?: true;
}
type ZAddOptions = (NX | (XX & LT & GT)) & CH & INCR;
export declare function transformArguments(key: RedisCommandArgument, members: ZMember | Array<ZMember>, options?: ZAddOptions): RedisCommandArguments;
export { transformNumberInfinityReply as transformReply } from './generic-transformers';
