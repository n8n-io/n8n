import stream from 'stream';
import * as parquet_shredder from './shred';
import * as parquet_util from './util';
import { WriterOptions, RowGroupExt } from './declare';
import { ParquetSchema } from './schema';
import Int64 from 'node-int64';
import SplitBlockBloomFilter from './bloom/sbbf';
/**
 * Write a parquet file to an output stream. The ParquetWriter will perform
 * buffering/batching for performance, so close() must be called after all rows
 * are written.
 */
export declare class ParquetWriter {
    schema: ParquetSchema;
    envelopeWriter: ParquetEnvelopeWriter | null;
    rowBuffer: parquet_shredder.RecordBuffer;
    rowGroupSize: number;
    closed: boolean;
    userMetadata: Record<string, string>;
    /**
     * Convenience method to create a new buffered parquet writer that writes to
     * the specified file
     */
    static openFile(schema: ParquetSchema, path: string | Buffer | URL, opts?: WriterOptions): Promise<ParquetWriter>;
    /**
     * Convenience method to create a new buffered parquet writer that writes to
     * the specified stream
     */
    static openStream(schema: ParquetSchema, outputStream: parquet_util.WriteStreamMinimal, opts?: WriterOptions): Promise<ParquetWriter>;
    /**
     * Create a new buffered parquet writer for a given envelope writer
     */
    constructor(schema: ParquetSchema, envelopeWriter: ParquetEnvelopeWriter, opts?: WriterOptions);
    /**
     * Append a single row to the parquet file. Rows are buffered in memory until
     * rowGroupSize rows are in the buffer or close() is called
     */
    appendRow(row: Record<string, unknown>): Promise<void>;
    /**
     * Finish writing the parquet file and commit the footer to disk. This method
     * MUST be called after you are finished adding rows. You must not call this
     * method twice on the same object or add any rows after the close() method has
     * been called
     */
    close(callback?: () => void): Promise<void>;
    /**
     * Add key<>value metadata to the file
     */
    setMetadata(key: string, value: string): void;
    /**
     * Set the parquet row group size. This values controls the maximum number
     * of rows that are buffered in memory at any given time as well as the number
     * of rows that are co-located on disk. A higher value is generally better for
     * read-time I/O performance at the tradeoff of write-time memory usage.
     */
    setRowGroupSize(cnt: number): void;
    /**
     * Set the parquet data page size. The data page size controls the maximum
     * number of column values that are written to disk as a consecutive array
     */
    setPageSize(cnt: number): void;
}
/**
 * Create a parquet file from a schema and a number of row groups. This class
 * performs direct, unbuffered writes to the underlying output stream and is
 * intended for advanced and internal users; the writeXXX methods must be
 * called in the correct order to produce a valid file.
 */
export declare class ParquetEnvelopeWriter {
    schema: ParquetSchema;
    write: (buf: Buffer) => void;
    close: () => void;
    offset: Int64;
    rowCount: Int64;
    rowGroups: RowGroupExt[];
    pageSize: number;
    useDataPageV2: boolean;
    pageIndex: boolean;
    bloomFilters: Record<string, SplitBlockBloomFilter>;
    /**
     * Create a new parquet envelope writer that writes to the specified stream
     */
    static openStream(schema: ParquetSchema, outputStream: parquet_util.WriteStreamMinimal, opts: WriterOptions): Promise<ParquetEnvelopeWriter>;
    constructor(schema: ParquetSchema, writeFn: (buf: Buffer) => void, closeFn: () => void, fileOffset: Int64, opts: WriterOptions);
    writeSection(buf: Buffer): void;
    /**
     * Encode the parquet file header
     */
    writeHeader(): void;
    /**
     * Encode a parquet row group. The records object should be created using the
     * shredRecord method
     */
    writeRowGroup(records: parquet_shredder.RecordBuffer): Promise<void>;
    writeBloomFilters(): void;
    /**
     * Write the columnIndices and offsetIndices
     */
    writeIndex(): void;
    /**
     * Write the parquet file footer
     */
    writeFooter(userMetadata: Record<string, string>): void;
    /**
     * Set the parquet data page size. The data page size controls the maximum
     * number of column values that are written to disk as a consecutive array
     */
    setPageSize(cnt: number): void;
}
/**
 * Create a parquet transform stream
 */
export declare class ParquetTransformer extends stream.Transform {
    writer: ParquetWriter;
    constructor(schema: ParquetSchema, opts?: {});
    _transform(row: Record<string, unknown>, _encoding: string, callback: (err?: Error | null, data?: any) => void): void;
    _flush(callback: (foo: any, bar?: any) => any): void;
}
