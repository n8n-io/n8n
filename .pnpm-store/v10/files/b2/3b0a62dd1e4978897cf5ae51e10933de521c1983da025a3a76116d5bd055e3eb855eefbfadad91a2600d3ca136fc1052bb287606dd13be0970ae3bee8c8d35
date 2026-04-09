/// <reference types="node" />
import * as net from 'net';
import * as tls from 'tls';
import * as http from 'http';
import { OutgoingHttpHeaders, RequestOptions } from 'http';

type Protocol<T> = T extends `${infer Protocol}:${infer _}` ? Protocol : never;
type ConnectOptsMap = {
    http: Omit<net.TcpNetConnectOpts, 'host' | 'port'>;
    https: Omit<tls.ConnectionOptions, 'host' | 'port'>;
};
type ConnectOpts<T> = {
    [P in keyof ConnectOptsMap]: Protocol<T> extends P ? ConnectOptsMap[P] : never;
}[keyof ConnectOptsMap];
type HttpsProxyAgentOptions<T> = ConnectOpts<T> & http.AgentOptions & {
    headers?: OutgoingHttpHeaders | (() => OutgoingHttpHeaders);
};

declare const FormData: {
  new (): FormData;
  prototype: FormData;
};

/** @type {typeof globalThis.Blob} */
declare const Blob: typeof globalThis.Blob;

type AbortSignal$1 = {
	readonly aborted: boolean;

	addEventListener: (type: 'abort', listener: (this: AbortSignal$1) => void) => void;
	removeEventListener: (type: 'abort', listener: (this: AbortSignal$1) => void) => void;
};

type HeadersInit = Headers | Record<string, string> | Iterable<readonly [string, string]> | Iterable<Iterable<string>>;


/**
 * This Fetch API interface allows you to perform various actions on HTTP request and response headers.
 * These actions include retrieving, setting, adding to, and removing.
 * A Headers object has an associated header list, which is initially empty and consists of zero or more name and value pairs.
 * You can add to this using methods like append() (see Examples.)
 * In all methods of this interface, header names are matched by case-insensitive byte sequence.
 * */
declare class Headers {
	constructor(init?: HeadersInit);

	append(name: string, value: string): void;
	delete(name: string): void;
	get(name: string): string | null;
	has(name: string): boolean;
	set(name: string, value: string): void;
	forEach(
		callbackfn: (value: string, key: string, parent: Headers) => void,
		thisArg?: any
	): void;

	[Symbol.iterator](): IterableIterator<[string, string]>;
	/**
	 * Returns an iterator allowing to go through all key/value pairs contained in this object.
	 */
	entries(): IterableIterator<[string, string]>;
	/**
	 * Returns an iterator allowing to go through all keys of the key/value pairs contained in this object.
	 */
	keys(): IterableIterator<string>;
	/**
	 * Returns an iterator allowing to go through all values of the key/value pairs contained in this object.
	 */
	values(): IterableIterator<string>;

	/** Node-fetch extension */
	raw(): Record<string, string[]>;
}

interface RequestInit {
	/**
	 * A BodyInit object or null to set request's body.
	 */
	body?: BodyInit | null;
	/**
	 * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
	 */
	headers?: HeadersInit;
	/**
	 * A string to set request's method.
	 */
	method?: string;
	/**
	 * A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
	 */
	redirect?: RequestRedirect;
	/**
	 * An AbortSignal to set request's signal.
	 */
	signal?: AbortSignal$1 | null;
	/**
	 * A string whose value is a same-origin URL, "about:client", or the empty string, to set request’s referrer.
	 */
	referrer?: string;
	/**
	 * A referrer policy to set request’s referrerPolicy.
	 */
	referrerPolicy?: ReferrerPolicy;

	// Node-fetch extensions to the whatwg/fetch spec
	agent?: RequestOptions['agent'] | ((parsedUrl: URL) => RequestOptions['agent']);
	compress?: boolean;
	counter?: number;
	follow?: number;
	hostname?: string;
	port?: number;
	protocol?: string;
	size?: number;
	highWaterMark?: number;
	insecureHTTPParser?: boolean;
}

interface ResponseInit {
	headers?: HeadersInit;
	status?: number;
	statusText?: string;
}

type BodyInit =
	| Blob
	| Buffer
	| URLSearchParams
	| FormData
	| NodeJS.ReadableStream
	| string;
declare class BodyMixin {
	constructor(body?: BodyInit, options?: {size?: number});

	readonly body: NodeJS.ReadableStream | null;
	readonly bodyUsed: boolean;
	readonly size: number;

	/** @deprecated Use `body.arrayBuffer()` instead. */
	buffer(): Promise<Buffer>;
	arrayBuffer(): Promise<ArrayBuffer>;
	formData(): Promise<FormData>;
	blob(): Promise<Blob>;
	json(): Promise<unknown>;
	text(): Promise<string>;
}

type RequestRedirect = 'error' | 'follow' | 'manual';
type ReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'same-origin' | 'origin' | 'strict-origin' | 'origin-when-cross-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';

type ResponseType = 'basic' | 'cors' | 'default' | 'error' | 'opaque' | 'opaqueredirect';

declare class Response extends BodyMixin {
	constructor(body?: BodyInit | null, init?: ResponseInit);

	readonly headers: Headers;
	readonly ok: boolean;
	readonly redirected: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly type: ResponseType;
	readonly url: string;
	clone(): Response;

	static error(): Response;
	static redirect(url: string, status?: number): Response;
}

interface HTTPClientOptions {
    headers?: Record<string, string>;
    retries?: number;
}
interface HTTPClientFetchOptions {
    noLogErrorBody?: boolean;
    proxy?: HttpsProxyAgentOptions<any>;
    retries?: number;
}
/**
 * A basic wrapper class for fetch with the ability to retry fetches
 */
declare class HTTPClient {
    env: Context['env'];
    log: Context['log'];
    headers: Record<string, string>;
    retries: number;
    constructor({ env, log }: Pick<Context, 'env' | 'log'>, { headers, retries }?: HTTPClientOptions);
    fetch(url: string, options?: RequestInit, options_?: HTTPClientFetchOptions): Promise<Response>;
    fetchBuffer(url: any, options: any): Promise<Buffer>;
}

/**
 * Interact with a GraphQL server using fetch and retries.
 */
declare class GraphQLClient {
    endpoint: string;
    headers: Record<string, string>;
    client: HTTPClient;
    constructor(ctx: InitialContext, endpoint: string, httpClientOptions: HTTPClientOptions);
    setAuthorization(token: string): void;
    runQuery<T>(query: string, variables: Record<string, any>, { endpoint, headers, retries }?: {
        endpoint?: string | undefined;
        headers?: {} | undefined;
        retries?: number | undefined;
    }): Promise<T>;
}

declare type Primitive = string | number | symbol | bigint | boolean | null | undefined;

declare namespace util {
    type AssertEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
    export type isAny<T> = 0 extends 1 & T ? true : false;
    export const assertEqual: <A, B>(val: AssertEqual<A, B>) => AssertEqual<A, B>;
    export function assertIs<T>(_arg: T): void;
    export function assertNever(_x: never): never;
    export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
    export type OmitKeys<T, K extends string> = Pick<T, Exclude<keyof T, K>>;
    export type MakePartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
    export type Exactly<T, X> = T & Record<Exclude<keyof X, keyof T>, never>;
    export const arrayToEnum: <T extends string, U extends [T, ...T[]]>(items: U) => { [k in U[number]]: k; };
    export const getValidEnumValues: (obj: any) => any[];
    export const objectValues: (obj: any) => any[];
    export const objectKeys: ObjectConstructor["keys"];
    export const find: <T>(arr: T[], checker: (arg: T) => any) => T | undefined;
    export type identity<T> = objectUtil.identity<T>;
    export type flatten<T> = objectUtil.flatten<T>;
    export type noUndefined<T> = T extends undefined ? never : T;
    export const isInteger: NumberConstructor["isInteger"];
    export function joinValues<T extends any[]>(array: T, separator?: string): string;
    export const jsonStringifyReplacer: (_: string, value: any) => any;
    export {};
}
declare namespace objectUtil {
    export type MergeShapes<U, V> = {
        [k in Exclude<keyof U, keyof V>]: U[k];
    } & V;
    type optionalKeys<T extends object> = {
        [k in keyof T]: undefined extends T[k] ? k : never;
    }[keyof T];
    type requiredKeys<T extends object> = {
        [k in keyof T]: undefined extends T[k] ? never : k;
    }[keyof T];
    export type addQuestionMarks<T extends object, _O = any> = {
        [K in requiredKeys<T>]: T[K];
    } & {
        [K in optionalKeys<T>]?: T[K];
    } & {
        [k in keyof T]?: unknown;
    };
    export type identity<T> = T;
    export type flatten<T> = identity<{
        [k in keyof T]: T[k];
    }>;
    export type noNeverKeys<T> = {
        [k in keyof T]: [T[k]] extends [never] ? never : k;
    }[keyof T];
    export type noNever<T> = identity<{
        [k in noNeverKeys<T>]: k extends keyof T ? T[k] : never;
    }>;
    export const mergeShapes: <U, T>(first: U, second: T) => T & U;
    export type extendShape<A extends object, B extends object> = {
        [K in keyof A as K extends keyof B ? never : K]: A[K];
    } & {
        [K in keyof B]: B[K];
    };
    export {};
}
declare const ZodParsedType: {
    function: "function";
    number: "number";
    string: "string";
    nan: "nan";
    integer: "integer";
    float: "float";
    boolean: "boolean";
    date: "date";
    bigint: "bigint";
    symbol: "symbol";
    undefined: "undefined";
    null: "null";
    array: "array";
    object: "object";
    unknown: "unknown";
    promise: "promise";
    void: "void";
    never: "never";
    map: "map";
    set: "set";
};
declare type ZodParsedType = keyof typeof ZodParsedType;

