import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
interface XAddOptions {
    NOMKSTREAM?: true;
    TRIM?: {
        strategy?: 'MAXLEN' | 'MINID';
        strategyModifier?: '=' | '~';
        threshold: number;
        limit?: number;
    };
}
export declare function transformArguments(key: RedisCommandArgument, id: RedisCommandArgument, message: Record<string, RedisCommandArgument>, options?: XAddOptions): RedisCommandArguments;
export declare function transformReply(): string;
export {};
