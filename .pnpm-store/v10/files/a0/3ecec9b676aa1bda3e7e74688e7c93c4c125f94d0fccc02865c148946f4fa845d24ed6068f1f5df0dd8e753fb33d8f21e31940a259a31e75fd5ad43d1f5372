import { Word } from "./shell/Word.js";
export type QueryList = Array<[Word, Word]>;
export type QueryDict = Array<[Word, Word | Array<Word>]>;
export type Query = [QueryList, QueryDict | null] | [null, null];
export declare function percentEncode(s: Word): Word;
export declare function percentEncodePlus(s: Word): Word;
export declare function wordDecodeURIComponent(s: Word): Word;
export declare function parseQueryString(s: Word | null): Query;
