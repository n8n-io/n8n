import { Formatter, BulkWriterSchema } from './Types';
export declare class ParquetFormatter implements Formatter {
    readonly extension = ".parquet";
    persist(columns: Map<string, any[]>, dynamicRows: Record<string, any>[], rowCount: number, dir: string, schema: BulkWriterSchema): Promise<string[]>;
}
