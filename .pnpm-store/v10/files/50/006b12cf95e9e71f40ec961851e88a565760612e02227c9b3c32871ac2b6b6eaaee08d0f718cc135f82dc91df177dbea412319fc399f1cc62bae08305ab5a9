import { HttpsProxyAgent } from 'https-proxy-agent';
import type { HttpResolveConfig } from './config';
import type { UserContext } from './walk';
export { parseYaml, stringifyYaml } from './js-yaml';
export type StackFrame<T> = {
    prev: StackFrame<T> | null;
    value: T;
};
export type Stack<T> = StackFrame<T> | null;
export type StackNonEmpty<T> = StackFrame<T>;
export declare function pushStack<T, P extends Stack<T> = Stack<T>>(head: P, value: T): {
    prev: P;
    value: T;
};
export declare function pluralize(sentence: string, count?: number, inclusive?: boolean): string;
export declare function popStack<T, P extends Stack<T>>(head: P): StackFrame<T> | null;
export type BundleOutputFormat = 'json' | 'yml' | 'yaml';
export declare function loadYaml<T>(filename: string): Promise<T>;
export declare function isDefined<T>(x: T | undefined): x is T;
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
export declare function isEmptyObject(value: unknown): value is Record<string, unknown>;
export declare function isNotEmptyObject(obj: unknown): boolean;
export declare function isEmptyArray(value: unknown): boolean;
export declare function isNotEmptyArray<T>(args?: T[]): boolean;
export declare function readFileFromUrl(url: string, config: HttpResolveConfig): Promise<{
    body: any;
    mimeType: any;
}>;
export declare function pickObjectProps<T extends Record<string, unknown>>(object: T, keys: Array<string>): T;
export declare function omitObjectProps<T extends Record<string, unknown>>(object: T, keys: Array<string>): T;
export declare function splitCamelCaseIntoWords(str: string): Set<string>;
export declare function validateMimeType({ type, value }: any, { report, location }: UserContext, allowedValues: string[]): void;
export declare function validateMimeTypeOAS3({ type, value }: any, { report, location }: UserContext, allowedValues: string[]): void;
export declare function readFileAsStringSync(filePath: string): string;
export declare function yamlAndJsonSyncReader<T>(filePath: string): T;
export declare function isPathParameter(pathSegment: string): boolean;
/**
 * Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
 */
export declare function slash(path: string): string;
export declare function isString(value: unknown): value is string;
export declare function isNotString<T>(value: string | T): value is T;
export declare const assignConfig: <T extends string | {
    severity?: string;
}>(target: Record<string, T>, obj?: Record<string, T>) => void;
export declare function assignOnlyExistingConfig<T extends string | {
    severity?: string;
}>(target: Record<string, T>, obj?: Record<string, T>): void;
export declare function getMatchingStatusCodeRange(code: number | string): string;
export declare function isCustomRuleId(id: string): boolean;
export declare function doesYamlFileExist(filePath: string): boolean;
export declare function showWarningForDeprecatedField(deprecatedField: string, updatedField?: string, updatedObject?: string, link?: string): void;
export declare function showErrorForDeprecatedField(deprecatedField: string, updatedField?: string, updatedObject?: string): void;
export type Falsy = undefined | null | false | '' | 0;
export declare function isTruthy<Truthy>(value: Truthy | Falsy): value is Truthy;
export declare function identity<T>(value: T): T;
export declare function keysOf<T>(obj: T): (keyof T)[];
export declare function pickDefined<T extends Record<string, unknown>>(obj?: T): Record<string, unknown> | undefined;
export declare function nextTick(): Promise<unknown>;
export declare function pause(ms: number): Promise<void>;
export declare function getProxyAgent(): HttpsProxyAgent<string> | undefined;
/**
 * Checks if two objects are deeply equal.
 * Borrowed the source code from https://github.com/lukeed/dequal.
 */
export declare function dequal(foo: any, bar: any): boolean;
export type CollectFn = (value: unknown) => void;
export type StrictObject<T extends object> = T & {
    [key: string]: undefined;
};
