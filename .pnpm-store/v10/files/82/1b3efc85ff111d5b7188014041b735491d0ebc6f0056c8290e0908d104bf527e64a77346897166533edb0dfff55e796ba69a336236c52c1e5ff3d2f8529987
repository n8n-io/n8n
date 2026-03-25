import * as ADD from './ADD';
import * as ALTER from './ALTER';
import * as CREATE from './CREATE';
import * as CREATERULE from './CREATERULE';
import * as DECRBY from './DECRBY';
import * as DEL from './DEL';
import * as DELETERULE from './DELETERULE';
import * as GET from './GET';
import * as INCRBY from './INCRBY';
import * as INFO_DEBUG from './INFO_DEBUG';
import * as INFO from './INFO';
import * as MADD from './MADD';
import * as MGET from './MGET';
import * as MGET_WITHLABELS from './MGET_WITHLABELS';
import * as QUERYINDEX from './QUERYINDEX';
import * as RANGE from './RANGE';
import * as REVRANGE from './REVRANGE';
import * as MRANGE from './MRANGE';
import * as MRANGE_WITHLABELS from './MRANGE_WITHLABELS';
import * as MREVRANGE from './MREVRANGE';
import * as MREVRANGE_WITHLABELS from './MREVRANGE_WITHLABELS';
import { RedisCommandArguments } from '@redis/client/dist/lib/commands';
declare const _default: {
    ADD: typeof ADD;
    add: typeof ADD;
    ALTER: typeof ALTER;
    alter: typeof ALTER;
    CREATE: typeof CREATE;
    create: typeof CREATE;
    CREATERULE: typeof CREATERULE;
    createRule: typeof CREATERULE;
    DECRBY: typeof DECRBY;
    decrBy: typeof DECRBY;
    DEL: typeof DEL;
    del: typeof DEL;
    DELETERULE: typeof DELETERULE;
    deleteRule: typeof DELETERULE;
    GET: typeof GET;
    get: typeof GET;
    INCRBY: typeof INCRBY;
    incrBy: typeof INCRBY;
    INFO_DEBUG: typeof INFO_DEBUG;
    infoDebug: typeof INFO_DEBUG;
    INFO: typeof INFO;
    info: typeof INFO;
    MADD: typeof MADD;
    mAdd: typeof MADD;
    MGET: typeof MGET;
    mGet: typeof MGET;
    MGET_WITHLABELS: typeof MGET_WITHLABELS;
    mGetWithLabels: typeof MGET_WITHLABELS;
    QUERYINDEX: typeof QUERYINDEX;
    queryIndex: typeof QUERYINDEX;
    RANGE: typeof RANGE;
    range: typeof RANGE;
    REVRANGE: typeof REVRANGE;
    revRange: typeof REVRANGE;
    MRANGE: typeof MRANGE;
    mRange: typeof MRANGE;
    MRANGE_WITHLABELS: typeof MRANGE_WITHLABELS;
    mRangeWithLabels: typeof MRANGE_WITHLABELS;
    MREVRANGE: typeof MREVRANGE;
    mRevRange: typeof MREVRANGE;
    MREVRANGE_WITHLABELS: typeof MREVRANGE_WITHLABELS;
    mRevRangeWithLabels: typeof MREVRANGE_WITHLABELS;
};
export default _default;
export declare enum TimeSeriesAggregationType {
    AVG = "AVG",
    AVERAGE = "AVG",
    FIRST = "FIRST",
    LAST = "LAST",
    MIN = "MIN",
    MINIMUM = "MIN",
    MAX = "MAX",
    MAXIMUM = "MAX",
    SUM = "SUM",
    RANGE = "RANGE",
    COUNT = "COUNT",
    STD_P = "STD.P",
    STD_S = "STD.S",
    VAR_P = "VAR.P",
    VAR_S = "VAR.S",
    TWA = "TWA"
}
export declare enum TimeSeriesDuplicatePolicies {
    BLOCK = "BLOCK",
    FIRST = "FIRST",
    LAST = "LAST",
    MIN = "MIN",
    MAX = "MAX",
    SUM = "SUM"
}
export declare enum TimeSeriesReducers {
    AVG = "AVG",
    SUM = "SUM",
    MIN = "MIN",
    MINIMUM = "MIN",
    MAX = "MAX",
    MAXIMUM = "MAX",
    RANGE = "range",
    COUNT = "COUNT",
    STD_P = "STD.P",
    STD_S = "STD.S",
    VAR_P = "VAR.P",
    VAR_S = "VAR.S"
}
export type Timestamp = number | Date | string;
export declare function transformTimestampArgument(timestamp: Timestamp): string;
export declare function pushRetentionArgument(args: RedisCommandArguments, retention?: number): RedisCommandArguments;
export declare enum TimeSeriesEncoding {
    COMPRESSED = "COMPRESSED",
    UNCOMPRESSED = "UNCOMPRESSED"
}
export declare function pushEncodingArgument(args: RedisCommandArguments, encoding?: TimeSeriesEncoding): RedisCommandArguments;
export declare function pushChunkSizeArgument(args: RedisCommandArguments, chunkSize?: number): RedisCommandArguments;
export declare function pushDuplicatePolicy(args: RedisCommandArguments, duplicatePolicy?: TimeSeriesDuplicatePolicies): RedisCommandArguments;
export type RawLabels = Array<[label: string, value: string]>;
export type Labels = {
    [label: string]: string;
};
export declare function transformLablesReply(reply: RawLabels): Labels;
export declare function pushLabelsArgument(args: RedisCommandArguments, labels?: Labels): RedisCommandArguments;
export interface IncrDecrOptions {
    TIMESTAMP?: Timestamp;
    RETENTION?: number;
    UNCOMPRESSED?: boolean;
    CHUNK_SIZE?: number;
    LABELS?: Labels;
}
export declare function transformIncrDecrArguments(command: 'TS.INCRBY' | 'TS.DECRBY', key: string, value: number, options?: IncrDecrOptions): RedisCommandArguments;
export type SampleRawReply = [timestamp: number, value: string];
export interface SampleReply {
    timestamp: number;
    value: number;
}
export declare function transformSampleReply(reply: SampleRawReply): SampleReply;
export declare enum TimeSeriesBucketTimestamp {
    LOW = "-",
    HIGH = "+",
    MID = "~"
}
export interface RangeOptions {
    LATEST?: boolean;
    FILTER_BY_TS?: Array<Timestamp>;
    FILTER_BY_VALUE?: {
        min: number;
        max: number;
    };
    COUNT?: number;
    ALIGN?: Timestamp;
    AGGREGATION?: {
        type: TimeSeriesAggregationType;
        timeBucket: Timestamp;
        BUCKETTIMESTAMP?: TimeSeriesBucketTimestamp;
        EMPTY?: boolean;
    };
}
export declare function pushRangeArguments(args: RedisCommandArguments, fromTimestamp: Timestamp, toTimestamp: Timestamp, options?: RangeOptions): RedisCommandArguments;
interface MRangeGroupBy {
    label: string;
    reducer: TimeSeriesReducers;
}
export declare function pushMRangeGroupByArguments(args: RedisCommandArguments, groupBy?: MRangeGroupBy): RedisCommandArguments;
export type Filter = string | Array<string>;
export declare function pushFilterArgument(args: RedisCommandArguments, filter: string | Array<string>): RedisCommandArguments;
export interface MRangeOptions extends RangeOptions {
    GROUPBY?: MRangeGroupBy;
}
export declare function pushMRangeArguments(args: RedisCommandArguments, fromTimestamp: Timestamp, toTimestamp: Timestamp, filter: Filter, options?: MRangeOptions): RedisCommandArguments;
export type SelectedLabels = string | Array<string>;
export declare function pushWithLabelsArgument(args: RedisCommandArguments, selectedLabels?: SelectedLabels): RedisCommandArguments;
export interface MRangeWithLabelsOptions extends MRangeOptions {
    SELECTED_LABELS?: SelectedLabels;
}
export declare function pushMRangeWithLabelsArguments(args: RedisCommandArguments, fromTimestamp: Timestamp, toTimestamp: Timestamp, filter: Filter, options?: MRangeWithLabelsOptions): RedisCommandArguments;
export declare function transformRangeReply(reply: Array<SampleRawReply>): Array<SampleReply>;
type MRangeRawReply = Array<[
    key: string,
    labels: RawLabels,
    samples: Array<SampleRawReply>
]>;
interface MRangeReplyItem {
    key: string;
    samples: Array<SampleReply>;
}
export declare function transformMRangeReply(reply: MRangeRawReply): Array<MRangeReplyItem>;
export interface MRangeWithLabelsReplyItem extends MRangeReplyItem {
    labels: Labels;
}
export declare function transformMRangeWithLabelsReply(reply: MRangeRawReply): Array<MRangeWithLabelsReplyItem>;
export declare function pushLatestArgument(args: RedisCommandArguments, latest?: boolean): RedisCommandArguments;