declare type allKeys<T> = T extends any ? keyof T : never;
declare type typeToFlattenedError<T, U = string> = {
    formErrors: U[];
    fieldErrors: {
        [P in allKeys<T>]?: U[];
    };
};
declare const ZodIssueCode: {
    invalid_type: "invalid_type";
    invalid_literal: "invalid_literal";
    custom: "custom";
    invalid_union: "invalid_union";
    invalid_union_discriminator: "invalid_union_discriminator";
    invalid_enum_value: "invalid_enum_value";
    unrecognized_keys: "unrecognized_keys";
    invalid_arguments: "invalid_arguments";
    invalid_return_type: "invalid_return_type";
    invalid_date: "invalid_date";
    invalid_string: "invalid_string";
    too_small: "too_small";
    too_big: "too_big";
    invalid_intersection_types: "invalid_intersection_types";
    not_multiple_of: "not_multiple_of";
    not_finite: "not_finite";
};
declare type ZodIssueCode = keyof typeof ZodIssueCode;
declare type ZodIssueBase = {
    path: (string | number)[];
    message?: string;
};
interface ZodInvalidTypeIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_type;
    expected: ZodParsedType;
    received: ZodParsedType;
}
interface ZodInvalidLiteralIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_literal;
    expected: unknown;
    received: unknown;
}
interface ZodUnrecognizedKeysIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.unrecognized_keys;
    keys: string[];
}
interface ZodInvalidUnionIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_union;
    unionErrors: ZodError[];
}
interface ZodInvalidUnionDiscriminatorIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_union_discriminator;
    options: Primitive[];
}
interface ZodInvalidEnumValueIssue extends ZodIssueBase {
    received: string | number;
    code: typeof ZodIssueCode.invalid_enum_value;
    options: (string | number)[];
}
interface ZodInvalidArgumentsIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_arguments;
    argumentsError: ZodError;
}
interface ZodInvalidReturnTypeIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_return_type;
    returnTypeError: ZodError;
}
interface ZodInvalidDateIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_date;
}
declare type StringValidation = "email" | "url" | "emoji" | "uuid" | "nanoid" | "regex" | "cuid" | "cuid2" | "ulid" | "datetime" | "date" | "time" | "duration" | "ip" | "base64" | {
    includes: string;
    position?: number;
} | {
    startsWith: string;
} | {
    endsWith: string;
};
interface ZodInvalidStringIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_string;
    validation: StringValidation;
}
interface ZodTooSmallIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.too_small;
    minimum: number | bigint;
    inclusive: boolean;
    exact?: boolean;
    type: "array" | "string" | "number" | "set" | "date" | "bigint";
}
interface ZodTooBigIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.too_big;
    maximum: number | bigint;
    inclusive: boolean;
    exact?: boolean;
    type: "array" | "string" | "number" | "set" | "date" | "bigint";
}
interface ZodInvalidIntersectionTypesIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_intersection_types;
}
interface ZodNotMultipleOfIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.not_multiple_of;
    multipleOf: number | bigint;
}
interface ZodNotFiniteIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.not_finite;
}
interface ZodCustomIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.custom;
    params?: {
        [k: string]: any;
    };
}
declare type ZodIssueOptionalMessage = ZodInvalidTypeIssue | ZodInvalidLiteralIssue | ZodUnrecognizedKeysIssue | ZodInvalidUnionIssue | ZodInvalidUnionDiscriminatorIssue | ZodInvalidEnumValueIssue | ZodInvalidArgumentsIssue | ZodInvalidReturnTypeIssue | ZodInvalidDateIssue | ZodInvalidStringIssue | ZodTooSmallIssue | ZodTooBigIssue | ZodInvalidIntersectionTypesIssue | ZodNotMultipleOfIssue | ZodNotFiniteIssue | ZodCustomIssue;
declare type ZodIssue = ZodIssueOptionalMessage & {
    fatal?: boolean;
    message: string;
};
declare type recursiveZodFormattedError<T> = T extends [any, ...any[]] ? {
    [K in keyof T]?: ZodFormattedError<T[K]>;
} : T extends any[] ? {
    [k: number]: ZodFormattedError<T[number]>;
} : T extends object ? {
    [K in keyof T]?: ZodFormattedError<T[K]>;
} : unknown;
declare type ZodFormattedError<T, U = string> = {
    _errors: U[];
} & recursiveZodFormattedError<NonNullable<T>>;
declare class ZodError<T = any> extends Error {
    issues: ZodIssue[];
    get errors(): ZodIssue[];
    constructor(issues: ZodIssue[]);
    format(): ZodFormattedError<T>;
    format<U>(mapper: (issue: ZodIssue) => U): ZodFormattedError<T, U>;
    static create: (issues: ZodIssue[]) => ZodError<any>;
    static assert(value: unknown): asserts value is ZodError;
    toString(): string;
    get message(): string;
    get isEmpty(): boolean;
    addIssue: (sub: ZodIssue) => void;
    addIssues: (subs?: ZodIssue[]) => void;
    flatten(): typeToFlattenedError<T>;
    flatten<U>(mapper?: (issue: ZodIssue) => U): typeToFlattenedError<T, U>;
    get formErrors(): typeToFlattenedError<T, string>;
}
declare type stripPath<T extends object> = T extends any ? util.OmitKeys<T, "path"> : never;
declare type IssueData = stripPath<ZodIssueOptionalMessage> & {
    path?: (string | number)[];
    fatal?: boolean;
};
declare type ErrorMapCtx = {
    defaultError: string;
    data: any;
};
declare type ZodErrorMap = (issue: ZodIssueOptionalMessage, _ctx: ErrorMapCtx) => {
    message: string;
};

declare type ParseParams = {
    path: (string | number)[];
    errorMap: ZodErrorMap;
    async: boolean;
};
declare type ParsePathComponent = string | number;
declare type ParsePath = ParsePathComponent[];
interface ParseContext {
    readonly common: {
        readonly issues: ZodIssue[];
        readonly contextualErrorMap?: ZodErrorMap;
        readonly async: boolean;
    };
    readonly path: ParsePath;
    readonly schemaErrorMap?: ZodErrorMap;
    readonly parent: ParseContext | null;
    readonly data: any;
    readonly parsedType: ZodParsedType;
}
declare type ParseInput = {
    data: any;
    path: (string | number)[];
    parent: ParseContext;
};
declare class ParseStatus {
    value: "aborted" | "dirty" | "valid";
    dirty(): void;
    abort(): void;
    static mergeArray(status: ParseStatus, results: SyncParseReturnType<any>[]): SyncParseReturnType;
    static mergeObjectAsync(status: ParseStatus, pairs: {
        key: ParseReturnType<any>;
        value: ParseReturnType<any>;
    }[]): Promise<SyncParseReturnType<any>>;
    static mergeObjectSync(status: ParseStatus, pairs: {
        key: SyncParseReturnType<any>;
        value: SyncParseReturnType<any>;
        alwaysSet?: boolean;
    }[]): SyncParseReturnType;
}
declare type INVALID = {
    status: "aborted";
};
declare const INVALID: INVALID;
declare type DIRTY<T> = {
    status: "dirty";
    value: T;
};
declare const DIRTY: <T>(value: T) => DIRTY<T>;
declare type OK<T> = {
    status: "valid";
    value: T;
};
declare const OK: <T>(value: T) => OK<T>;
declare type SyncParseReturnType<T = any> = OK<T> | DIRTY<T> | INVALID;
declare type AsyncParseReturnType<T> = Promise<SyncParseReturnType<T>>;
declare type ParseReturnType<T> = SyncParseReturnType<T> | AsyncParseReturnType<T>;

