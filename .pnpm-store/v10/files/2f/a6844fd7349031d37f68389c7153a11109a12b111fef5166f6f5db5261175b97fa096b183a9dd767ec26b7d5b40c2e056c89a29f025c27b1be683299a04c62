import { RedisSearchLanguages, PropertyName, RediSearchSchema } from '.';
interface CreateOptions {
    ON?: 'HASH' | 'JSON';
    PREFIX?: string | Array<string>;
    FILTER?: string;
    LANGUAGE?: RedisSearchLanguages;
    LANGUAGE_FIELD?: PropertyName;
    SCORE?: number;
    SCORE_FIELD?: PropertyName;
    MAXTEXTFIELDS?: true;
    TEMPORARY?: number;
    NOOFFSETS?: true;
    NOHL?: true;
    NOFIELDS?: true;
    NOFREQS?: true;
    SKIPINITIALSCAN?: true;
    STOPWORDS?: string | Array<string>;
}
export declare function transformArguments(index: string, schema: RediSearchSchema, options?: CreateOptions): Array<string>;
export declare function transformReply(): 'OK';
export {};
