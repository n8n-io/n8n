import Int64 from 'node-int64';
import parquet_thrift from '../gen-nodejs/parquet_types';
import * as parquet_shredder from './shred';
import * as parquet_schema from './schema';
import { BufferReaderOptions } from './bufferReader';
import { Parameter, PageData, ClientS3, ClientParameters, FileMetaDataExt, RowGroupExt, ColumnChunkExt } from './declare';
import { Options } from './codec/types';
import { S3Client } from '@aws-sdk/client-s3';
/**
 * A parquet cursor is used to retrieve rows from a parquet file in order
 */
declare class ParquetCursor {
    metadata: FileMetaDataExt;
    envelopeReader: ParquetEnvelopeReader;
    schema: parquet_schema.ParquetSchema;
    columnList: unknown[][];
    rowGroup: unknown[];
    rowGroupIndex: number;
    cursorIndex: number;
    /**
     * Create a new parquet reader from the file metadata and an envelope reader.
     * It is usually not recommended to call this constructor directly except for
     * advanced and internal use cases. Consider using getCursor() on the
     * ParquetReader instead
     */
    constructor(metadata: FileMetaDataExt, envelopeReader: ParquetEnvelopeReader, schema: parquet_schema.ParquetSchema, columnList: unknown[][]);
    /**
     * Retrieve the next row from the cursor. Returns a row or NULL if the end
     * of the file was reached
     */
    next(): Promise<unknown>;
    /**
     * Rewind the cursor to the beginning of the file
     */
    rewind(): void;
}
/**
 * A parquet reader allows retrieving the rows from a parquet file in order.
 * The basic usage is to create a reader and then retrieve a cursor/iterator
 * which allows you to consume row after row until all rows have been read. It is
 * important that you call close() after you are finished reading the file to
 * avoid leaking file descriptors.
 */