declare namespace enumUtil {
    type UnionToIntersectionFn<T> = (T extends unknown ? (k: () => T) => void : never) extends (k: infer Intersection) => void ? Intersection : never;
    type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer Last ? Last : never;
    type UnionToTuple<T, Tuple extends unknown[] = []> = [T] extends [never] ? Tuple : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ...Tuple]>;
    type CastToStringTuple<T> = T extends [string, ...string[]] ? T : never;
    export type UnionToTupleString<T> = CastToStringTuple<UnionToTuple<T>>;
    export {};
}

declare namespace errorUtil {
    type ErrMessage = string | {
        message?: string;
    };
    const errToObj: (message?: ErrMessage | undefined) => {
        message?: string | undefined;
    };
    const toString: (message?: ErrMessage | undefined) => string | undefined;
}

declare namespace partialUtil {
    type DeepPartial<T extends ZodTypeAny> = T extends ZodObject<ZodRawShape> ? ZodObject<{
        [k in keyof T["shape"]]: ZodOptional<DeepPartial<T["shape"][k]>>;
    }, T["_def"]["unknownKeys"], T["_def"]["catchall"]> : T extends ZodArray<infer Type, infer Card> ? ZodArray<DeepPartial<Type>, Card> : T extends ZodOptional<infer Type> ? ZodOptional<DeepPartial<Type>> : T extends ZodNullable<infer Type> ? ZodNullable<DeepPartial<Type>> : T extends ZodTuple<infer Items> ? {
        [k in keyof Items]: Items[k] extends ZodTypeAny ? DeepPartial<Items[k]> : never;
    } extends infer PI ? PI extends ZodTupleItems ? ZodTuple<PI> : never : never : T;
}

interface RefinementCtx {
    addIssue: (arg: IssueData) => void;
    path: (string | number)[];
}
declare type ZodRawShape = {
    [k: string]: ZodTypeAny;
};
declare type ZodTypeAny = ZodType<any, any, any>;
declare type TypeOf<T extends ZodType<any, any, any>> = T["_output"];
declare type input<T extends ZodType<any, any, any>> = T["_input"];
declare type output<T extends ZodType<any, any, any>> = T["_output"];

