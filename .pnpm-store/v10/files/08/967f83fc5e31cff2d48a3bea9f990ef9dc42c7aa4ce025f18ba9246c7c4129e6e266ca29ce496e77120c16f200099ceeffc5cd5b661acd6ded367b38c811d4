import type { Parser } from "./Parser.js";
export interface ShellToken {
    type: "variable" | "command";
    value: string;
    text: string;
    syntaxNode: Parser.SyntaxNode;
}
export type Token = string | ShellToken;
export declare class Word implements Iterable<Token> {
    readonly tokens: Token[];
    constructor(tokens?: string);
    constructor(tokens?: Token[]);
    get length(): number;
    [Symbol.iterator](): Iterator<Token>;
    get(index: number): Token;
    charAt(index?: number): Token;
    indexOf(search: string, start?: number): number;
    indexOfFirstChar(search: string): number;
    removeFirstChar(c: string): Word;
    copy(): Word;
    slice(indexStart?: number, indexEnd?: number): Word;
    includes(search: string, start?: number): boolean;
    test(search: RegExp): boolean;
    prepend(c: string): Word;
    append(c: string): Word;
    add(other: Word): Word;
    match(regex: RegExp): RegExpMatchArray | null;
    search(regex: RegExp): number;
    replace(search: string | RegExp, replacement: string): Word;
    split(separator: string, limit?: number): Word[];
    toLowerCase(): Word;
    toUpperCase(): Word;
    trimStart(): Word;
    trimEnd(): Word;
    trim(): Word;
    isEmpty(): boolean;
    toBool(): boolean;
    isString(): boolean;
    firstShellToken(): ShellToken | null;
    startsWith(prefix: string): boolean;
    endsWith(suffix: string): boolean;
    toString(): string;
    valueOf: () => string;
}
export declare function eq(it: Word | undefined | null, other: string | Word | undefined | null): boolean;
export declare function firstShellToken(word: string | Word): ShellToken | null;
export declare function mergeWords(...words: (Word | string)[]): Word;
export declare function joinWords(words: Word[], joinChar: string): Word;
