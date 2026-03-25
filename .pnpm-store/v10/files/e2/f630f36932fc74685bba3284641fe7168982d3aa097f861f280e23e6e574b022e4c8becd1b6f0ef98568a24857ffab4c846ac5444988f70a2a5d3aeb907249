import { Word } from "../../shell/Word.js";
import type { Request, Warnings } from "../../parse.js";
import { Headers } from "../../Headers.js";
import { DataParam } from "../../Request.js";
export declare const supportedArgs: Set<string>;
export declare function reprStr(s: string, quote?: '"' | "'"): string;
export declare function pybescComplex(s: string): string;
export declare function reprStrBinary(s: string): string;
export type OSVars = {
    [key: string]: string;
};
export declare function repr(word: Word, osVars: OSVars, imports: Set<string>, binary?: boolean, errorOk?: boolean): string;
export declare function asFloat(word: Word, osVars: OSVars, imports: Set<string>): string;
export declare function asInt(word: Word, osVars: OSVars, imports: Set<string>): string;
export declare function formatHeaders(headers: Headers, commentedOutHeaders: {
    [key: string]: string;
}, osVars: OSVars, imports: Set<string>): string;
export declare function formatDataAsJson(d: DataParam, imports: Set<string>, osVars: OSVars): [string | null, boolean];
export declare function printImports(imps: Set<string>): string;
export declare function _toPython(requests: Request[], warnings?: Warnings): string;
export declare function toPythonWarn(curlCommand: string | string[], warnings?: Warnings): [string, Warnings];
export declare function toPython(curlCommand: string | string[]): string;
