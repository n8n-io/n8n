import type { IToken, IGetToken } from '@tokenizer/token';
export declare const UINT8: IToken<number>;
/**
 * 16-bit unsigned integer, Little Endian byte order
 */
export declare const UINT16_LE: IToken<number>;
/**
 * 16-bit unsigned integer, Big Endian byte order
 */
export declare const UINT16_BE: IToken<number>;
/**
 * 24-bit unsigned integer, Little Endian byte order
 */
export declare const UINT24_LE: IToken<number>;
/**
 * 24-bit unsigned integer, Big Endian byte order
 */
export declare const UINT24_BE: IToken<number>;
/**
 * 32-bit unsigned integer, Little Endian byte order
 */
export declare const UINT32_LE: IToken<number>;
/**
 * 32-bit unsigned integer, Big Endian byte order
 */
export declare const UINT32_BE: IToken<number>;
/**
 * 8-bit signed integer
 */
export declare const INT8: IToken<number>;
/**
 * 16-bit signed integer, Big Endian byte order
 */
export declare const INT16_BE: IToken<number>;
/**
 * 16-bit signed integer, Little Endian byte order
 */
export declare const INT16_LE: IToken<number>;
/**
 * 24-bit signed integer, Little Endian byte order
 */
export declare const INT24_LE: IToken<number>;
/**
 * 24-bit signed integer, Big Endian byte order
 */
export declare const INT24_BE: IToken<number>;
/**
 * 32-bit signed integer, Big Endian byte order
 */
export declare const INT32_BE: IToken<number>;
/**
 * 32-bit signed integer, Big Endian byte order
 */
export declare const INT32_LE: IToken<number>;
/**
 * 64-bit unsigned integer, Little Endian byte order
 */
export declare const UINT64_LE: IToken<bigint>;
/**
 * 64-bit signed integer, Little Endian byte order
 */
export declare const INT64_LE: IToken<bigint>;
/**
 * 64-bit unsigned integer, Big Endian byte order
 */
export declare const UINT64_BE: IToken<bigint>;
/**
 * 64-bit signed integer, Big Endian byte order
 */
export declare const INT64_BE: IToken<bigint>;
/**
 * IEEE 754 16-bit (half precision) float, big endian
 */
export declare const Float16_BE: IToken<number>;
/**
 * IEEE 754 16-bit (half precision) float, little endian
 */
export declare const Float16_LE: IToken<number>;
/**
 * IEEE 754 32-bit (single precision) float, big endian
 */
export declare const Float32_BE: IToken<number>;
/**
 * IEEE 754 32-bit (single precision) float, little endian
 */
export declare const Float32_LE: IToken<number>;
/**
 * IEEE 754 64-bit (double precision) float, big endian
 */
export declare const Float64_BE: IToken<number>;
/**
 * IEEE 754 64-bit (double precision) float, little endian
 */
export declare const Float64_LE: IToken<number>;
/**
 * IEEE 754 80-bit (extended precision) float, big endian
 */
export declare const Float80_BE: IToken<number>;
/**
 * IEEE 754 80-bit (extended precision) float, little endian
 */
export declare const Float80_LE: IToken<number>;
/**
 * Ignore a given number of bytes
 */
export declare class IgnoreType implements IGetToken<void> {
    len: number;
    /**
     * @param len number of bytes to ignore
     */
    constructor(len: number);
    get(_array: Uint8Array, _off: number): void;
}
export declare class Uint8ArrayType implements IGetToken<Uint8Array> {
    len: number;
    constructor(len: number);
    get(array: Uint8Array, offset: number): Uint8Array;
}
/**
 * Consume a fixed number of bytes from the stream and return a string with a specified encoding.
 * Supports all encodings supported by TextDecoder, plus 'windows-1252'.
 */
export declare class StringType implements IGetToken<string> {
    len: number;
    private encoding?;
    constructor(len: number, encoding?: string);
    get(data: Uint8Array, offset?: number): string;
}
/**
 * ANSI Latin 1 String using Windows-1252 (Code Page 1252)
 * Windows-1252 is a superset of ISO 8859-1 / Latin-1.
 */
export declare class AnsiStringType extends StringType {
    constructor(len: number);
}
