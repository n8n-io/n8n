export {}; // Make this a module

// #region Fetch and friends
// Conditional type aliases, used at the end of this file.
// Will either be empty if lib-dom is included, or the undici version otherwise.
type _Request = typeof globalThis extends { onmessage: any } ? {} : import("undici-types").Request;
type _Response = typeof globalThis extends { onmessage: any } ? {} : import("undici-types").Response;
type _FormData = typeof globalThis extends { onmessage: any } ? {} : import("undici-types").FormData;
type _Headers = typeof globalThis extends { onmessage: any } ? {} : import("undici-types").Headers;
type _MessageEvent = typeof globalThis extends { onmessage: any } ? {} : import("undici-types").MessageEvent;
type _RequestInit = typeof globalThis extends { onmessage: any } ? {}
    : import("undici-types").RequestInit;
type _ResponseInit = typeof globalThis extends { onmessage: any } ? {}
    : import("undici-types").ResponseInit;
// #endregion Fetch and friends

// #region DOMException
type _DOMException = typeof globalThis extends { onmessage: any } ? {} : NodeDOMException;
interface NodeDOMException extends Error {
    readonly code: number;
    readonly message: string;
    readonly name: string;
    readonly INDEX_SIZE_ERR: 1;
    readonly DOMSTRING_SIZE_ERR: 2;
    readonly HIERARCHY_REQUEST_ERR: 3;
    readonly WRONG_DOCUMENT_ERR: 4;
    readonly INVALID_CHARACTER_ERR: 5;
    readonly NO_DATA_ALLOWED_ERR: 6;
    readonly NO_MODIFICATION_ALLOWED_ERR: 7;
    readonly NOT_FOUND_ERR: 8;
    readonly NOT_SUPPORTED_ERR: 9;
    readonly INUSE_ATTRIBUTE_ERR: 10;
    readonly INVALID_STATE_ERR: 11;
    readonly SYNTAX_ERR: 12;
    readonly INVALID_MODIFICATION_ERR: 13;
    readonly NAMESPACE_ERR: 14;
    readonly INVALID_ACCESS_ERR: 15;
    readonly VALIDATION_ERR: 16;
    readonly TYPE_MISMATCH_ERR: 17;
    readonly SECURITY_ERR: 18;
    readonly NETWORK_ERR: 19;
    readonly ABORT_ERR: 20;
    readonly URL_MISMATCH_ERR: 21;
    readonly QUOTA_EXCEEDED_ERR: 22;
    readonly TIMEOUT_ERR: 23;
    readonly INVALID_NODE_TYPE_ERR: 24;
    readonly DATA_CLONE_ERR: 25;
}
interface NodeDOMExceptionConstructor {
    prototype: DOMException;
    new(message?: string, nameOrOptions?: string | { name?: string; cause?: unknown }): DOMException;
    readonly INDEX_SIZE_ERR: 1;
    readonly DOMSTRING_SIZE_ERR: 2;
    readonly HIERARCHY_REQUEST_ERR: 3;
    readonly WRONG_DOCUMENT_ERR: 4;
    readonly INVALID_CHARACTER_ERR: 5;
    readonly NO_DATA_ALLOWED_ERR: 6;
    readonly NO_MODIFICATION_ALLOWED_ERR: 7;
    readonly NOT_FOUND_ERR: 8;
    readonly NOT_SUPPORTED_ERR: 9;
    readonly INUSE_ATTRIBUTE_ERR: 10;
    readonly INVALID_STATE_ERR: 11;
    readonly SYNTAX_ERR: 12;
    readonly INVALID_MODIFICATION_ERR: 13;
    readonly NAMESPACE_ERR: 14;
    readonly INVALID_ACCESS_ERR: 15;
    readonly VALIDATION_ERR: 16;
    readonly TYPE_MISMATCH_ERR: 17;
    readonly SECURITY_ERR: 18;
    readonly NETWORK_ERR: 19;
    readonly ABORT_ERR: 20;
    readonly URL_MISMATCH_ERR: 21;
    readonly QUOTA_EXCEEDED_ERR: 22;
    readonly TIMEOUT_ERR: 23;
    readonly INVALID_NODE_TYPE_ERR: 24;
    readonly DATA_CLONE_ERR: 25;
}
// #endregion DOMException

