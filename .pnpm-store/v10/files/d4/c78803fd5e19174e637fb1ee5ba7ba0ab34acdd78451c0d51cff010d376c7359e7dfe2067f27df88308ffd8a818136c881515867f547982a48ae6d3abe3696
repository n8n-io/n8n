import { Word } from "../../shell/Word.js";
import type { Request } from "../../parse.js";
declare function reprStr(s: string): string;
declare function repr(w: Word | null): string;
declare function setVariableValue(outputVariable: string | null, value: string, termination?: string): string;
declare function callFunction(outputVariable: string | null, functionName: string, params: string | string[] | string[][], termination?: string): string;
declare function addCellArray(mapping: ([Word, Word] | [string, Word | string])[], keysNotToQuote?: string[], indentLevel?: number, pairs?: boolean): string;
declare function structify(obj: number[] | string[] | {
    [key: string]: string;
} | string | number | null, indentLevel?: number): string;
declare function containsBody(request: Request): boolean;
declare function prepareQueryString(request: Request): string | null;
declare function prepareCookies(request: Request): string | null;
declare const cookieString = "char(join(join(cookies, '='), '; '))";
declare const paramsString = "char(join(join(params, '='), '&'))";
export { reprStr, repr, setVariableValue, callFunction, addCellArray, structify, containsBody, prepareQueryString, prepareCookies, cookieString, paramsString, };
