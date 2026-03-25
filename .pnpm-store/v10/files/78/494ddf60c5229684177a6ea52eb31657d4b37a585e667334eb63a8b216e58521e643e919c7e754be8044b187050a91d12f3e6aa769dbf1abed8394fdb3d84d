import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
type GetExModes = {
    EX: number;
} | {
    PX: number;
} | {
    EXAT: number | Date;
} | {
    PXAT: number | Date;
} | {
    PERSIST: true;
};
export declare function transformArguments(key: RedisCommandArgument, mode: GetExModes): RedisCommandArguments;
export declare function transformReply(): RedisCommandArgument | null;
export {};