declare type CustomErrorParams = Partial<util.Omit<ZodCustomIssue, "code">>;
interface ZodTypeDef {
    errorMap?: ZodErrorMap;
    description?: string;
}
declare type RawCreateParams = {
    errorMap?: ZodErrorMap;
    invalid_type_error?: string;
    required_error?: string;
    message?: string;
    description?: string;
} | undefined;
declare type SafeParseSuccess<Output> = {
    success: true;
    data: Output;
    error?: never;
};
declare type SafeParseError<Input> = {
    success: false;
    error: ZodError<Input>;
    data?: never;
};
declare type SafeParseReturnType<Input, Output> = SafeParseSuccess<Output> | SafeParseError<Input>;
declare abstract class ZodType<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
    readonly _type: Output;
    readonly _output: Output;
    readonly _input: Input;
    readonly _def: Def;
    get description(): string | undefined;
    abstract _parse(input: ParseInput): ParseReturnType<Output>;
    _getType(input: ParseInput): string;
    _getOrReturnCtx(input: ParseInput, ctx?: ParseContext | undefined): ParseContext;
    _processInputParams(input: ParseInput): {
        status: ParseStatus;
        ctx: ParseContext;
    };
    _parseSync(input: ParseInput): SyncParseReturnType<Output>;
    _parseAsync(input: ParseInput): AsyncParseReturnType<Output>;
    parse(data: unknown, params?: Partial<ParseParams>): Output;
    safeParse(data: unknown, params?: Partial<ParseParams>): SafeParseReturnType<Input, Output>;
    parseAsync(data: unknown, params?: Partial<ParseParams>): Promise<Output>;
    safeParseAsync(data: unknown, params?: Partial<ParseParams>): Promise<SafeParseReturnType<Input, Output>>;
    /** Alias of safeParseAsync */
    spa: (data: unknown, params?: Partial<ParseParams> | undefined) => Promise<SafeParseReturnType<Input, Output>>;
    refine<RefinedOutput extends Output>(check: (arg: Output) => arg is RefinedOutput, message?: string | CustomErrorParams | ((arg: Output) => CustomErrorParams)): ZodEffects<this, RefinedOutput, Input>;
    refine(check: (arg: Output) => unknown | Promise<unknown>, message?: string | CustomErrorParams | ((arg: Output) => CustomErrorParams)): ZodEffects<this, Output, Input>;
    refinement<RefinedOutput extends Output>(check: (arg: Output) => arg is RefinedOutput, refinementData: IssueData | ((arg: Output, ctx: RefinementCtx) => IssueData)): ZodEffects<this, RefinedOutput, Input>;
    refinement(check: (arg: Output) => boolean, refinementData: IssueData | ((arg: Output, ctx: RefinementCtx) => IssueData)): ZodEffects<this, Output, Input>;
    _refinement(refinement: RefinementEffect<Output>["refinement"]): ZodEffects<this, Output, Input>;
    superRefine<RefinedOutput extends Output>(refinement: (arg: Output, ctx: RefinementCtx) => arg is RefinedOutput): ZodEffects<this, RefinedOutput, Input>;
    superRefine(refinement: (arg: Output, ctx: RefinementCtx) => void): ZodEffects<this, Output, Input>;
    superRefine(refinement: (arg: Output, ctx: RefinementCtx) => Promise<void>): ZodEffects<this, Output, Input>;
    constructor(def: Def);
    optional(): ZodOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodOptional<ZodNullable<this>>;
    array(): ZodArray<this>;
    promise(): ZodPromise<this>;
    or<T extends ZodTypeAny>(option: T): ZodUnion<[this, T]>;
    and<T extends ZodTypeAny>(incoming: T): ZodIntersection<this, T>;
    transform<NewOut>(transform: (arg: Output, ctx: RefinementCtx) => NewOut | Promise<NewOut>): ZodEffects<this, NewOut>;
    default(def: util.noUndefined<Input>): ZodDefault<this>;
    default(def: () => util.noUndefined<Input>): ZodDefault<this>;
    brand<B extends string | number | symbol>(brand?: B): ZodBranded<this, B>;
    catch(def: Output): ZodCatch<this>;
    catch(def: (ctx: {
        error: ZodError;
        input: Input;
    }) => Output): ZodCatch<this>;
    describe(description: string): this;
    pipe<T extends ZodTypeAny>(target: T): ZodPipeline<this, T>;
    readonly(): ZodReadonly<this>;
    isOptional(): boolean;
    isNullable(): boolean;
}
declare type IpVersion = "v4" | "v6";
declare type ZodStringCheck = {
    kind: "min";
    value: number;
    message?: string;
} | {
    kind: "max";
    value: number;
    message?: string;
} | {
    kind: "length";
    value: number;
    message?: string;
} | {
    kind: "email";
    message?: string;
} | {
    kind: "url";
    message?: string;
} | {
    kind: "emoji";
    message?: string;
} | {
    kind: "uuid";
    message?: string;
} | {
    kind: "nanoid";
    message?: string;
} | {
    kind: "cuid";
    message?: string;
} | {
    kind: "includes";
    value: string;
    position?: number;
    message?: string;
} | {
    kind: "cuid2";
    message?: string;
} | {
    kind: "ulid";
    message?: string;
} | {
    kind: "startsWith";
    value: string;
    message?: string;
} | {
    kind: "endsWith";
    value: string;
    message?: string;
} | {
    kind: "regex";
    regex: RegExp;
    message?: string;
} | {
    kind: "trim";
    message?: string;
} | {
    kind: "toLowerCase";
    message?: string;
} | {
    kind: "toUpperCase";
    message?: string;
} | {
    kind: "datetime";
    offset: boolean;
    local: boolean;
    precision: number | null;
    message?: string;
} | {
    kind: "date";
    message?: string;
} | {
    kind: "time";
    precision: number | null;
    message?: string;
} | {
    kind: "duration";
    message?: string;
} | {
    kind: "ip";
    version?: IpVersion;
    message?: string;
} | {
    kind: "base64";
    message?: string;
};
interface ZodStringDef extends ZodTypeDef {
    checks: ZodStringCheck[];
    typeName: ZodFirstPartyTypeKind.ZodString;
    coerce: boolean;
}
declare class ZodString extends ZodType<string, ZodStringDef, string> {
    _parse(input: ParseInput): ParseReturnType<string>;
    protected _regex(regex: RegExp, validation: StringValidation, message?: errorUtil.ErrMessage): ZodEffects<this, string, string>;
    _addCheck(check: ZodStringCheck): ZodString;
    email(message?: errorUtil.ErrMessage): ZodString;
    url(message?: errorUtil.ErrMessage): ZodString;
    emoji(message?: errorUtil.ErrMessage): ZodString;
    uuid(message?: errorUtil.ErrMessage): ZodString;
    nanoid(message?: errorUtil.ErrMessage): ZodString;
    cuid(message?: errorUtil.ErrMessage): ZodString;
    cuid2(message?: errorUtil.ErrMessage): ZodString;
    ulid(message?: errorUtil.ErrMessage): ZodString;
    base64(message?: errorUtil.ErrMessage): ZodString;
    ip(options?: string | {
        version?: "v4" | "v6";
        message?: string;
    }): ZodString;
    datetime(options?: string | {
        message?: string | undefined;
        precision?: number | null;
        offset?: boolean;
        local?: boolean;
    }): ZodString;
    date(message?: string): ZodString;
    time(options?: string | {
        message?: string | undefined;
        precision?: number | null;
    }): ZodString;
    duration(message?: errorUtil.ErrMessage): ZodString;
    regex(regex: RegExp, message?: errorUtil.ErrMessage): ZodString;
    includes(value: string, options?: {
        message?: string;
        position?: number;
    }): ZodString;
    startsWith(value: string, message?: errorUtil.ErrMessage): ZodString;
    endsWith(value: string, message?: errorUtil.ErrMessage): ZodString;
    min(minLength: number, message?: errorUtil.ErrMessage): ZodString;
    max(maxLength: number, message?: errorUtil.ErrMessage): ZodString;
    length(len: number, message?: errorUtil.ErrMessage): ZodString;
    /**
     * @deprecated Use z.string().min(1) instead.
     * @see {@link ZodString.min}
     */
    nonempty(message?: errorUtil.ErrMessage): ZodString;
    trim(): ZodString;
    toLowerCase(): ZodString;
    toUpperCase(): ZodString;
    get isDatetime(): boolean;
    get isDate(): boolean;
    get isTime(): boolean;
    get isDuration(): boolean;
    get isEmail(): boolean;
    get isURL(): boolean;
    get isEmoji(): boolean;
    get isUUID(): boolean;
    get isNANOID(): boolean;
    get isCUID(): boolean;
    get isCUID2(): boolean;
    get isULID(): boolean;
    get isIP(): boolean;
    get isBase64(): boolean;
    get minLength(): number | null;
    get maxLength(): number | null;
    static create: (params?: ({
        errorMap?: ZodErrorMap | undefined;
        invalid_type_error?: string | undefined;
        required_error?: string | undefined;
        message?: string | undefined;
        description?: string | undefined;
    } & {
        coerce?: true | undefined;
    }) | undefined) => ZodString;
}
interface ZodBooleanDef extends ZodTypeDef {
    typeName: ZodFirstPartyTypeKind.ZodBoolean;
    coerce: boolean;
}
declare class ZodBoolean extends ZodType<boolean, ZodBooleanDef, boolean> {
    _parse(input: ParseInput): ParseReturnType<boolean>;
    static create: (params?: ({
        errorMap?: ZodErrorMap | undefined;
        invalid_type_error?: string | undefined;
        required_error?: string | undefined;
        message?: string | undefined;
        description?: string | undefined;
    } & {
        coerce?: boolean | undefined;
    }) | undefined) => ZodBoolean;
}
interface ZodArrayDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    type: T;
    typeName: ZodFirstPartyTypeKind.ZodArray;
    exactLength: {
        value: number;
        message?: string;
    } | null;
    minLength: {
        value: number;
        message?: string;
    } | null;
    maxLength: {
        value: number;
        message?: string;
    } | null;
}
declare type ArrayCardinality = "many" | "atleastone";
declare type arrayOutputType<T extends ZodTypeAny, Cardinality extends ArrayCardinality = "many"> = Cardinality extends "atleastone" ? [T["_output"], ...T["_output"][]] : T["_output"][];
declare class ZodArray<T extends ZodTypeAny, Cardinality extends ArrayCardinality = "many"> extends ZodType<arrayOutputType<T, Cardinality>, ZodArrayDef<T>, Cardinality extends "atleastone" ? [T["_input"], ...T["_input"][]] : T["_input"][]> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get element(): T;
    min(minLength: number, message?: errorUtil.ErrMessage): this;
    max(maxLength: number, message?: errorUtil.ErrMessage): this;
    length(len: number, message?: errorUtil.ErrMessage): this;
    nonempty(message?: errorUtil.ErrMessage): ZodArray<T, "atleastone">;
    static create: <T_1 extends ZodTypeAny>(schema: T_1, params?: RawCreateParams) => ZodArray<T_1, "many">;
}
declare type UnknownKeysParam = "passthrough" | "strict" | "strip";
interface ZodObjectDef<T extends ZodRawShape = ZodRawShape, UnknownKeys extends UnknownKeysParam = UnknownKeysParam, Catchall extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    typeName: ZodFirstPartyTypeKind.ZodObject;
    shape: () => T;
    catchall: Catchall;
    unknownKeys: UnknownKeys;
}
declare type objectOutputType<Shape extends ZodRawShape, Catchall extends ZodTypeAny, UnknownKeys extends UnknownKeysParam = UnknownKeysParam> = objectUtil.flatten<objectUtil.addQuestionMarks<baseObjectOutputType<Shape>>> & CatchallOutput<Catchall> & PassthroughType<UnknownKeys>;
declare type baseObjectOutputType<Shape extends ZodRawShape> = {
    [k in keyof Shape]: Shape[k]["_output"];
};
declare type objectInputType<Shape extends ZodRawShape, Catchall extends ZodTypeAny, UnknownKeys extends UnknownKeysParam = UnknownKeysParam> = objectUtil.flatten<baseObjectInputType<Shape>> & CatchallInput<Catchall> & PassthroughType<UnknownKeys>;
declare type baseObjectInputType<Shape extends ZodRawShape> = objectUtil.addQuestionMarks<{
    [k in keyof Shape]: Shape[k]["_input"];
}>;
declare type CatchallOutput<T extends ZodType> = ZodType extends T ? unknown : {
    [k: string]: T["_output"];
};
declare type CatchallInput<T extends ZodType> = ZodType extends T ? unknown : {
    [k: string]: T["_input"];
};
declare type PassthroughType<T extends UnknownKeysParam> = T extends "passthrough" ? {
    [k: string]: unknown;
} : unknown;
declare type deoptional<T extends ZodTypeAny> = T extends ZodOptional<infer U> ? deoptional<U> : T extends ZodNullable<infer U> ? ZodNullable<deoptional<U>> : T;
declare class ZodObject<T extends ZodRawShape, UnknownKeys extends UnknownKeysParam = UnknownKeysParam, Catchall extends ZodTypeAny = ZodTypeAny, Output = objectOutputType<T, Catchall, UnknownKeys>, Input = objectInputType<T, Catchall, UnknownKeys>> extends ZodType<Output, ZodObjectDef<T, UnknownKeys, Catchall>, Input> {
    private _cached;
    _getCached(): {
        shape: T;
        keys: string[];
    };
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get shape(): T;
    strict(message?: errorUtil.ErrMessage): ZodObject<T, "strict", Catchall>;
    strip(): ZodObject<T, "strip", Catchall>;
    passthrough(): ZodObject<T, "passthrough", Catchall>;
    /**
     * @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
     * If you want to pass through unknown properties, use `.passthrough()` instead.
     */
    nonstrict: () => ZodObject<T, "passthrough", Catchall>;
    extend<Augmentation extends ZodRawShape>(augmentation: Augmentation): ZodObject<objectUtil.extendShape<T, Augmentation>, UnknownKeys, Catchall>;
    /**
     * @deprecated Use `.extend` instead
     *  */
    augment: <Augmentation extends ZodRawShape>(augmentation: Augmentation) => ZodObject<objectUtil.extendShape<T, Augmentation>, UnknownKeys, Catchall, objectOutputType<objectUtil.extendShape<T, Augmentation>, Catchall, UnknownKeys>, objectInputType<objectUtil.extendShape<T, Augmentation>, Catchall, UnknownKeys>>;
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge<Incoming extends AnyZodObject, Augmentation extends Incoming["shape"]>(merging: Incoming): ZodObject<objectUtil.extendShape<T, Augmentation>, Incoming["_def"]["unknownKeys"], Incoming["_def"]["catchall"]>;
    setKey<Key extends string, Schema extends ZodTypeAny>(key: Key, schema: Schema): ZodObject<T & {
        [k in Key]: Schema;
    }, UnknownKeys, Catchall>;
    catchall<Index extends ZodTypeAny>(index: Index): ZodObject<T, UnknownKeys, Index>;
    pick<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<Pick<T, Extract<keyof T, keyof Mask>>, UnknownKeys, Catchall>;
    omit<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<Omit<T, keyof Mask>, UnknownKeys, Catchall>;
    /**
     * @deprecated
     */
    deepPartial(): partialUtil.DeepPartial<this>;
    partial(): ZodObject<{
        [k in keyof T]: ZodOptional<T[k]>;
    }, UnknownKeys, Catchall>;
    partial<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<objectUtil.noNever<{
        [k in keyof T]: k extends keyof Mask ? ZodOptional<T[k]> : T[k];
    }>, UnknownKeys, Catchall>;
    required(): ZodObject<{
        [k in keyof T]: deoptional<T[k]>;
    }, UnknownKeys, Catchall>;
    required<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<objectUtil.noNever<{
        [k in keyof T]: k extends keyof Mask ? deoptional<T[k]> : T[k];
    }>, UnknownKeys, Catchall>;
    keyof(): ZodEnum<enumUtil.UnionToTupleString<keyof T>>;
    static create: <T_1 extends ZodRawShape>(shape: T_1, params?: RawCreateParams) => ZodObject<T_1, "strip", ZodTypeAny, { [k in keyof objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>]: objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>[k]; }, { [k_1 in keyof baseObjectInputType<T_1>]: baseObjectInputType<T_1>[k_1]; }>;
    static strictCreate: <T_1 extends ZodRawShape>(shape: T_1, params?: RawCreateParams) => ZodObject<T_1, "strict", ZodTypeAny, { [k in keyof objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>]: objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>[k]; }, { [k_1 in keyof baseObjectInputType<T_1>]: baseObjectInputType<T_1>[k_1]; }>;
    static lazycreate: <T_1 extends ZodRawShape>(shape: () => T_1, params?: RawCreateParams) => ZodObject<T_1, "strip", ZodTypeAny, { [k in keyof objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>]: objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>[k]; }, { [k_1 in keyof baseObjectInputType<T_1>]: baseObjectInputType<T_1>[k_1]; }>;
}
declare type AnyZodObject = ZodObject<any, any, any>;
declare type ZodUnionOptions = Readonly<[ZodTypeAny, ...ZodTypeAny[]]>;
interface ZodUnionDef<T extends ZodUnionOptions = Readonly<[
    ZodTypeAny,
    ZodTypeAny,
    ...ZodTypeAny[]
]>> extends ZodTypeDef {
    options: T;
    typeName: ZodFirstPartyTypeKind.ZodUnion;
}
declare class ZodUnion<T extends ZodUnionOptions> extends ZodType<T[number]["_output"], ZodUnionDef<T>, T[number]["_input"]> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get options(): T;
    static create: <T_1 extends readonly [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]>(types: T_1, params?: RawCreateParams) => ZodUnion<T_1>;
}
interface ZodIntersectionDef<T extends ZodTypeAny = ZodTypeAny, U extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    left: T;
    right: U;
    typeName: ZodFirstPartyTypeKind.ZodIntersection;
}
declare class ZodIntersection<T extends ZodTypeAny, U extends ZodTypeAny> extends ZodType<T["_output"] & U["_output"], ZodIntersectionDef<T, U>, T["_input"] & U["_input"]> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <T_1 extends ZodTypeAny, U_1 extends ZodTypeAny>(left: T_1, right: U_1, params?: RawCreateParams) => ZodIntersection<T_1, U_1>;
}
declare type ZodTupleItems = [ZodTypeAny, ...ZodTypeAny[]];
declare type AssertArray<T> = T extends any[] ? T : never;
declare type OutputTypeOfTuple<T extends ZodTupleItems | []> = AssertArray<{
    [k in keyof T]: T[k] extends ZodType<any, any, any> ? T[k]["_output"] : never;
}>;
declare type OutputTypeOfTupleWithRest<T extends ZodTupleItems | [], Rest extends ZodTypeAny | null = null> = Rest extends ZodTypeAny ? [...OutputTypeOfTuple<T>, ...Rest["_output"][]] : OutputTypeOfTuple<T>;
declare type InputTypeOfTuple<T extends ZodTupleItems | []> = AssertArray<{
    [k in keyof T]: T[k] extends ZodType<any, any, any> ? T[k]["_input"] : never;
}>;
declare type InputTypeOfTupleWithRest<T extends ZodTupleItems | [], Rest extends ZodTypeAny | null = null> = Rest extends ZodTypeAny ? [...InputTypeOfTuple<T>, ...Rest["_input"][]] : InputTypeOfTuple<T>;
interface ZodTupleDef<T extends ZodTupleItems | [] = ZodTupleItems, Rest extends ZodTypeAny | null = null> extends ZodTypeDef {
    items: T;
    rest: Rest;
    typeName: ZodFirstPartyTypeKind.ZodTuple;
}
declare class ZodTuple<T extends [ZodTypeAny, ...ZodTypeAny[]] | [] = [ZodTypeAny, ...ZodTypeAny[]], Rest extends ZodTypeAny | null = null> extends ZodType<OutputTypeOfTupleWithRest<T, Rest>, ZodTupleDef<T, Rest>, InputTypeOfTupleWithRest<T, Rest>> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get items(): T;
    rest<Rest extends ZodTypeAny>(rest: Rest): ZodTuple<T, Rest>;
    static create: <T_1 extends [] | [ZodTypeAny, ...ZodTypeAny[]]>(schemas: T_1, params?: RawCreateParams) => ZodTuple<T_1, null>;
}
declare type EnumValues<T extends string = string> = readonly [T, ...T[]];
declare type Values<T extends EnumValues> = {
    [k in T[number]]: k;
};
interface ZodEnumDef<T extends EnumValues = EnumValues> extends ZodTypeDef {
    values: T;
    typeName: ZodFirstPartyTypeKind.ZodEnum;
}
declare type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
};
declare type FilterEnum<Values, ToExclude> = Values extends [] ? [] : Values extends [infer Head, ...infer Rest] ? Head extends ToExclude ? FilterEnum<Rest, ToExclude> : [Head, ...FilterEnum<Rest, ToExclude>] : never;
declare type typecast<A, T> = A extends T ? A : never;
declare function createZodEnum<U extends string, T extends Readonly<[U, ...U[]]>>(values: T, params?: RawCreateParams): ZodEnum<Writeable<T>>;
declare function createZodEnum<U extends string, T extends [U, ...U[]]>(values: T, params?: RawCreateParams): ZodEnum<T>;
declare class ZodEnum<T extends [string, ...string[]]> extends ZodType<T[number], ZodEnumDef<T>, T[number]> {
    #private;
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get options(): T;
    get enum(): Values<T>;
    get Values(): Values<T>;
    get Enum(): Values<T>;
    extract<ToExtract extends readonly [T[number], ...T[number][]]>(values: ToExtract, newDef?: RawCreateParams): ZodEnum<Writeable<ToExtract>>;
    exclude<ToExclude extends readonly [T[number], ...T[number][]]>(values: ToExclude, newDef?: RawCreateParams): ZodEnum<typecast<Writeable<FilterEnum<T, ToExclude[number]>>, [string, ...string[]]>>;
    static create: typeof createZodEnum;
}
interface ZodPromiseDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    type: T;
    typeName: ZodFirstPartyTypeKind.ZodPromise;
}
declare class ZodPromise<T extends ZodTypeAny> extends ZodType<Promise<T["_output"]>, ZodPromiseDef<T>, Promise<T["_input"]>> {
    unwrap(): T;
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <T_1 extends ZodTypeAny>(schema: T_1, params?: RawCreateParams) => ZodPromise<T_1>;
}
declare type RefinementEffect<T> = {
    type: "refinement";
    refinement: (arg: T, ctx: RefinementCtx) => any;
};
declare type TransformEffect<T> = {
    type: "transform";
    transform: (arg: T, ctx: RefinementCtx) => any;
};
declare type PreprocessEffect<T> = {
    type: "preprocess";
    transform: (arg: T, ctx: RefinementCtx) => any;
};
declare type Effect<T> = RefinementEffect<T> | TransformEffect<T> | PreprocessEffect<T>;
interface ZodEffectsDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    schema: T;
    typeName: ZodFirstPartyTypeKind.ZodEffects;
    effect: Effect<any>;
}
declare class ZodEffects<T extends ZodTypeAny, Output = output<T>, Input = input<T>> extends ZodType<Output, ZodEffectsDef<T>, Input> {
    innerType(): T;
    sourceType(): T;
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <I extends ZodTypeAny>(schema: I, effect: Effect<I["_output"]>, params?: RawCreateParams) => ZodEffects<I, I["_output"], input<I>>;
    static createWithPreprocess: <I extends ZodTypeAny>(preprocess: (arg: unknown, ctx: RefinementCtx) => unknown, schema: I, params?: RawCreateParams) => ZodEffects<I, I["_output"], unknown>;
}

