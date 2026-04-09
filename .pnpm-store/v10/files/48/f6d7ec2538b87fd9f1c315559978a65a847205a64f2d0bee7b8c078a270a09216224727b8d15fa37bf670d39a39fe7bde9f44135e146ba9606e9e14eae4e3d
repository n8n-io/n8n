import sbbf from '../bloom/sbbf';
import { ParquetEnvelopeReader } from '../reader';
import { ColumnChunkData } from '../declare';
interface bloomFilterOffsetData {
    columnName: string;
    offsetBytes: number;
    rowGroupIndex: number;
}
export declare const parseBloomFilterOffsets: (ColumnChunkDataCollection: ColumnChunkData[]) => bloomFilterOffsetData[];
export declare const siftAllByteOffsets: (columnChunkDataCollection: ColumnChunkData[]) => bloomFilterOffsetData[];
export declare const getBloomFiltersFor: (paths: string[], envelopeReader: InstanceType<typeof ParquetEnvelopeReader>) => Promise<{
    sbbf: sbbf;
    columnName: string;
    rowGroupIndex: number;
}[]>;
export {};
