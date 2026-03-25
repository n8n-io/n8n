/**
 * @module
 * @private
 * @internal
 */
import { SelectionType } from '../types/FindSelected.cjs';
import { Matcher, MatcherType } from '../types/Pattern.cjs';
export declare const isObject: (value: unknown) => value is Object;
export declare const isMatcher: (x: unknown) => x is Matcher<unknown, unknown, MatcherType, SelectionType>;
export declare const matchPattern: (pattern: any, value: any, select: (key: string, value: unknown) => void) => boolean;
export declare const getSelectionKeys: (pattern: any) => string[];
export declare const flatMap: <a, b>(xs: readonly a[], f: (v: a) => readonly b[]) => b[];
