import { TimeSeriesAggregationType, TimeSeriesDuplicatePolicies } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: string): Array<string>;
export type InfoRawReply = [
    'totalSamples',
    number,
    'memoryUsage',
    number,
    'firstTimestamp',
    number,
    'lastTimestamp',
    number,
    'retentionTime',
    number,
    'chunkCount',
    number,
    'chunkSize',
    number,
    'chunkType',
    string,
    'duplicatePolicy',
    TimeSeriesDuplicatePolicies | null,
    'labels',
    Array<[name: string, value: string]>,
    'sourceKey',
    string | null,
    'rules',
    Array<[key: string, timeBucket: number, aggregationType: TimeSeriesAggregationType]>
];
export interface InfoReply {
    totalSamples: number;
    memoryUsage: number;
    firstTimestamp: number;
    lastTimestamp: number;
    retentionTime: number;
    chunkCount: number;
    chunkSize: number;
    chunkType: string;
    duplicatePolicy: TimeSeriesDuplicatePolicies | null;
    labels: Array<{
        name: string;
        value: string;
    }>;
    sourceKey: string | null;
    rules: Array<{
        key: string;
        timeBucket: number;
        aggregationType: TimeSeriesAggregationType;
    }>;
}
export declare function transformReply(reply: InfoRawReply): InfoReply;
