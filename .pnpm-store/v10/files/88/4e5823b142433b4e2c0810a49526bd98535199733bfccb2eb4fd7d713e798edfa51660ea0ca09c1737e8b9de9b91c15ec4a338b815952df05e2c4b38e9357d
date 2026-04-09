export as namespace stylis;

export interface Element {
    parent: Element | null;
    children: Element[] | string;
    root: Element | null;
    type: string;
    props: string[] | string;
    value: string;
    length: number;
    return: string;
    line: number;
    column: number;
}

export type ArrayMapCallback = (value: string, index: number, array: string[]) => string;
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type Middleware = (element: Element, index: number, children: Element[], callback: Middleware) => string | void;

// Enum.js

export const MS = "-ms-";
export const MOZ = "-moz-";
export const WEBKIT = "-webkit-";
export const COMMENT = "comm";
export const RULESET = "rule";
export const DECLARATION = "decl";
export const PAGE = "@page";
export const MEDIA = "@media";
export const IMPORT = "@import";
export const CHARSET = "@charset";
export const VIEWPORT = "@viewport";
export const SUPPORTS = "@supports";
export const DOCUMENT = "@document";
export const NAMESPACE = "@namespace";
export const KEYFRAMES = "@keyframes";
export const FONT_FACE = "@font-face";
export const COUNTER_STYLE = "@counter-style";
export const FONT_FEATURE_VALUES = "@font-feature-values";
export const LAYER = "@layer";
export const SCOPE = "@scope";

// Utility.js

export function hash(value: string, length: number): number;
export function trim(value: string): string;
export function match(value: string, pattern: RegExp): string | null;
export function replace(value: string, pattern: string | RegExp, replacement: string): string;
export function indexof(value: string, search: unknown): number;
export function charat(value: string, index: number): number;
export function substr(value: string, begin: number, end: number): string;
export function strlen(value: string): number;
export function sizeof(value: unknown[]): number;
export function append<T>(value: T, array: T[]): T;
export function combine(array: string[], callback: ArrayMapCallback): string;
export function abs(x: number): number;
export function from(...codes: number[]): string;

// Parser.js

export function compile(value: string): Element[];

export function parse(
    value: string,
    root: Element,
    parent: Element | null,
    rule: Element | string[],
    rules: string[],
    rulesets: Element[],
    pseudo: number,
    points: number[],
    declarations: string[],
): Element[];

export function ruleset(
    value: string,
    root: Element,
    parent: Element | null,
    index: number,
    offset: number,
    rules: string[],
    points: number[],
    type: string,
    props: string[],
    children: Element[],
    length: number,
): Element;

export function comment(value: string, root: Element, parent: Element | null): Element;
export function declaration(value: string, root: Element, parent: Element | null, length: number): Element;

// Prefixer.js

export function prefix(value: string, length: number): string;

// Tokenizer.js

export let line: number;
export let column: number;
export let length: number;
export let position: number;
export let character: number;
export let characters: string;

export function node(
    value: string,
    root: Element,
    parent: Element | null,
    type: string,
    props: string[],
    children: Element[],
    length: number,
): Element;

export function copy(root: Element, props: Partial<Element>): Element;
export function char(): number;
export function next(): number;
export function peek(): number;
export function caret(): number;
export function slice(begin: number, end: number): string;
export function token(type: number): number;
export function alloc(value: string): unknown[];
export function dealloc<T>(value: T[]): T[];
export function delimit(type: number): string;
export function tokenize(value: string): string[];
export function whitespace(type: number): string;
export function tokenizer(children: string[]): string[];
export function delimiter(type: number): number;
export function commenter(type: number, index: number): string;
export function identifier(index: number): string;

// Serializer.js

export function serialize(children: Element[], callback: Middleware): string;

// @type {Middleware}
export function stringify(element: Element, index: number, children: Element[], callback: Middleware): string;

// Middleware.js

export function middleware(collection: Middleware[]): Middleware;
export function rulesheet(callback: (ret: string) => void): Middleware;

// @type {Middleware}
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export function prefixer(element: Element, index: number, children: Element[], callback: Middleware): string | void;
// @type {Middleware}
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export function namespace(element: Element): string | void;
