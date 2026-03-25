export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: string): Array<string>;
export type InfoRawReply = [
    _: string,
    size: number,
    _: string,
    numberOfBuckets: number,
    _: string,
    numberOfFilters: number,
    _: string,
    numberOfInsertedItems: number,
    _: string,
    numberOfDeletedItems: number,
    _: string,
    bucketSize: number,
    _: string,
    expansionRate: number,
    _: string,
    maxIteration: number
];
export interface InfoReply {
    size: number;
    numberOfBuckets: number;
    numberOfFilters: number;
    numberOfInsertedItems: number;
    numberOfDeletedItems: number;
    bucketSize: number;
    expansionRate: number;
    maxIteration: number;
}
export declare function transformReply(reply: InfoRawReply): InfoReply;
