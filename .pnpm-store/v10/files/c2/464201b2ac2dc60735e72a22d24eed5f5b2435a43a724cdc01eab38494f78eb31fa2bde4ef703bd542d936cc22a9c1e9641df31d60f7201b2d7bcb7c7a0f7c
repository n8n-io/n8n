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