interface ZodOptionalDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    typeName: ZodFirstPartyTypeKind.ZodOptional;
}
declare class ZodOptional<T extends ZodTypeAny> extends ZodType<T["_output"] | undefined, ZodOptionalDef<T>, T["_input"] | undefined> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    unwrap(): T;
    static create: <T_1 extends ZodTypeAny>(type: T_1, params?: RawCreateParams) => ZodOptional<T_1>;
}
interface ZodNullableDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    typeName: ZodFirstPartyTypeKind.ZodNullable;
}
declare class ZodNullable<T extends ZodTypeAny> extends ZodType<T["_output"] | null, ZodNullableDef<T>, T["_input"] | null> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    unwrap(): T;
    static create: <T_1 extends ZodTypeAny>(type: T_1, params?: RawCreateParams) => ZodNullable<T_1>;
}
interface ZodDefaultDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    defaultValue: () => util.noUndefined<T["_input"]>;
    typeName: ZodFirstPartyTypeKind.ZodDefault;
}
declare class ZodDefault<T extends ZodTypeAny> extends ZodType<util.noUndefined<T["_output"]>, ZodDefaultDef<T>, T["_input"] | undefined> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    removeDefault(): T;
    static create: <T_1 extends ZodTypeAny>(type: T_1, params: {
        errorMap?: ZodErrorMap | undefined;
        invalid_type_error?: string | undefined;
        required_error?: string | undefined;
        message?: string | undefined;
        description?: string | undefined;
    } & {
        default: T_1["_input"] | (() => util.noUndefined<T_1["_input"]>);
    }) => ZodDefault<T_1>;
}
interface ZodCatchDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    catchValue: (ctx: {
        error: ZodError;
        input: unknown;
    }) => T["_input"];
    typeName: ZodFirstPartyTypeKind.ZodCatch;
}
declare class ZodCatch<T extends ZodTypeAny> extends ZodType<T["_output"], ZodCatchDef<T>, unknown> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    removeCatch(): T;
    static create: <T_1 extends ZodTypeAny>(type: T_1, params: {
        errorMap?: ZodErrorMap | undefined;
        invalid_type_error?: string | undefined;
        required_error?: string | undefined;
        message?: string | undefined;
        description?: string | undefined;
    } & {
        catch: T_1["_output"] | (() => T_1["_output"]);
    }) => ZodCatch<T_1>;
}
interface ZodBrandedDef<T extends ZodTypeAny> extends ZodTypeDef {
    type: T;
    typeName: ZodFirstPartyTypeKind.ZodBranded;
}
declare const BRAND: unique symbol;
declare type BRAND<T extends string | number | symbol> = {
    [BRAND]: {
        [k in T]: true;
    };
};
declare class ZodBranded<T extends ZodTypeAny, B extends string | number | symbol> extends ZodType<T["_output"] & BRAND<B>, ZodBrandedDef<T>, T["_input"]> {
    _parse(input: ParseInput): ParseReturnType<any>;
    unwrap(): T;
}
interface ZodPipelineDef<A extends ZodTypeAny, B extends ZodTypeAny> extends ZodTypeDef {
    in: A;
    out: B;
    typeName: ZodFirstPartyTypeKind.ZodPipeline;
}
declare class ZodPipeline<A extends ZodTypeAny, B extends ZodTypeAny> extends ZodType<B["_output"], ZodPipelineDef<A, B>, A["_input"]> {
    _parse(input: ParseInput): ParseReturnType<any>;
    static create<A extends ZodTypeAny, B extends ZodTypeAny>(a: A, b: B): ZodPipeline<A, B>;
}
declare type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
    readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
