/**
 * The global declarations that workflow code sees. They hold only the
 * library of the subset (spec sections 4.3 and 4.4), so the checker and the
 * editor show only allowed API. The validator still rejects other globals
 * with a WL code before the checker runs.
 */
export const LIB_DTS = `
interface SymbolConstructor { readonly iterator: unique symbol; }
declare var Symbol: SymbolConstructor;
interface Symbol {}
interface IteratorResult<T> { done?: boolean; value: T; }
interface Iterator<T> { next(): IteratorResult<T>; }
interface Iterable<T> { [Symbol.iterator](): Iterator<T>; }
interface IterableIterator<T> extends Iterator<T> { [Symbol.iterator](): IterableIterator<T>; }

interface Object {}
interface Function {}
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface IArguments { length: number; }
interface RegExp {}
interface RegExpConstructor {
  /** Spec section 4.6: UTF-16 positions of the match and its groups (-1 when unset), or null. */
  exec(source: string, flags: string, input: string, lastIndex: number): number[] | null;
}
declare var RegExp: RegExpConstructor;
interface Boolean {}
interface TemplateStringsArray extends ReadonlyArray<string> { readonly raw: readonly string[]; }

interface String {
  readonly length: number;
  readonly [index: number]: string;
  toUpperCase(): string;
  toLowerCase(): string;
  normalize(form?: string): string;
  localeCompare(that: string): number;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  startsWith(search: string, position?: number): boolean;
  endsWith(search: string, endPosition?: number): boolean;
  includes(search: string, position?: number): boolean;
  indexOf(search: string, position?: number): number;
  slice(start?: number, end?: number): string;
  substring(start: number, end?: number): string;
  split(separator: string, limit?: number): string[];
  replace(pattern: string, replacement: string): string;
  replaceAll(pattern: string, replacement: string): string;
  padStart(length: number, fill?: string): string;
  padEnd(length: number, fill?: string): string;
  repeat(count: number): string;
  charAt(index: number): string;
  charCodeAt(index: number): number;
  concat(...parts: string[]): string;
  at(index: number): string | undefined;
  [Symbol.iterator](): IterableIterator<string>;
}

interface Number {
  toFixed(digits?: number): string;
  toString(radix?: number): string;
}

interface ReadonlyArray<T> {
  readonly length: number;
  readonly [n: number]: T;
  slice(start?: number, end?: number): T[];
  concat(...items: (T | ReadonlyArray<T>)[]): T[];
  join(separator?: string): string;
  includes(search: T, fromIndex?: number): boolean;
  indexOf(search: T, fromIndex?: number): number;
  at(index: number): T | undefined;
  map<U>(f: (value: T, index: number, array: readonly T[]) => U): U[];
  filter(f: (value: T, index: number, array: readonly T[]) => unknown): T[];
  forEach(f: (value: T, index: number, array: readonly T[]) => void): void;
  some(f: (value: T, index: number, array: readonly T[]) => unknown): boolean;
  every(f: (value: T, index: number, array: readonly T[]) => unknown): boolean;
  find(f: (value: T, index: number, array: readonly T[]) => unknown): T | undefined;
  findIndex(f: (value: T, index: number, array: readonly T[]) => unknown): number;
  reduce<U>(f: (acc: U, value: T, index: number, array: readonly T[]) => U, initial: U): U;
  reduce(f: (acc: T, value: T, index: number, array: readonly T[]) => T): T;
  [Symbol.iterator](): IterableIterator<T>;
}

interface Array<T> {
  length: number;
  [n: number]: T;
  push(...items: T[]): number;
  pop(): T | undefined;
  shift(): T | undefined;
  unshift(...items: T[]): number;
  slice(start?: number, end?: number): T[];
  concat(...items: (T | ReadonlyArray<T>)[]): T[];
  join(separator?: string): string;
  includes(search: T, fromIndex?: number): boolean;
  indexOf(search: T, fromIndex?: number): number;
  reverse(): T[];
  sort(compare?: (a: T, b: T) => number): this;
  at(index: number): T | undefined;
  flat<U>(this: U[][], depth?: 1): U[];
  map<U>(f: (value: T, index: number, array: T[]) => U): U[];
  filter<S extends T>(f: (value: T, index: number, array: T[]) => value is S): S[];
  filter(f: (value: T, index: number, array: T[]) => unknown): T[];
  forEach(f: (value: T, index: number, array: T[]) => void): void;
  some(f: (value: T, index: number, array: T[]) => unknown): boolean;
  every(f: (value: T, index: number, array: T[]) => unknown): boolean;
  find<S extends T>(f: (value: T, index: number, array: T[]) => value is S): S | undefined;
  find(f: (value: T, index: number, array: T[]) => unknown): T | undefined;
  findIndex(f: (value: T, index: number, array: T[]) => unknown): number;
  flatMap<U>(f: (value: T, index: number, array: T[]) => U | ReadonlyArray<U>): U[];
  reduce<U>(f: (acc: U, value: T, index: number, array: T[]) => U, initial: U): U;
  reduce(f: (acc: T, value: T, index: number, array: T[]) => T): T;
  [Symbol.iterator](): IterableIterator<T>;
}
interface ArrayConstructor { isArray(value: unknown): value is unknown[]; }
declare var Array: ArrayConstructor;

interface PromiseLike<T> {
  then<R1 = T, R2 = never>(ok?: ((value: T) => R1 | PromiseLike<R1>) | null, fail?: ((reason: any) => R2 | PromiseLike<R2>) | null): PromiseLike<R1 | R2>;
}
interface Promise<T> {
  then<R1 = T, R2 = never>(ok?: ((value: T) => R1 | PromiseLike<R1>) | null, fail?: ((reason: any) => R2 | PromiseLike<R2>) | null): Promise<R1 | R2>;
}
type Awaited<T> = T extends null | undefined ? T : T extends object & { then(ok: infer F, ...args: infer _): any } ? F extends (value: infer V, ...args: infer _) => any ? Awaited<V> : never : T;
interface PromiseConstructor {
  all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
}
declare var Promise: PromiseConstructor;

interface Error { name: string; message: string; }
interface ErrorConstructor { new (message?: string): Error; (message?: string): Error; }
declare var Error: ErrorConstructor;
declare var TypeError: ErrorConstructor;
declare var RangeError: ErrorConstructor;

interface Math {
  readonly PI: number;
  readonly E: number;
  floor(x: number): number;
  ceil(x: number): number;
  round(x: number): number;
  trunc(x: number): number;
  abs(x: number): number;
  min(...values: number[]): number;
  max(...values: number[]): number;
  pow(x: number, y: number): number;
  sqrt(x: number): number;
  sign(x: number): number;
  log(x: number): number;
  exp(x: number): number;
}
declare var Math: Math;

interface JSON {
  parse(text: string): any;
  stringify(value: unknown, replacer?: null, indent?: number | string): string;
}
declare var JSON: JSON;

interface ObjectConstructor {
  keys(o: object): string[];
  values<T>(o: Record<string, T>): T[];
  values(o: object): unknown[];
  entries<T>(o: Record<string, T>): [string, T][];
  entries(o: object): [string, unknown][];
  assign<T extends object, U>(target: T, source: U): T & U;
  assign<T extends object, U, V>(target: T, s1: U, s2: V): T & U & V;
  assign<T extends object, U, V, W>(target: T, s1: U, s2: V, s3: W): T & U & V & W;
}
declare var Object: ObjectConstructor;

interface NumberConstructor {
  (value?: unknown): number;
  isInteger(value: unknown): boolean;
  isFinite(value: unknown): boolean;
  readonly MAX_SAFE_INTEGER: number;
  readonly MIN_SAFE_INTEGER: number;
  readonly EPSILON: number;
}
declare var Number: NumberConstructor;
interface StringConstructor { (value?: unknown): string; }
declare var String: StringConstructor;
interface BooleanConstructor { (value?: unknown): boolean; }
declare var Boolean: BooleanConstructor;

interface Date {
  getTime(): number;
  valueOf(): number;
  toISOString(): string;
  toJSON(): string;
  toString(): string;
  toUTCString(): string;
  toGMTString(): string;
  toDateString(): string;
  toTimeString(): string;
  toLocaleString(locales?: string, options?: object): string;
  toLocaleDateString(locales?: string, options?: object): string;
  toLocaleTimeString(locales?: string, options?: object): string;
  getFullYear(): number;
  getMonth(): number;
  getDate(): number;
  getDay(): number;
  getHours(): number;
  getMinutes(): number;
  getSeconds(): number;
  getMilliseconds(): number;
  getUTCFullYear(): number;
  getUTCMonth(): number;
  getUTCDate(): number;
  getUTCDay(): number;
  getUTCHours(): number;
  getUTCMinutes(): number;
  getUTCSeconds(): number;
  getUTCMilliseconds(): number;
  getTimezoneOffset(): number;
  setTime(time: number): number;
  setMilliseconds(ms: number): number;
  setUTCMilliseconds(ms: number): number;
  setSeconds(sec: number, ms?: number): number;
  setUTCSeconds(sec: number, ms?: number): number;
  setMinutes(min: number, sec?: number, ms?: number): number;
  setUTCMinutes(min: number, sec?: number, ms?: number): number;
  setHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setUTCHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setDate(date: number): number;
  setUTCDate(date: number): number;
  setMonth(month: number, date?: number): number;
  setUTCMonth(month: number, date?: number): number;
  setFullYear(year: number, month?: number, date?: number): number;
  setUTCFullYear(year: number, month?: number, date?: number): number;
}
interface DateConstructor {
  new (): Date;
  new (value: number | string | Date): Date;
  new (year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
  now(): number;
  UTC(year: number, monthIndex?: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
  parse(text: string): number;
  /** Spec section 4.5: minutes from UTC of an IANA time zone of META \`zones\` at time value \`t\`. */
  zoneOffset(zone: string, t: number): number;
}
declare var Date: DateConstructor;

declare function parseInt(text: string, radix?: number): number;
declare function parseFloat(text: string): number;
declare function isNaN(value: number): boolean;
/** Text codecs, as in JavaScript. UTF-8 base64: btoa(unescape(encodeURIComponent(s))). */
declare function btoa(data: string): string;
declare function atob(data: string): string;
declare function encodeURI(text: string | number | boolean): string;
declare function encodeURIComponent(text: string | number | boolean): string;
declare function decodeURIComponent(text: string): string;
declare function escape(text: string): string;
declare function unescape(text: string): string;
/** XML for library nodes (spec section 4.3). */
interface XMLNamespace {
  /** xml2js 0.5 with its default options (as rss-parser and n8n's XML node use it): an object, or null for no root element. Throws an Error with the sax message. */
  parse(text: string): unknown;
  /** rss-parser getSnippet: tags stripped, HTML entities decoded, trimmed. */
  snippet(html: string): string;
  /** rss-parser getContent: the \`_\` text of an element, or the element as XML under \`<div>\`. */
  content(element: unknown): unknown;
}
declare var XML: XMLNamespace;
/** ASCII checks for library nodes (spec section 4.3). */
interface AsciiNamespace {
  /** True when every character is in U+0000 to U+007F. */
  is(text: string): boolean;
  /** True when every character is in U+0020 to U+007E (printable ASCII, no tab). */
  isPrintable(text: string): boolean;
}
declare var Ascii: AsciiNamespace;
/** Base64 for library nodes (spec section 4.3). */
interface Base64Namespace {
  /** The base64 of the UTF-8 bytes of the text: btoa(unescape(encodeURIComponent(text))), with its URIError. */
  encodeUtf8(text: string): string;
}
declare var Base64: Base64Namespace;
declare var NaN: number;
declare var Infinity: number;

type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type NonNullable<T> = T & {};
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
`;
