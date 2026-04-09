import thrift from 'thrift';
import fs, { WriteStream } from 'fs';
import * as parquet_thrift from '../gen-nodejs/parquet_types';
import { FileMetaDataExt, WriterOptions } from './declare';
import { Int64 } from 'thrift';
export type WriteStreamMinimal = Pick<WriteStream, 'write' | 'end'>;
type Enums = typeof parquet_thrift.Encoding | typeof parquet_thrift.FieldRepetitionType | typeof parquet_thrift.Type | typeof parquet_thrift.CompressionCodec | typeof parquet_thrift.PageType | typeof parquet_thrift.ConvertedType;
type ThriftObject = FileMetaDataExt | parquet_thrift.PageHeader | parquet_thrift.ColumnMetaData | parquet_thrift.BloomFilterHeader | parquet_thrift.OffsetIndex | parquet_thrift.ColumnIndex | FileMetaDataExt;
/**
 * Helper function that serializes a thrift object into a buffer
 */
export declare const serializeThrift: (obj: ThriftObject) => Buffer<ArrayBuffer>;
export declare const decodeThrift: (obj: ThriftObject, buf: Buffer, offset?: number) => number;
/**
 * Get the number of bits required to store a given value
 */
export declare const getBitWidth: (val: number) => number;
/**
 * FIXME not ideal that this is linear
 */
export declare const getThriftEnum: (klass: Enums, value: unknown) => string;
export declare const fopen: (filePath: string | Buffer | URL) => Promise<number>;
export declare const fstat: (filePath: string | Buffer | URL) => Promise<fs.Stats>;
export declare const fread: (fd: number, position: number | null, length: number) => Promise<Buffer>;
export declare const fclose: (fd: number) => Promise<unknown>;
export declare const oswrite: (os: WriteStreamMinimal, buf: Buffer) => Promise<unknown>;
export declare const osend: (os: WriteStreamMinimal) => Promise<unknown>;
export declare const osopen: (path: string | Buffer | URL, opts?: WriterOptions) => Promise<WriteStream>;
export declare const fieldIndexOf: (arr: unknown[][], elem: unknown[]) => number;
export declare const cloneInteger: (int: Int64) => thrift.Int64;
export {};