export declare class ParquetReader {
    envelopeReader: ParquetEnvelopeReader | null;
    metadata: FileMetaDataExt | null;
    schema: parquet_schema.ParquetSchema;
    treatInt96AsTimestamp: boolean;
    /**
     * Open the parquet file pointed to by the specified path and return a new
     * parquet reader
     */
    static openFile(filePath: string | Buffer | URL, options?: BufferReaderOptions): Promise<ParquetReader>;
    static openBuffer(buffer: Buffer, options?: BufferReaderOptions): Promise<ParquetReader>;
    /**
     * Open the parquet file from S3 using the supplied aws client [, commands] and params
     * The params have to include `Bucket` and `Key` to the file requested,
     * If using v3 of the AWS SDK, combine the client and commands into an object wiht keys matching
     * the original module names, and do not instantiate the commands; pass them as classes/modules.
     *
     * This function returns a new parquet reader [ or throws an Error.]
     */
    static openS3(client: any, params: ClientParameters, options?: BufferReaderOptions): Promise<ParquetReader>;
    /**
     * Open the parquet file from a url using the supplied request module
     * params should either be a string (url) or an object that includes
     * a `url` property.
     * This function returns a new parquet reader
     */
    static openUrl(params: Parameter | URL | string, options?: BufferReaderOptions): Promise<ParquetReader>;
    static openEnvelopeReader(envelopeReader: ParquetEnvelopeReader, opts?: BufferReaderOptions): Promise<ParquetReader>;
    /**
     * Create a new parquet reader from the file metadata and an envelope reader.
     * It is not recommended to call this constructor directly except for advanced
     * and internal use cases. Consider using one of the open{File,Buffer} methods
     * instead
     */
    constructor(metadata: FileMetaDataExt, envelopeReader: ParquetEnvelopeReader, opts?: BufferReaderOptions);
    /**
     * Support `for await` iterators on the reader object
     * Uses `ParquetCursor` still under the hood.
     *
     * ```js
     *  for await (const record of reader) {
     *    console.log(record);
     *  }
     * ```
     */
    [Symbol.asyncIterator](): AsyncGenerator<{}, void, unknown>;
    /**
     * Return a cursor to the file. You may open more than one cursor and use
     * them concurrently. All cursors become invalid once close() is called on
     * the reader object.
     *
     * The required_columns parameter controls which columns are actually read
     * from disk. An empty array or no value implies all columns. A list of column
     * names means that only those columns should be loaded from disk.
     */
    getCursor(columnList?: unknown[][]): ParquetCursor;
    getBloomFiltersFor(columnNames: string[]): Promise<Record<string, {
        sbbf: import("./bloom/sbbf").default;
        columnName: string;
        rowGroupIndex: number;
    }[]>>;
    /**
     * Return the number of rows in this file. Note that the number of rows is
     * not necessarily equal to the number of rows in each column.
     */
    getRowCount(): Int64;
    /**
     * Returns the ParquetSchema for this file
     */
    getSchema(): parquet_schema.ParquetSchema;
    /**
     * Returns the user (key/value) metadata for this file
     */
    getMetadata(): Record<string, unknown>;
    exportMetadata(indent: string | number | undefined): Promise<string>;
    /**
     * Close this parquet reader. You MUST call this method once you're finished
     * reading rows
     */
    close(): Promise<void>;
    decodePages(buffer: Buffer, opts: Options): Promise<PageData>;
}
export declare class ParquetEnvelopeReader {
    readFn: (offset: number, length: number, file?: string) => Promise<Buffer>;
    close: () => unknown;
    id: number;
    fileSize: number | (() => Promise<number>);
    default_dictionary_size: number;
    metadata?: FileMetaDataExt;
    schema?: parquet_schema.ParquetSchema;
    treatInt96AsTimestamp?: boolean;
    static openFile(filePath: string | Buffer | URL, options?: BufferReaderOptions): Promise<ParquetEnvelopeReader>;
    static openBuffer(buffer: Buffer, options?: BufferReaderOptions): Promise<ParquetEnvelopeReader>;
    static openS3(client: ClientS3, params: ClientParameters, options?: BufferReaderOptions): Promise<ParquetEnvelopeReader>;
    static openS3v3(client: S3Client, params: any, options: any): Promise<ParquetEnvelopeReader>;
    static streamToBuffer(body: any): Promise<Buffer>;
    static openUrl(url: Parameter | URL | string, options?: BufferReaderOptions): Promise<ParquetEnvelopeReader>;
    constructor(readFn: (offset: number, length: number, file?: string) => Promise<Buffer>, closeFn: () => unknown, fileSize: number | (() => Promise<number>), options?: BufferReaderOptions, metadata?: FileMetaDataExt);
    read(offset: number, length: number, file?: string): Promise<Buffer<ArrayBufferLike>>;
    readHeader(): Promise<void>;
    getColumn(path: string | parquet_thrift.ColumnChunk, row_group: RowGroupExt | number | string | null): ColumnChunkExt;
    getAllColumnChunkDataFor(paths: string[], row_groups?: RowGroupExt[]): {
        rowGroupIndex: number;
        column: ColumnChunkExt;
    }[];
    readOffsetIndex(path: string | ColumnChunkExt, row_group: RowGroupExt | number | null, opts: Options): Promise<parquet_thrift.OffsetIndex>;
    readColumnIndex(path: string | ColumnChunkExt, row_group: RowGroupExt | number, opts: Options): Promise<parquet_thrift.ColumnIndex>;
    readPage(column: ColumnChunkExt, page: parquet_thrift.PageLocation | number, records: Record<string, unknown>[], opts: Options): Promise<Record<string, unknown>[]>;
    readRowGroup(schema: parquet_schema.ParquetSchema, rowGroup: RowGroupExt, columnList: unknown[][]): Promise<parquet_shredder.RecordBuffer>;
    readColumnChunk(schema: parquet_schema.ParquetSchema, colChunk: ColumnChunkExt, opts?: Options): Promise<PageData>;
    readFooter(): Promise<parquet_thrift.FileMetaData>;
}
export {};
