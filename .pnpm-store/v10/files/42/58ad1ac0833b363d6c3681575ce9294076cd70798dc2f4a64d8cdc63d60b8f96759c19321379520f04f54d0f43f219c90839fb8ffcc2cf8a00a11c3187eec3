import { RedisCommandArgument, RedisCommandArguments } from '.';
import { GeoCoordinates } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 1;
interface GeoMember extends GeoCoordinates {
    member: RedisCommandArgument;
}
interface NX {
    NX?: true;
}
interface XX {
    XX?: true;
}
type SetGuards = NX | XX;
interface GeoAddCommonOptions {
    CH?: true;
}
type GeoAddOptions = SetGuards & GeoAddCommonOptions;
export declare function transformArguments(key: RedisCommandArgument, toAdd: GeoMember | Array<GeoMember>, options?: GeoAddOptions): RedisCommandArguments;
export declare function transformReply(): number;
export {};