declare type MakeReadonly<T> = T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T extends Set<infer V> ? ReadonlySet<V> : T extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T extends Array<infer V> ? ReadonlyArray<V> : T extends BuiltIn ? T : Readonly<T>;
interface ZodReadonlyDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    typeName: ZodFirstPartyTypeKind.ZodReadonly;
}
declare class ZodReadonly<T extends ZodTypeAny> extends ZodType<MakeReadonly<T["_output"]>, ZodReadonlyDef<T>, MakeReadonly<T["_input"]>> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <T_1 extends ZodTypeAny>(type: T_1, params?: RawCreateParams) => ZodReadonly<T_1>;
    unwrap(): T;
}
declare enum ZodFirstPartyTypeKind {
    ZodString = "ZodString",
    ZodNumber = "ZodNumber",
    ZodNaN = "ZodNaN",
    ZodBigInt = "ZodBigInt",
    ZodBoolean = "ZodBoolean",
    ZodDate = "ZodDate",
    ZodSymbol = "ZodSymbol",
    ZodUndefined = "ZodUndefined",
    ZodNull = "ZodNull",
    ZodAny = "ZodAny",
    ZodUnknown = "ZodUnknown",
    ZodNever = "ZodNever",
    ZodVoid = "ZodVoid",
    ZodArray = "ZodArray",
    ZodObject = "ZodObject",
    ZodUnion = "ZodUnion",
    ZodDiscriminatedUnion = "ZodDiscriminatedUnion",
    ZodIntersection = "ZodIntersection",
    ZodTuple = "ZodTuple",
    ZodRecord = "ZodRecord",
    ZodMap = "ZodMap",
    ZodSet = "ZodSet",
    ZodFunction = "ZodFunction",
    ZodLazy = "ZodLazy",
    ZodLiteral = "ZodLiteral",
    ZodEnum = "ZodEnum",
    ZodEffects = "ZodEffects",
    ZodNativeEnum = "ZodNativeEnum",
    ZodOptional = "ZodOptional",
    ZodNullable = "ZodNullable",
    ZodDefault = "ZodDefault",
    ZodCatch = "ZodCatch",
    ZodPromise = "ZodPromise",
    ZodBranded = "ZodBranded",
    ZodPipeline = "ZodPipeline",
    ZodReadonly = "ZodReadonly"
}

