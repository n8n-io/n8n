import { TimeSeriesEncoding, TimeSeriesDuplicatePolicies, Labels, Timestamp } from '.';
interface AddOptions {
    RETENTION?: number;
    ENCODING?: TimeSeriesEncoding;
    CHUNK_SIZE?: number;
    ON_DUPLICATE?: TimeSeriesDuplicatePolicies;
    LABELS?: Labels;
}
export declare const FIRST_KEY_INDEX = 1;
export declare function transformArguments(key: string, timestamp: Timestamp, value: number, options?: AddOptions): Array<string>;
export declare function transformReply(): number;
export {};
