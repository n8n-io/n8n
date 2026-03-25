// disable automatic export
export {};

// Uses ArrayLike to admit Uint8 and co.
type OutputBuffer = ArrayLike<number>;
type InputBuffer = ArrayLike<number>;

interface RandomOptions {
    /** `Array` of 16 random bytes (0-255) */
    random?: InputBuffer | undefined;
}
interface RngOptions {
    /** Alternative to `options.random`, a `Function` that returns an `Array` of 16 random bytes (0-255) */
    rng?: (() => InputBuffer) | undefined;
}

interface V1BaseOptions {
    /** RFC "node" field as an `Array[6]` of byte values (per 4.1.6) */
    node?: InputBuffer | undefined;
    /** RFC "clock sequence" as a `Number` between 0 - 0x3fff */
    clockseq?: number | undefined;
    /** RFC "timestamp" field (`Number` of milliseconds, unix epoch) */
    msecs?: number | Date | undefined;
    /** RFC "timestamp" field (`Number` of nanoseconds to add to msecs, should be 0-10,000) */
    nsecs?: number | undefined;
}
interface V1RandomOptions extends V1BaseOptions, RandomOptions {}
interface V1RngOptions extends V1BaseOptions, RngOptions {}

export type V1Options = V1RandomOptions | V1RngOptions;
export type V4Options = RandomOptions | RngOptions;

type v1String = (options?: V1Options) => string;
type v1Buffer = <T extends OutputBuffer>(options: V1Options | null | undefined, buffer: T, offset?: number) => T;
type v1 = v1Buffer & v1String;

type v4String = (options?: V4Options) => string;
type v4Buffer = <T extends OutputBuffer>(options: V4Options | null | undefined, buffer: T, offset?: number) => T;
type v4 = v4Buffer & v4String;

type v3String = (name: string | InputBuffer, namespace: string | InputBuffer) => string;
type v3Buffer = <T extends OutputBuffer>(
    name: string | InputBuffer,
    namespace: string | InputBuffer,
    buffer: T,
    offset?: number,
) => T;
interface v3Static {
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L16
    DNS: string;
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L17
    URL: string;
}
type v3 = v3Buffer & v3String & v3Static;

type v5String = (name: string | InputBuffer, namespace: string | InputBuffer) => string;
type v5Buffer = <T extends OutputBuffer>(
    name: string | InputBuffer,
    namespace: string | InputBuffer,
    buffer: T,
    offset?: number,
) => T;
interface v5Static {
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L16
    DNS: string;
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L17
    URL: string;
}
type v5 = v5Buffer & v5String & v5Static;

type NIL = string;

type parse = (uuid: string) => Uint8Array;
type stringify = (buffer: InputBuffer, offset?: number) => string;
type validate = (uuid: string) => boolean;
type version = (uuid: string) => number;

export const NIL: NIL;
export const parse: parse;
export const stringify: stringify;
export const v1: v1;
export const v3: v3;
export const v4: v4;
export const v5: v5;
export const validate: validate;
export const version: version;
