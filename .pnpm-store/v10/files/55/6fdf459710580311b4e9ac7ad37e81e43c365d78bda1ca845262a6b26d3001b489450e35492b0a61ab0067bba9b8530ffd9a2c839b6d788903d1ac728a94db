import type { AbortSignalLike } from '@azure/abort-controller';

/**
 * Represents a function that returns a promise that can be aborted.
 */
export declare type AbortablePromiseBuilder<T> = (abortOptions: {
    abortSignal?: AbortSignalLike;
}) => Promise<T>;

/**
 * Options related to abort controller.
 */
export declare interface AbortOptions {
    /**
     * The abortSignal associated with containing operation.
     */
    abortSignal?: AbortSignalLike;
    /**
     * The abort error message associated with containing operation.
     */
    abortErrorMsg?: string;
}

/**
 * promise.race() wrapper that aborts rest of promises as soon as the first promise settles.
 */
export declare function cancelablePromiseRace<T extends unknown[]>(abortablePromiseBuilders: AbortablePromiseBuilder<T[number]>[], options?: {
    abortSignal?: AbortSignalLike;
}): Promise<T[number]>;

/**
 * Generates a SHA-256 hash.
 * @param content - The data to be included in the hash.
 * @param encoding - The textual encoding to use for the returned hash.
 */
export declare function computeSha256Hash(content: string, encoding: "base64" | "hex"): Promise<string>;

/**
 * Generates a SHA-256 HMAC signature.
 * @param key - The HMAC key represented as a base64 string, used to generate the cryptographic HMAC hash.
 * @param stringToSign - The data to be signed.
 * @param encoding - The textual encoding to use for the returned HMAC digest.
 */
export declare function computeSha256Hmac(key: string, stringToSign: string, encoding: "base64" | "hex"): Promise<string>;

/**
 * Creates an abortable promise.
 * @param buildPromise - A function that takes the resolve and reject functions as parameters.
 * @param options - The options for the abortable promise.
 * @returns A promise that can be aborted.
 */
export declare function createAbortablePromise<T>(buildPromise: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, options?: CreateAbortablePromiseOptions): Promise<T>;

/**
 * Options for the createAbortablePromise function.
 */
export declare interface CreateAbortablePromiseOptions extends AbortOptions {
    /** A function to be called if the promise was aborted */
    cleanupBeforeAbort?: () => void;
}

/**
 * A wrapper for setTimeout that resolves a promise after timeInMs milliseconds.
 * @param timeInMs - The number of milliseconds to be delayed.
 * @param options - The options for delay - currently abort options
 * @returns Promise that is resolved after timeInMs
 */
export declare function delay(timeInMs: number, options?: DelayOptions): Promise<void>;

/**
 * Options for support abort functionality for the delay method
 */
export declare interface DelayOptions extends AbortOptions {
}

/** The supported character encoding type */
export declare type EncodingType = "utf-8" | "base64" | "base64url" | "hex";

/**
 * Given what is thought to be an error object, return the message if possible.
 * If the message is missing, returns a stringified version of the input.
 * @param e - Something thrown from a try block
 * @returns The error message or a string of the input
 */
export declare function getErrorMessage(e: unknown): string;

/**
 * Returns a random integer value between a lower and upper bound,
 * inclusive of both bounds.
 * Note that this uses Math.random and isn't secure. If you need to use
 * this for any kind of security purpose, find a better source of random.
 * @param min - The smallest integer value allowed.
 * @param max - The largest integer value allowed.
 */
export declare function getRandomIntegerInclusive(min: number, max: number): number;

/**
 * A constant that indicates whether the environment the code is running is a Web Browser.
 */
export declare const isBrowser: boolean;

/**
 * A constant that indicates whether the environment the code is running is Bun.sh.
 */
export declare const isBun: boolean;

/**
 * Helper TypeGuard that checks if something is defined or not.
 * @param thing - Anything
 */
export declare function isDefined<T>(thing: T | undefined | null): thing is T;

/**
 * A constant that indicates whether the environment the code is running is Deno.
 */
export declare const isDeno: boolean;

/**
 * Typeguard for an error object shape (has name and message)
 * @param e - Something caught by a catch clause.
 */
export declare function isError(e: unknown): e is Error;

/**
 * A constant that indicates whether the environment the code is running is Node.JS.
 */
export declare const isNode: boolean;

/**
 * Helper to determine when an input is a generic JS object.
 * @returns true when input is an object type that is not null, Array, RegExp, or Date.
 */
export declare function isObject(input: unknown): input is UnknownObject;

/**
 * Helper TypeGuard that checks if the input is an object with the specified properties.
 * @param thing - Anything.
 * @param properties - The name of the properties that should appear in the object.
 */
export declare function isObjectWithProperties<Thing, PropertyName extends string>(thing: Thing, properties: PropertyName[]): thing is Thing & Record<PropertyName, unknown>;

/**
 * A constant that indicates whether the environment the code is running is in React-Native.
 */
export declare const isReactNative: boolean;

/**
 * A constant that indicates whether the environment the code is running is a Web Worker.
 */
export declare const isWebWorker: boolean;

/**
 * Helper TypeGuard that checks if the input is an object with the specified property.
 * @param thing - Any object.
 * @param property - The name of the property that should appear in the object.
 */
export declare function objectHasProperty<Thing, PropertyName extends string>(thing: Thing, property: PropertyName): thing is Thing & Record<PropertyName, unknown>;

/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
export declare function randomUUID(): string;

/**
 * The helper that transforms string to specific character encoded bytes array.
 * @param value - the string to be converted
 * @param format - the format we use to decode the value
 * @returns a uint8array
 */
export declare function stringToUint8Array(value: string, format: EncodingType): Uint8Array;

/**
 * The helper that transforms bytes with specific character encoding into string
 * @param bytes - the uint8array bytes
 * @param format - the format we use to encode the byte
 * @returns a string of the encoded string
 */
export declare function uint8ArrayToString(bytes: Uint8Array, format: EncodingType): string;

/**
 * A generic shape for a plain JS object.
 */
export declare type UnknownObject = {
    [s: string]: unknown;
};

export { }
