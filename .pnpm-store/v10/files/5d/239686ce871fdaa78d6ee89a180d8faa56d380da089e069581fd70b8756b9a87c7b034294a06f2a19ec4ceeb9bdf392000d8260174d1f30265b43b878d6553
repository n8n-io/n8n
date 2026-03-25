import { RedisCommandArguments } from '@redis/client/dist/lib/commands';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
interface GetOptions {
    path?: string | Array<string>;
    INDENT?: string;
    NEWLINE?: string;
    SPACE?: string;
    NOESCAPE?: true;
}
export declare function transformArguments(key: string, options?: GetOptions): RedisCommandArguments;
export { transformRedisJsonNullReply as transformReply } from '.';
