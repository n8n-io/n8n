import { Options } from "./options";
import { namedTypes } from "ast-types";
declare type Pos = namedTypes.Position;
declare type LineInfo = {
    readonly line: string;
    readonly indent: number;
    readonly locked: boolean;
    readonly sliceStart: number;
    readonly sliceEnd: number;
};
export declare class Lines {
    private infos;
    readonly length: number;
    readonly name: string | null;
    private mappings;
    private cachedSourceMap;
    private cachedTabWidth;
    constructor(infos: LineInfo[], sourceFileName?: string | null);
    toString(options?: Options): string;
    getSourceMap(sourceMapName: string, sourceRoot?: string): any;
    bootstrapCharAt(pos: Pos): string;
    charAt(pos: Pos): string;
    stripMargin(width: number, skipFirstLine: boolean): Lines;
    indent(by: number): Lines;
    indentTail(by: number): Lines;
    lockIndentTail(): Lines;
    getIndentAt(line: number): number;
    guessTabWidth(): number;
    startsWithComment(): boolean;
    isOnlyWhitespace(): boolean;
    isPrecededOnlyByWhitespace(pos: Pos): boolean;
    getLineLength(line: number): number;
    nextPos(pos: Pos, skipSpaces?: boolean): boolean;
    prevPos(pos: Pos, skipSpaces?: boolean): boolean;
    firstPos(): {
        line: number;
        column: number;
    };
    lastPos(): {
        line: number;
        column: number;
    };
    skipSpaces(pos: Pos, backward?: boolean, modifyInPlace?: boolean): namedTypes.Position | null;
    trimLeft(): Lines;
    trimRight(): Lines;
    trim(): Lines;
    eachPos(callback: (pos: Pos) => any, startPos?: Pos, skipSpaces?: boolean): void;
    bootstrapSlice(start: Pos, end: Pos): Lines;
    slice(start?: Pos, end?: Pos): Lines;
    bootstrapSliceString(start: Pos, end: Pos, options?: Options): string;
    sliceString(start?: Pos, end?: Pos, options?: Options): string;
    isEmpty(): boolean;
    join(elements: (string | Lines)[]): Lines;
    concat(...args: (string | Lines)[]): Lines;
}
export declare function countSpaces(spaces: any, tabWidth?: number): number;
/**
 * @param {Object} options - Options object that configures printing.
 */
export declare function fromString(string: string | Lines, options?: Options): Lines;
export declare function concat(elements: any): Lines;
export {};
