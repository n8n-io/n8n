export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: string): Array<string>;
export type InfoRawReply = [
    _: string,
    capacity: number,
    _: string,
    size: number,
    _: string,
    numberOfFilters: number,
    _: string,
    numberOfInsertedItems: number,
    _: string,
    expansionRate: number
];
export interface InfoReply {
    capacity: number;
    size: number;
    numberOfFilters: number;
    numberOfInsertedItems: number;
    expansionRate: number;
}
export declare function transformReply(reply: InfoRawReply): InfoReply;
