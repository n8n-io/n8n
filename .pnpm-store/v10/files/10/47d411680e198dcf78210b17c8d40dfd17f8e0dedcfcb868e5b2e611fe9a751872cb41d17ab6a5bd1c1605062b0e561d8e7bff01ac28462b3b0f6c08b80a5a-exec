// Type definitions for uuid 8.3
// Project: https://github.com/uuidjs/uuid
// Definitions by: Oliver Hoffmann <https://github.com/iamolivinius>
//                 Felipe Ochoa <https://github.com/felipeochoa>
//                 Chris Barth <https://github.com/cjbarth>
//                 Linus Unnebäck <https://github.com/LinusU>
//                 Christoph Tavan <https://github.com/ctavan>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.8

// disable automatic export
export {};

// Uses ArrayLike to admit Unit8 and co.
type OutputBuffer = ArrayLike<number>;
type InputBuffer = ArrayLike<number>;

interface RandomOptions {
    random?: InputBuffer | undefined;
}
interface RngOptions {
    rng?: (() => InputBuffer) | undefined;
}

interface V1BaseOptions {
    node?: InputBuffer | undefined;
    clockseq?: number | undefined;
    msecs?: number | Date | undefined;
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
type v3Buffer = <T extends OutputBuffer>(name: string | InputBuffer, namespace: string | InputBuffer, buffer: T, offset?: number) => T;
interface v3Static {
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L22
    DNS: string;
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L23
    URL: string;
}
type v3 = v3Buffer & v3String & v3Static;

type v5String = (name: string | InputBuffer, namespace: string | InputBuffer) => string;
type v5Buffer = <T extends OutputBuffer>(name: string | InputBuffer, namespace: string | InputBuffer, buffer: T, offset?: number) => T;
interface v5Static {
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L22
    DNS: string;
    // https://github.com/uuidjs/uuid/blob/master/src/v35.js#L23
    URL: string;
}
type v5 = v5Buffer & v5String & v5Static;

type NIL = string;

type parse = (uuid: string) => OutputBuffer;
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
