import { RedisCommandArgument, RedisCommandArguments } from '.';
import { GeoSearchFrom, GeoSearchBy, GeoSearchOptions } from './generic-transformers';
export { FIRST_KEY_INDEX, IS_READ_ONLY } from './GEOSEARCH';
interface GeoSearchStoreOptions extends GeoSearchOptions {
    STOREDIST?: true;
}
export declare function transformArguments(destination: RedisCommandArgument, source: RedisCommandArgument, from: GeoSearchFrom, by: GeoSearchBy, options?: GeoSearchStoreOptions): RedisCommandArguments;
export declare function transformReply(reply: number): number;
