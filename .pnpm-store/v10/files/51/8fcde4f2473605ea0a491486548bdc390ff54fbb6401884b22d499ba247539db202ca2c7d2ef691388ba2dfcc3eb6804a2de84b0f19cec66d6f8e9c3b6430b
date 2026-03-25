import { RedisJSON } from '.';
import { RedisCommandArgument } from '@redis/client/dist/lib/commands';
export declare const FIRST_KEY_INDEX = 1;
interface JsonMSetItem {
    key: RedisCommandArgument;
    path: RedisCommandArgument;
    value: RedisJSON;
}
export declare function transformArguments(items: Array<JsonMSetItem>): Array<string>;
export declare function transformReply(): 'OK';
export {};
