import { Word } from "./shell/Word.js";
import type { Warnings } from "./Warnings.js";
export declare class Headers implements Iterable<[Word, Word | null]> {
    readonly headers: [Word, Word | null][];
    readonly lowercase: boolean;
    constructor(headerArgs?: Word[], warnings?: Warnings, argName?: string);
    get length(): number;
    [Symbol.iterator](): Iterator<[Word, Word | null]>;
    get(header: string): Word | null | undefined;
    getContentType(): string | null | undefined;
    has(header: Word | string): boolean;
    setIfMissing(header: string, value: Word | string): boolean;
    prependIfMissing(header: string, value: Word | string): boolean;
    set(header: string, value: Word | string): void;
    delete(header: string): void;
    clearNulls(): void;
    count(header: string): number;
    toBool(): boolean;
}
export type Cookie = [Word, Word];
export type Cookies = Array<Cookie>;
export declare function parseCookiesStrict(cookieString: Word): Cookies | null;
export declare function parseCookies(cookieString: Word): Cookies | null;
