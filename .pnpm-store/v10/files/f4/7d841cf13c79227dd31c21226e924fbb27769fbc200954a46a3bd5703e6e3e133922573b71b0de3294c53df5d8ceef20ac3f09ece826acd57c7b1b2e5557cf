import { FieldType } from '../types/Collection';
/** Serializes a ColumnBuffer to one or more files on disk. */
export interface Formatter {
    readonly extension: string;
    persist(columns: Map<string, any[]>, dynamicCol: Record<string, any>[], rowCount: number, dir: string, schema: BulkWriterSchema): Promise<string[]>;
}
/** Stores files (local pass-through or remote upload). */
export interface Storage {
    /** Returns the final stored path. */
    write(localPath: string, remotePath: string): Promise<string>;
}
export interface BulkWriterSchema {
    fields: FieldType[];
    enable_dynamic_field?: boolean;
}
export interface BulkWriterOptions {
    schema: BulkWriterSchema;
    storage?: Storage;
    format?: 'json' | 'parquet';
    chunkSize?: number;
    localPath?: string;
}
export interface FlushEvent {
    files: string[];
    rowCount: number;
    chunkIndex: number;
}