declare const configurationSchema: ZodObject<{
    $schema: ZodOptional<ZodString>;
    projectId: ZodOptional<ZodString>;
    projectToken: ZodOptional<ZodString>;
    onlyChanged: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    onlyStoryFiles: ZodOptional<ZodArray<ZodString, "many">>;
    onlyStoryNames: ZodOptional<ZodArray<ZodString, "many">>;
    traceChanged: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    untraced: ZodOptional<ZodArray<ZodString, "many">>;
    externals: ZodOptional<ZodArray<ZodString, "many">>;
    debug: ZodOptional<ZodBoolean>;
    diagnosticsFile: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    fileHashing: ZodOptional<ZodDefault<ZodBoolean>>;
    junitReport: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    zip: ZodOptional<ZodBoolean>;
    autoAcceptChanges: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    exitZeroOnChanges: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    exitOnceUploaded: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    ignoreLastBuildOnBranch: ZodOptional<ZodString>;
    buildScriptName: ZodOptional<ZodString>;
    buildCommand: ZodOptional<ZodString>;
    playwright: ZodOptional<ZodBoolean>;
    cypress: ZodOptional<ZodBoolean>;
    outputDir: ZodOptional<ZodString>;
    skip: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    skipUpdateCheck: ZodOptional<ZodBoolean>;
    storybookBuildDir: ZodOptional<ZodString>;
    storybookBaseDir: ZodOptional<ZodString>;
    storybookConfigDir: ZodOptional<ZodString>;
    storybookLogFile: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    logFile: ZodOptional<ZodUnion<[ZodString, ZodBoolean]>>;
    uploadMetadata: ZodOptional<ZodBoolean>;
}, "strict", ZodTypeAny, {
    skip?: string | boolean | undefined;
    buildCommand?: string | undefined;
    onlyStoryFiles?: string[] | undefined;
    $schema?: string | undefined;
    projectId?: string | undefined;
    projectToken?: string | undefined;
    onlyChanged?: string | boolean | undefined;
    onlyStoryNames?: string[] | undefined;
    traceChanged?: string | boolean | undefined;
    untraced?: string[] | undefined;
    externals?: string[] | undefined;
    debug?: boolean | undefined;
    diagnosticsFile?: string | boolean | undefined;
    fileHashing?: boolean | undefined;
    junitReport?: string | boolean | undefined;
    zip?: boolean | undefined;
    autoAcceptChanges?: string | boolean | undefined;
    exitZeroOnChanges?: string | boolean | undefined;
    exitOnceUploaded?: string | boolean | undefined;
    ignoreLastBuildOnBranch?: string | undefined;
    buildScriptName?: string | undefined;
    playwright?: boolean | undefined;
    cypress?: boolean | undefined;
    outputDir?: string | undefined;
    skipUpdateCheck?: boolean | undefined;
    storybookBuildDir?: string | undefined;
    storybookBaseDir?: string | undefined;
    storybookConfigDir?: string | undefined;
    storybookLogFile?: string | boolean | undefined;
    logFile?: string | boolean | undefined;
    uploadMetadata?: boolean | undefined;
}, {
    skip?: string | boolean | undefined;
    buildCommand?: string | undefined;
    onlyStoryFiles?: string[] | undefined;
    $schema?: string | undefined;
    projectId?: string | undefined;
    projectToken?: string | undefined;
    onlyChanged?: string | boolean | undefined;
    onlyStoryNames?: string[] | undefined;
    traceChanged?: string | boolean | undefined;
    untraced?: string[] | undefined;
    externals?: string[] | undefined;
    debug?: boolean | undefined;
    diagnosticsFile?: string | boolean | undefined;
    fileHashing?: boolean | undefined;
    junitReport?: string | boolean | undefined;
    zip?: boolean | undefined;
    autoAcceptChanges?: string | boolean | undefined;
    exitZeroOnChanges?: string | boolean | undefined;
    exitOnceUploaded?: string | boolean | undefined;
    ignoreLastBuildOnBranch?: string | undefined;
    buildScriptName?: string | undefined;
    playwright?: boolean | undefined;
    cypress?: boolean | undefined;
    outputDir?: string | undefined;
    skipUpdateCheck?: boolean | undefined;
    storybookBuildDir?: string | undefined;
    storybookBaseDir?: string | undefined;
    storybookConfigDir?: string | undefined;
    storybookLogFile?: string | boolean | undefined;
    logFile?: string | boolean | undefined;
    uploadMetadata?: boolean | undefined;
}>;
type Configuration = TypeOf<typeof configurationSchema>;
/**
 * Parse configuration details from a local config file (typically chromatic.config.json, but can
 * also use the JSON5 .jsonc and .json5 extensions. If more than one file is present, then the .json
 * one will take precedence.
 *
 * @param configFile The path to a custom config file (outside of the normal chromatic.config.json
 * file)
 *
 * @returns A parsed configration object from the local config file.
 */
declare function getConfiguration(configFile?: string): Promise<Configuration & {
    configFile?: string;
}>;

interface Environment {
    CHROMATIC_DNS_FAILOVER_SERVERS: string[];
    CHROMATIC_DNS_SERVERS: string[];
    CHROMATIC_HASH_CONCURRENCY: number;
    CHROMATIC_INDEX_URL: string;
    CHROMATIC_NOTIFY_SERVICE_URL: string;
    CHROMATIC_OUTPUT_INTERVAL: number;
    CHROMATIC_POLL_INTERVAL: number;
    CHROMATIC_PROJECT_TOKEN?: string;
    CHROMATIC_RETRIES: number;
    CHROMATIC_STORYBOOK_VERSION?: string;
    CHROMATIC_TIMEOUT: number;
    CHROMATIC_UPGRADE_TIMEOUT: number;
    ENVIRONMENT_WHITELIST: RegExp[];
    HTTP_PROXY?: string;
    HTTPS_PROXY?: string;
    STORYBOOK_BUILD_TIMEOUT: number;
    STORYBOOK_CLI_FLAGS_BY_VERSION: typeof STORYBOOK_CLI_FLAGS_BY_VERSION;
    STORYBOOK_VERIFY_TIMEOUT: number;
    STORYBOOK_NODE_ENV: string;
}
declare const STORYBOOK_CLI_FLAGS_BY_VERSION: {
    '--ci': string;
    '--loglevel': string;
};

declare const LOG_LEVELS: {
    silent: number;
    error: number;
    warn: number;
    info: number;
    debug: number;
};
type LogFunction = (...args: any[]) => void;
interface Logger {
    error: LogFunction;
    warn: LogFunction;
    info: LogFunction;
    log: LogFunction;
    file: LogFunction;
    debug: LogFunction;
    queue: () => void;
    flush: () => void;
    pause: () => void;
    resume: () => void;
    getLevel: () => keyof typeof LOG_LEVELS;
    setLevel: (value: keyof typeof LOG_LEVELS) => void;
    setInteractive: (value: boolean) => void;
    setLogFile: (path: string | undefined) => void;
}
declare const createLogger: (flags?: Flags, options?: Partial<Options>) => Logger;

