import { WeekdayStr } from './weekday';
export declare const isPresent: <T>(value?: T) => value is T;
export declare const isNumber: (value: unknown) => value is number;
export declare const isWeekdayStr: (value: unknown) => value is WeekdayStr;
export declare const isArray: (arg: any) => arg is any[];
/**
 * Simplified version of python's range()
 */
export declare const range: (start: number, end?: number) => number[];
export declare const clone: <T>(array: T[]) => T[];
export declare const repeat: <T>(value: T | T[], times: number) => (T | T[])[];
export declare const toArray: <T>(item: T | T[]) => T[];
export declare function padStart(item: string | number, targetLength: number, padString?: string): string;
/**
 * Python like split
 */
export declare const split: (str: string, sep: string, num: number) => string[];
/**
 * closure/goog/math/math.js:modulo
 * Copyright 2006 The Closure Library Authors.
 * The % operator in JavaScript returns the remainder of a / b, but differs from
 * some other languages in that the result will have the same sign as the
 * dividend. For example, -1 % 8 == -1, whereas in some other languages
 * (such as Python) the result would be 7. This function emulates the more
 * correct modulo behavior, which is useful for certain applications such as
 * calculating an offset index in a circular list.
 *
 * @param {number} a The dividend.
 * @param {number} b The divisor.
 * @return {number} a % b where the result is between 0 and b (either 0 <= x < b
 * or b < x <= 0, depending on the sign of b).
 */
export declare const pymod: (a: number, b: number) => number;
/**
 * @see: <http://docs.python.org/library/functions.html#divmod>
 */
export declare const divmod: (a: number, b: number) => {
    div: number;
    mod: number;
};
export declare const empty: <T>(obj: T[]) => boolean;
/**
 * Python-like boolean
 *
 * @return {Boolean} value of an object/primitive, taking into account
 * the fact that in Python an empty list's/tuple's
 * boolean value is False, whereas in JS it's true
 */
export declare const notEmpty: <T>(obj: T[]) => obj is T[];
/**
 * Return true if a value is in an array
 */
export declare const includes: <T>(arr: T[], val: T) => boolean;
//# sourceMappingURL=helpers.d.ts.map