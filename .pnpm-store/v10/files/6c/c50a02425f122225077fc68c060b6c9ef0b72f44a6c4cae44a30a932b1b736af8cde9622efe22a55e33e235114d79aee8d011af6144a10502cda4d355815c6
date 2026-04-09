import { Statistics } from '../gen-nodejs/parquet_types';
import { ParquetEnvelopeReader } from './reader';
import { FileMetaDataExt } from './declare';
export interface BufferReaderOptions {
    maxSpan?: number;
    maxLength?: number;
    queueWait?: number;
    default_dictionary_size?: number;
    metadata?: FileMetaDataExt;
    rawStatistics?: Statistics;
    treatInt96AsTimestamp?: boolean;
}
interface BufferReaderQueueRow {
    offset: number;
    length: number;
    resolve: (buf: Buffer) => void;
    reject: unknown;
}
export default class BufferReader {
    maxSpan: number;
    maxLength: number;
    queueWait: number;
    scheduled?: boolean;
    queue: BufferReaderQueueRow[];
    envelopeReader: ParquetEnvelopeReader;
    constructor(envelopeReader: ParquetEnvelopeReader, options: BufferReaderOptions);
    read(offset: number, length: number): Promise<Buffer>;
    processQueue(): Promise<void>;
}
export {};