type FilePath = string;
interface Flags {
    projectToken?: string[] | string;
    buildScriptName?: string;
    buildCommand?: string;
    outputDir?: string[];
    storybookBuildDir?: string[];
    playwright?: boolean;
    cypress?: boolean;
    autoAcceptChanges?: string;
    branchName?: string;
    ci?: boolean;
    configFile?: string;
    exitOnceUploaded?: string;
    exitZeroOnChanges?: string;
    externals?: string[];
    ignoreLastBuildOnBranch?: string;
    onlyChanged?: string;
    onlyStoryFiles?: string[];
    onlyStoryNames?: string[];
    patchBuild?: string;
    repositorySlug?: string;
    skip?: string;
    storybookBaseDir?: string;
    storybookConfigDir?: string;
    untraced?: string[];
    zip?: boolean;
    skipUpdateCheck?: boolean;
    debug?: boolean;
    diagnosticsFile?: string;
    dryRun?: boolean;
    fileHashing?: boolean;
    forceRebuild?: string;
    interactive?: boolean;
    junitReport?: string;
    list?: boolean;
    logFile?: string;
    logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
    logPrefix?: string;
    storybookLogFile?: string;
    traceChanged?: string;
    uploadMetadata?: boolean;
    preserveMissing?: boolean;
}
interface Options extends Configuration {
    projectToken: string;
    userToken?: string;
    configFile?: Flags['configFile'];
    logFile?: Flags['logFile'];
    logLevel?: Flags['logLevel'];
    logPrefix?: Flags['logPrefix'];
    onlyChanged: boolean | string;
    onlyStoryFiles: Flags['onlyStoryFiles'];
    onlyStoryNames: Flags['onlyStoryNames'];
    untraced: Flags['untraced'];
    externals: Flags['externals'];
    traceChanged: boolean | string;
    list: Flags['list'];
    fromCI: boolean;
    inAction: boolean;
    skip: boolean | string;
    dryRun: Flags['dryRun'];
    forceRebuild: boolean | string;
    debug: boolean;
    diagnosticsFile?: Flags['diagnosticsFile'];
    fileHashing: Flags['fileHashing'];
    interactive: boolean;
    junitReport?: Flags['junitReport'];
    uploadMetadata?: Flags['uploadMetadata'];
    zip: Flags['zip'];
    autoAcceptChanges: boolean | string;
    exitZeroOnChanges: boolean | string;
    exitOnceUploaded: boolean | string;
    isLocalBuild: boolean;
    ignoreLastBuildOnBranch: Flags['ignoreLastBuildOnBranch'];
    preserveMissingSpecs: boolean;
    originalArgv: string[];
    buildScriptName: Flags['buildScriptName'];
    buildCommand: Flags['buildCommand'];
    playwright: Flags['playwright'];
    cypress: Flags['cypress'];
    outputDir: string;
    url?: string;
    storybookBuildDir: string;
    storybookBaseDir: Flags['storybookBaseDir'];
    storybookConfigDir: Flags['storybookConfigDir'];
    storybookLogFile: Flags['storybookLogFile'];
    ownerName: string;
    repositorySlug: Flags['repositorySlug'];
    branchName: string;
    patchHeadRef: string;
    patchBaseRef: string;
    /** A callback that is called at the start of each task */
    experimental_onTaskStart?: (ctx: Context) => void;
    /** A callback that is called if a task fails */
    experimental_onTaskError?: (ctx: InitialContext, { formattedError, originalError }: {
        formattedError: string;
        originalError: Error | Error[];
    }) => void;
    /** A callback that is called during tasks that have incremental progress */
    experimental_onTaskProgress?: (ctx: Context, status: {
        progress: number;
        total: number;
        unit: string;
    }) => void;
    /** A callback that is called at the completion of each task */
    experimental_onTaskComplete?: (ctx: Context) => void;
    /** An AbortSignal that terminates the build if aborted */
    experimental_abortSignal?: AbortSignal;
    /** Logger object */
    log?: Logger;
    /** Sessiond Id */
    sessionId?: string;
    /** Environment variables */
    env?: Environment;
    skipUpdateCheck: Flags['skipUpdateCheck'];
}
type TaskName = 'auth' | 'gitInfo' | 'storybookInfo' | 'initialize' | 'build' | 'prepare' | 'upload' | 'verify' | 'snapshot' | 'report' | 'prepareWorkspace' | 'restoreWorkspace';
interface Context {
    env: Environment;
    log: Logger;
    pkg: {
        name: string;
        version: string;
        description: string;
        bugs: {
            url: string;
            email: string;
        };
        docs: string;
    };
    sessionId: string;
    packageJson: Record<string, any>;
    packagePath: string;
    help: any;
    argv: string[];
    flags: Flags;
    extraOptions?: Partial<Options>;
    configuration: Configuration;
    options: Options;
    task: TaskName;
    title: string;
    skip?: boolean;
    skipSnapshots?: boolean;
    now?: number;
    startedAt?: number;
    activity?: {
        end: () => void;
    };
    exitCode: number;
    exitCodeKey: string;
    userError?: boolean;
    runtimeErrors?: Error[];
    runtimeWarnings?: Error[];
    runtimeMetadata?: {
        nodePlatform: NodeJS.Platform;
        nodeVersion: string;
        packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
        packageManagerVersion?: string;
    };
    environment?: Record<string, string>;
    reportPath?: string;
    isPublishOnly?: boolean;
    isOnboarding: boolean;
    isReactNativeApp?: boolean;
    turboSnapAvailability?: string;
    http: HTTPClient;
    client: GraphQLClient;
    git: {
        version?: string;
        /** The absolute location on disk of the git project */
        rootPath?: string;
        /** The current user's email as pre git config */
        gitUserEmail?: string;
        branch: string;
        commit: string;
        committerEmail?: string;
        committedAt: number;
        slug?: string;
        fromCI: boolean;
        ciService?: string;
        mergeCommit?: string;
        uncommittedHash?: string;
        parentCommits?: string[];
        baselineCommits?: string[];
        changedFiles?: string[];
        changedDependencyNames?: string[];
        replacementBuildIds?: [string, string][];
        matchesBranch?: (glob: boolean | string) => boolean;
        packageMetadataChanges?: {
            changedFiles: string[];
            commit: string;
        }[];
    };
    storybook: {
        version: string;
        baseDir?: string;
        configDir: string;
        staticDir: string[];
        addons: {
            name: string;
            packageName?: string;
            packageVersion?: string;
        }[];
        builder: {
            name: string;
            packageName?: string;
            packageVersion?: string;
        };
        mainConfigFilePath?: string;
    };
    projectMetadata: {
        hasRouter?: boolean;
        creationDate?: Date;
        storybookCreationDate?: Date;
        numberOfCommitters?: number;
        numberOfAppFiles?: number;
    };
    storybookUrl?: string;
    announcedBuild: {
        id: string;
        number: number;
        status: string;
        autoAcceptChanges: boolean;
        reportToken: string;
        features?: {
            uiTests: boolean;
            uiReview: boolean;
            isReactNativeApp: boolean;
        };
        app: {
            id: string;
            turboSnapAvailability: string;
        };
    };
    build: {
        id: string;
        number: number;
        status: string;
        webUrl: string;
        storybookUrl: string;
        reportToken?: string;
        inheritedCaptureCount: number;
        actualCaptureCount: number;
        actualTestCount: number;
        specCount: number;
        componentCount: number;
        testCount: number;
        changeCount: number;
        errorCount: number;
        accessibilityChangeCount: number;
        interactionTestFailuresCount: number;
        inProgressCount?: number;
        autoAcceptChanges: boolean;
        turboSnapEnabled?: boolean;
        wasLimited?: boolean;
        startedAt?: number;
        completedAt?: number;
        app: {
            manageUrl: string;
            setupUrl: string;
            account?: {
                exceededThreshold: boolean;
                paymentRequired: boolean;
                billingUrl: string;
            };
            repository?: {
                provider: string;
            };
        };
        features?: {
            uiTests: boolean;
            uiReview: boolean;
            isReactNativeApp: boolean;
        };
        tests?: {
            spec: {
                name: string;
                component: {
                    name: string;
                    displayName: string;
                };
            };
            parameters: {
                viewport: number;
                viewportIsDefault: boolean;
            };
            mode: {
                id: string;
                name: string;
            };
        }[];
    };
    rebuildForBuild: {
        id: string;
        status: string;
        webUrl: string;
        storybookUrl: string;
        specCount: number;
        componentCount: number;
        testCount: number;
        changeCount: number;
        errorCount: number;
        actualTestCount: number;
        actualCaptureCount: number;
        inheritedCaptureCount: number;
        interactionTestFailuresCount: number;
    };
    sourceDir: string;
    buildCommand?: string;
    buildLogFile?: string;
    fileInfo?: {
        paths: string[];
        hashes?: Record<FilePath, string>;
        statsPath: string;
        lengths: {
            knownAs: string;
            pathname: string;
            contentLength: number;
        }[];
        total: number;
    };
    sentinelUrls?: string[];
    uploadedBytes?: number;
    uploadedFiles?: number;
    turboSnap?: TurboSnap;
    mergeBase?: string;
    onlyStoryFiles?: string[];
    untracedFiles?: string[];
    rebuildForBuildId?: string;
}
interface TurboSnap {
    unavailable?: boolean;
    rootPath?: string;
    baseDir?: string;
    storybookDir?: string;
    staticDirs?: string[];
    globs?: string[];
    modules?: string[];
    tracedFiles?: string[];
    tracedPaths?: Set<string>;
    changedDependencyNames?: Set<string>;
    changedManifestFiles?: Set<string>;
    affectedModuleIds?: Set<string | number>;
    bailReason?: {
        changedPackageFiles?: string[];
        changedStorybookFiles?: string[];
        changedStaticFiles?: string[];
        changedExternalFiles?: string[];
        invalidChangedFiles?: true;
        missingStatsFile?: true;
        noAncestorBuild?: true;
        rebuild?: true;
    };
}

type AtLeast<T, R extends keyof T> = Partial<T> & Pick<T, R>;
interface Output {
    code: number;
    url: string;
    buildUrl: string;
    storybookUrl: string;
    specCount: number;
    componentCount: number;
    testCount: number;
    changeCount: number;
    errorCount: number;
    interactionTestFailuresCount: number;
    actualTestCount: number;
    actualCaptureCount: number;
    inheritedCaptureCount: number;
}

type InitialContext = Omit<AtLeast<Context, 'argv' | 'flags' | 'help' | 'pkg' | 'extraOptions' | 'packagePath' | 'packageJson' | 'env' | 'log' | 'sessionId'>, 'options'>;
/**
 * Entry point for the CLI, GitHub Action, and Node API
 *
 * @param args The arguments set by the environment in which the CLI is running (CLI, GitHub Action,
 * or Node API)
 * @param args.argv The list of arguments passed.
 * @param args.flags Any flags that were passed.
 * @param args.options Any options that were passed.
 *
 * @returns An object with details from the result of the new build.
 */
declare function run({ argv, flags, options: extraOptions, }: {
    argv?: string[];
    flags?: Flags;
    options?: Partial<Options>;
}): Promise<Partial<Output>>;
/**
 * Entry point for testing only (typically invoked via `run` above)
 *
 * @param ctx The context set when executing the CLI.
 *
 * @returns A promise that resolves when all steps are completed.
 */
declare function runAll(ctx: InitialContext): Promise<void>;
interface GitInfo {
    slug: string;
    branch: string;
    commit: string;
    committedAt: number;
    committerEmail: string;
    committerName: string;
    uncommittedHash: string;
    userEmail: string;
    userEmailHash: string;
    repositoryRootDir: string;
}
/**
 * Parse git information from the local repository.
 *
 * Although this function may not be used directly in this project, it can be used externally (such
 * as https://github.com/chromaui/addon-visual-tests).
 *
 * @param ctx The context set when executing the CLI.
 *
 * @returns Any git information we were able to gather.
 */
declare function getGitInfo(ctx: Pick<Context, 'log'>): Promise<GitInfo>;

export { Configuration, Context, Flags, GitInfo, InitialContext, Logger, Options, TaskName, createLogger, getConfiguration, getGitInfo, run, runAll };
