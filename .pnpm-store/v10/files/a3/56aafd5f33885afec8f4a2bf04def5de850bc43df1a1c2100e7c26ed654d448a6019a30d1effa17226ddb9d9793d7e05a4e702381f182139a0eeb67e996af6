export type Reviver = (key: string, value: unknown) => unknown;
export interface ParseOptions {
    parseNumber?: NumberParser;
    onDuplicateKey?: OnDuplicateKey;
}
export type NumberParser = (value: string) => unknown;
export interface DuplicateKeyInfo {
    key: string;
    position: number;
    oldValue: unknown;
    newValue: unknown;
}
export type OnDuplicateKey = (info: DuplicateKeyInfo) => unknown | undefined;
export type Replacer = ((key: string, value: unknown) => unknown | undefined) | Array<string | number>;
export interface NumberStringifier {
    test: (value: unknown) => boolean;
    stringify: (value: unknown) => string;
}
export type GenericObject<T> = Record<string, T>;
export interface NumberSplit {
    sign: '-' | '';
    digits: string;
    exponent: number;
}
/**
 * @deprecated use `unknown` or `string | number | boolean | null` instead
 */
export type JSONPrimitive = string | number | boolean | null;
/**
 * @deprecated use `unknown` instead
 */
export type JSONValue = {
    [key: string]: JSONValue;
} | JSONValue[] | JSONPrimitive;
/**
 * @deprecated use `unknown` or a Record instead
 */
export type JSONObject = {
    [key: string]: JSONValue;
};
/**
 * @deprecated use `unknown` or an Array instead
 */
export type JSONArray = JSONValue[];
/**
 * @deprecated use `unknown` instead
 */
export type JavaScriptPrimitive = unknown;
/**
 * @deprecated use `unknown` instead
 */
export type JavaScriptValue = unknown;
/**
 * @deprecated use `unknown` instead
 */
export type JavaScriptObject = unknown;
/**
 * @deprecated use `unknown` instead
 */
export type JavaScriptArray = unknown;
//# sourceMappingURL=types.d.ts.map