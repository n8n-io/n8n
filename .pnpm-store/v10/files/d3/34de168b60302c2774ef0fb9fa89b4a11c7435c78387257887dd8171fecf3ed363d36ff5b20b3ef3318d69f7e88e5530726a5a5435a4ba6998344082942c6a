/// <reference types="node" />
import { EventEmitter } from 'events';
import { BulkWriterOptions } from './Types';
export declare class BulkWriter extends EventEmitter {
    private schema;
    private buffer;
    private bufferSize;
    private formatter;
    private storage;
    private chunkSize;
    private basePath;
    private _batchFiles;
    private _totalRowCount;
    private chunkIndex;
    private pendingFlush;
    private autoIdFields;
    private functionOutputFields;
    private requiredFields;
    private fieldMap;
    constructor(options: BulkWriterOptions);
    get totalRowCount(): number;
    get bufferRowCount(): number;
    get batchFiles(): string[][];
    /** Append a single row. Triggers auto-flush when buffer exceeds chunkSize. */
    append(row: Record<string, any>): Promise<void>;
    /** Flush the current buffer to disk. */
    commit(): Promise<void>;
    /** Flush remaining data and return all batch file paths. */
    close(): Promise<string[][]>;
    /** Write all rows from an async iterable, then close. */
    writeFrom(source: AsyncIterable<Record<string, any>>): Promise<string[][]>;
    private flush;
    private validateRow;
    private validateFieldValue;
}
