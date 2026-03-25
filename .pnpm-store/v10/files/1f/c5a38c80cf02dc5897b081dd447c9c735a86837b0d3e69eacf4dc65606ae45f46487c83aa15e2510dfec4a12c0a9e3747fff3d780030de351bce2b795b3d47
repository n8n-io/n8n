import { ResponseValidationError } from "../models/errors/responsevalidationerror.js";
import { SDKError } from "../models/errors/sdkerror.js";
import { Result } from "../types/fp.js";
import { StatusCodePredicate } from "./http.js";
export type Encoding = "jsonl" | "json" | "text" | "bytes" | "stream" | "sse" | "nil" | "fail";
type Schema<T> = {
    parse(raw: unknown): T;
};
type MatchOptions = {
    ctype?: string;
    hdrs?: boolean;
    key?: string;
    sseSentinel?: string;
};
export type ValueMatcher<V> = MatchOptions & {
    enc: Encoding;
    codes: StatusCodePredicate;
    schema: Schema<V>;
};
export type ErrorMatcher<E> = MatchOptions & {
    enc: Encoding;
    codes: StatusCodePredicate;
    schema: Schema<E>;
    err: true;
};
export type FailMatcher = {
    enc: "fail";
    codes: StatusCodePredicate;
};
export type Matcher<T, E> = ValueMatcher<T> | ErrorMatcher<E> | FailMatcher;
export declare function jsonErr<E>(codes: StatusCodePredicate, schema: Schema<E>, options?: MatchOptions): ErrorMatcher<E>;
export declare function json<T>(codes: StatusCodePredicate, schema: Schema<T>, options?: MatchOptions): ValueMatcher<T>;
export declare function jsonl<T>(codes: StatusCodePredicate, schema: Schema<T>, options?: MatchOptions): ValueMatcher<T>;
export declare function jsonlErr<E>(codes: StatusCodePredicate, schema: Schema<E>, options?: MatchOptions): ErrorMatcher<E>;
export declare function textErr<E>(codes: StatusCodePredicate, schema: Schema<E>, options?: MatchOptions): ErrorMatcher<E>;
export declare function text<T>(codes: StatusCodePredicate, schema: Schema<T>, options?: MatchOptions): ValueMatcher<T>;
export declare function bytesErr<E>(codes: StatusCodePredicate, schema: Schema<E>, options?: MatchOptions): ErrorMatcher<E>;
export declare function bytes<T>(codes: StatusCodePredicate, schema: Schema<T>, options?: MatchOptions): ValueMatcher<T>;
export declare function streamErr<E>(codes: StatusCodePredicate, schema: Schema<E>, options?: MatchOptions): ErrorMatcher<E>;
export declare function stream<T>(codes: StatusCodePredicate, schema: Schema<T>, options?: MatchOptions): ValueMatcher<T>;
export declare function sseErr<E>(codes: StatusCodePredicate, schema: Schema<E>, options?: MatchOptions): ErrorMatcher<E>;
export declare function sse<T>(codes: StatusCodePredicate, schema: Schema<T>, options?: MatchOptions): ValueMatcher<T>;
export declare function nilErr<E>(codes: StatusCodePredicate, schema: Schema<E>, options?: MatchOptions): ErrorMatcher<E>;
export declare function nil<T>(codes: StatusCodePredicate, schema: Schema<T>, options?: MatchOptions): ValueMatcher<T>;
export declare function fail(codes: StatusCodePredicate): FailMatcher;
export type MatchedValue<Matchers> = Matchers extends Matcher<infer T, any>[] ? T : never;
export type MatchedError<Matchers> = Matchers extends Matcher<any, infer E>[] ? E : never;
export type MatchFunc<T, E> = (response: Response, request: Request, options?: {
    resultKey?: string;
    extraFields?: Record<string, unknown>;
}) => Promise<[result: Result<T, E>, raw: unknown]>;
export declare function match<T, E>(...matchers: Array<Matcher<T, E>>): MatchFunc<T, E | SDKError | ResponseValidationError>;
/**
 * Iterates over a Headers object and returns an object with all the header
 * entries. Values are represented as an array to account for repeated headers.
 */
export declare function unpackHeaders(headers: Headers): Record<string, string[]>;
export {};
//# sourceMappingURL=matchers.d.ts.map