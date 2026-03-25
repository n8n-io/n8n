import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument, member: RedisCommandArgument | Array<RedisCommandArgument>): RedisCommandArguments;
type GeoCoordinatesRawReply = Array<[RedisCommandArgument, RedisCommandArgument] | null>;
interface GeoCoordinates {
    longitude: RedisCommandArgument;
    latitude: RedisCommandArgument;
}
export declare function transformReply(reply: GeoCoordinatesRawReply): Array<GeoCoordinates | null>;
export {};
