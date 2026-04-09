import parquet_thrift from '../../gen-nodejs/parquet_types';
import SplitBlockBloomFilter from '../bloom/sbbf';
import { Block } from '../declare';
import Int64 from 'node-int64';
export interface createSBBFParams {
    numFilterBytes?: number;
    falsePositiveRate?: number;
    numDistinct?: number;
    column?: any;
}
export declare const createSBBF: (params: createSBBFParams) => SplitBlockBloomFilter;
export declare const serializeFilterHeaders: (numberOfBytes: number) => Buffer<ArrayBuffer>;
interface serializeFilterDataParams {
    filterBlocks: Block[];
    filterByteSize: number;
}
export declare const serializeFilterData: (params: serializeFilterDataParams) => Buffer<ArrayBuffer>;
export declare const setFilterOffset: (column: parquet_thrift.ColumnChunk, offset: Int64) => void;
export declare const getSerializedBloomFilterData: (splitBlockBloomFilter: InstanceType<typeof SplitBlockBloomFilter>) => Buffer;
export {};
