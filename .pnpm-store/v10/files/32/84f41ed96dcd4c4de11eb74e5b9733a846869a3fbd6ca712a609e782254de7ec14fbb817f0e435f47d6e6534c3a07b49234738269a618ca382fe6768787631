/**
 * Tokenizes the given code.
 * @param {string} code The code to tokenize.
 * @param {Options} [options] Options defining how to tokenize.
 * @returns {EspreeTokens} An array of tokens.
 * @throws {EnhancedSyntaxError} If the input code is invalid.
 * @private
 */
export function tokenize(code: string, options?: Options): EspreeTokens;
/**
 * Parses the given code.
 * @param {string} code The code to tokenize.
 * @param {Options} [options] Options defining how to tokenize.
 * @returns {acorn.Program} The "Program" AST node.
 * @throws {EnhancedSyntaxError} If the input code is invalid.
 */
export function parse(code: string, options?: Options): acorn.Program;
/** @type {string} */
export const version: string;
export const name: "espree";
export const Syntax: Record<string, string>;
export const latestEcmaVersion: 17;
export const supportedEcmaVersions: [3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
export { KEYS as VisitorKeys } from "eslint-visitor-keys";
export type EcmaVersion = 3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | "latest";
export type EspreeToken = {
    type: string;
    value: any;
    start?: number;
    end?: number;
    loc?: acorn.SourceLocation;
    range?: [number, number];
    regex?: {
        flags: string;
        pattern: string;
    };
};
export type EspreeComment = {
    type: "Block" | "Hashbang" | "Line";
    value: string;
    range?: [number, number];
    start?: number;
    end?: number;
    loc?: {
        start: acorn.Position | undefined;
        end: acorn.Position | undefined;
    };
};
export type EspreeTokens = {
    comments?: EspreeComment[];
} & EspreeToken[];
export type Options = {
    allowReserved?: boolean;
    ecmaVersion?: EcmaVersion;
    sourceType?: "script" | "module" | "commonjs";
    ecmaFeatures?: {
        jsx?: boolean;
        globalReturn?: boolean;
        impliedStrict?: boolean;
    };
    range?: boolean;
    loc?: boolean;
    tokens?: boolean;
    comment?: boolean;
};
import * as acorn from "acorn";
//# sourceMappingURL=espree.d.ts.map