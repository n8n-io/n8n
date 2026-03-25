import { RedisCommandArguments } from '@redis/client/dist/lib/commands';
import { SampleRawReply, SampleReply } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
interface GetOptions {
    LATEST?: boolean;
}
export declare function transformArguments(key: string, options?: GetOptions): RedisCommandArguments;
export declare function transformReply(reply: [] | SampleRawReply): null | SampleReply;
export {};