declare global {
    var global: typeof globalThis;

    var process: NodeJS.Process;
    var console: Console;

    interface ErrorConstructor {
        /**
         * Creates a `.stack` property on `targetObject`, which when accessed returns
         * a string representing the location in the code at which
         * `Error.captureStackTrace()` was called.
         *
         * ```js
         * const myObject = {};
         * Error.captureStackTrace(myObject);
         * myObject.stack;  // Similar to `new Error().stack`
         * ```
         *
         * The first line of the trace will be prefixed with
         * `${myObject.name}: ${myObject.message}`.
         *
         * The optional `constructorOpt` argument accepts a function. If given, all frames
         * above `constructorOpt`, including `constructorOpt`, will be omitted from the
         * generated stack trace.
         *
         * The `constructorOpt` argument is useful for hiding implementation
         * details of error generation from the user. For instance:
         *
         * ```js
         * function a() {
         *   b();
         * }
         *
         * function b() {
         *   c();
         * }
         *
         * function c() {
         *   // Create an error without stack trace to avoid calculating the stack trace twice.
         *   const { stackTraceLimit } = Error;
         *   Error.stackTraceLimit = 0;
         *   const error = new Error();
         *   Error.stackTraceLimit = stackTraceLimit;
         *
         *   // Capture the stack trace above function b
         *   Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
         *   throw error;
         * }
         *
         * a();
         * ```
         */
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        /**
         * @see https://v8.dev/docs/stack-trace-api#customizing-stack-traces
         */
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        /**
         * The `Error.stackTraceLimit` property specifies the number of stack frames
         * collected by a stack trace (whether generated by `new Error().stack` or
         * `Error.captureStackTrace(obj)`).
         *
         * The default value is `10` but may be set to any valid JavaScript number. Changes
         * will affect any stack trace captured _after_ the value has been changed.
         *
         * If set to a non-number value, or set to a negative number, stack traces will
         * not capture any frames.
         */
        stackTraceLimit: number;
    }

    /**
     * Enable this API with the `--expose-gc` CLI flag.
     */
    var gc: NodeJS.GCFunction | undefined;

    namespace NodeJS {
        interface CallSite {
            getColumnNumber(): number | null;
            getEnclosingColumnNumber(): number | null;
            getEnclosingLineNumber(): number | null;
            getEvalOrigin(): string | undefined;
            getFileName(): string | null;
            getFunction(): Function | undefined;
            getFunctionName(): string | null;
            getLineNumber(): number | null;
            getMethodName(): string | null;
            getPosition(): number;
            getPromiseIndex(): number | null;
            getScriptHash(): string;
            getScriptNameOrSourceURL(): string | null;
            getThis(): unknown;
            getTypeName(): string | null;
            isAsync(): boolean;
            isConstructor(): boolean;
            isEval(): boolean;
            isNative(): boolean;
            isPromiseAll(): boolean;
            isToplevel(): boolean;
        }

        interface ErrnoException extends Error {
            errno?: number | undefined;
            code?: string | undefined;
            path?: string | undefined;
            syscall?: string | undefined;
        }

        interface ReadableStream extends EventEmitter {
            readable: boolean;
            read(size?: number): string | Buffer;
            setEncoding(encoding: BufferEncoding): this;
            pause(): this;
            resume(): this;
            isPaused(): boolean;
            pipe<T extends WritableStream>(destination: T, options?: { end?: boolean | undefined }): T;
            unpipe(destination?: WritableStream): this;
            unshift(chunk: string | Uint8Array, encoding?: BufferEncoding): void;
            wrap(oldStream: ReadableStream): this;
            [Symbol.asyncIterator](): AsyncIterableIterator<string | Buffer>;
        }

        interface WritableStream extends EventEmitter {
            writable: boolean;
            write(buffer: Uint8Array | string, cb?: (err?: Error | null) => void): boolean;
            write(str: string, encoding?: BufferEncoding, cb?: (err?: Error | null) => void): boolean;
            end(cb?: () => void): this;
            end(data: string | Uint8Array, cb?: () => void): this;
            end(str: string, encoding?: BufferEncoding, cb?: () => void): this;
        }

        interface ReadWriteStream extends ReadableStream, WritableStream {}

        interface RefCounted {
            ref(): this;
            unref(): this;
        }

        interface Dict<T> {
            [key: string]: T | undefined;
        }

        interface ReadOnlyDict<T> {
            readonly [key: string]: T | undefined;
        }

        interface GCFunction {
            (minor?: boolean): void;
            (options: NodeJS.GCOptions & { execution: "async" }): Promise<void>;
            (options: NodeJS.GCOptions): void;
        }

        interface GCOptions {
            execution?: "sync" | "async" | undefined;
            flavor?: "regular" | "last-resort" | undefined;
            type?: "major-snapshot" | "major" | "minor" | undefined;
            filename?: string | undefined;
        }

        /** An iterable iterator returned by the Node.js API. */
        // Default TReturn/TNext in v20 is `any`, for compatibility with the previously-used IterableIterator.
        interface Iterator<T, TReturn = any, TNext = any> extends IteratorObject<T, TReturn, TNext> {
            [Symbol.iterator](): NodeJS.Iterator<T, TReturn, TNext>;
        }

        /** An async iterable iterator returned by the Node.js API. */
        // Default TReturn/TNext in v20 is `any`, for compatibility with the previously-used AsyncIterableIterator.
        interface AsyncIterator<T, TReturn = any, TNext = any> extends AsyncIteratorObject<T, TReturn, TNext> {
            [Symbol.asyncIterator](): NodeJS.AsyncIterator<T, TReturn, TNext>;
        }
    }

    // Global DOM types

    interface DOMException extends _DOMException {}
    var DOMException: typeof globalThis extends { onmessage: any; DOMException: infer T } ? T
        : NodeDOMExceptionConstructor;

    // #region AbortController
    interface AbortController {
        readonly signal: AbortSignal;
        abort(reason?: any): void;
    }
    var AbortController: typeof globalThis extends { onmessage: any; AbortController: infer T } ? T
        : {
            prototype: AbortController;
            new(): AbortController;
        };

    interface AbortSignal extends EventTarget {
        readonly aborted: boolean;
        onabort: ((this: AbortSignal, ev: Event) => any) | null;
        readonly reason: any;
        throwIfAborted(): void;
    }
    var AbortSignal: typeof globalThis extends { onmessage: any; AbortSignal: infer T } ? T
        : {
            prototype: AbortSignal;
            new(): AbortSignal;
            abort(reason?: any): AbortSignal;
            any(signals: AbortSignal[]): AbortSignal;
            timeout(milliseconds: number): AbortSignal;
        };
    // #endregion AbortController

    // #region fetch
    interface RequestInit extends _RequestInit {}

    function fetch(
        input: string | URL | globalThis.Request,
        init?: RequestInit,
    ): Promise<Response>;

    interface Request extends _Request {}
    var Request: typeof globalThis extends {
        onmessage: any;
        Request: infer T;
    } ? T
        : typeof import("undici-types").Request;

    interface ResponseInit extends _ResponseInit {}

    interface Response extends _Response {}
    var Response: typeof globalThis extends {
        onmessage: any;
        Response: infer T;
    } ? T
        : typeof import("undici-types").Response;

    interface FormData extends _FormData {}
    var FormData: typeof globalThis extends {
        onmessage: any;
        FormData: infer T;
    } ? T
        : typeof import("undici-types").FormData;

    interface Headers extends _Headers {}
    var Headers: typeof globalThis extends {
        onmessage: any;
        Headers: infer T;
    } ? T
        : typeof import("undici-types").Headers;

    interface MessageEvent extends _MessageEvent {}
    var MessageEvent: typeof globalThis extends {
        onmessage: any;
        MessageEvent: infer T;
    } ? T
        : typeof import("undici-types").MessageEvent;

    // #endregion fetch
}
