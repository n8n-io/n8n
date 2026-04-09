export declare class Result<T> {
    value: T;
    offset: number;
    constructor(value: T, offset: number);
}
export declare class NotEnoughDataError extends Error {
    byteCount: number;
    constructor(byteCount: number);
}
export declare function readUInt8(buf: Buffer, offset: number): Result<number>;
export declare function readUInt16LE(buf: Buffer, offset: number): Result<number>;
export declare function readInt16LE(buf: Buffer, offset: number): Result<number>;
export declare function readUInt24LE(buf: Buffer, offset: number): Result<number>;
export declare function readUInt32LE(buf: Buffer, offset: number): Result<number>;
export declare function readUInt32BE(buf: Buffer, offset: number): Result<number>;
export declare function readUInt40LE(buf: Buffer, offset: number): Result<number>;
export declare function readInt32LE(buf: Buffer, offset: number): Result<number>;
export declare function readBigUInt64LE(buf: Buffer, offset: number): Result<bigint>;
export declare function readBigInt64LE(buf: Buffer, offset: number): Result<bigint>;
export declare function readFloatLE(buf: Buffer, offset: number): Result<number>;
export declare function readDoubleLE(buf: Buffer, offset: number): Result<number>;
export declare function readBVarChar(buf: Buffer, offset: number): Result<string>;
export declare function readBVarByte(buf: Buffer, offset: number): Result<Buffer>;
export declare function readUsVarChar(buf: Buffer, offset: number): Result<string>;
export declare function readUsVarByte(buf: Buffer, offset: number): Result<Buffer>;
export declare function readUNumeric64LE(buf: Buffer, offset: number): Result<number>;
export declare function readUNumeric96LE(buf: Buffer, offset: number): Result<number>;
export declare function readUNumeric128LE(buf: Buffer, offset: number): Result<number>;
