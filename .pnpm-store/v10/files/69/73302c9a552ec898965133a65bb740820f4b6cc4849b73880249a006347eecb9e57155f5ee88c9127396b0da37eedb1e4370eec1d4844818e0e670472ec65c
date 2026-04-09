# Installation
> `npm install --save @types/node-int64`

# Summary
This package contains type definitions for node-int64 (https://github.com/broofa/node-int64).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node-int64.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node-int64/index.d.ts)
````ts
/// <reference types="node" />

declare class Int64 {
    static MAX_INT: number;
    static MIN_INT: number;

    public buffer: Buffer;
    public offset: number;

    constructor(buffer: Buffer, offset?: number);
    constructor(array: Uint8Array, offset?: number);
    constructor(str: string);
    constructor(num: number);
    constructor(hi: number, lo: number);

    _2scomp(): void;

    // setValue(string) - A hexidecimal string
    setValue(str: string): void;
    // setValue(number) - Number (throws if n is outside int64 range)
    setValue(num: number): void;
    // setValue(hi, lo) - Raw bits as two 32-bit values
    setValue(hi: number, lo: number): void;

    toNumber(allowImprecise?: boolean): number;
    valueOf(): number;
    toString(radix?: number): string;
    toOctetString(separator?: string): string;
    toBuffer(rawBuffer?: boolean): Buffer;
    copy(targetBuffer: Buffer, targetOffset?: number): void;
    compare(other: Int64): number;
    equals(other: Int64): boolean;
    inspect(): string;
}

export = Int64;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 09:09:39 GMT
 * Dependencies: [@types/node](https://npmjs.com/package/@types/node)

# Credits
These definitions were written by [Benno Dreissig](https://github.com/x3cion), and [Kevin Greene](https://github.com/kevin-greene-ck).
