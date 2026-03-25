import { WhereFilter } from '../../openapi/types.js';
import { BM25, Hybrid, NearAudioSearch, NearDepthSearch, NearIMUSearch, NearImageSearch, NearObject, NearTextSearch, NearThermalSearch, NearVector, NearVideoSearch, Targets, VectorForTarget } from '../../proto/v1/base_search.js';
import { GenerativeSearch } from '../../proto/v1/generative.js';
import { GroupBy } from '../../proto/v1/search_get.js';
import { AggregateFetchArgs, AggregateHybridArgs, AggregateNearImageArgs, AggregateNearObjectArgs, AggregateNearTextArgs, AggregateNearVectorArgs } from '../../grpc/aggregator.js';
import { SearchBm25Args, SearchFetchArgs, SearchHybridArgs, SearchNearAudioArgs, SearchNearDepthArgs, SearchNearIMUArgs, SearchNearImageArgs, SearchNearObjectArgs, SearchNearTextArgs, SearchNearThermalArgs, SearchNearVectorArgs, SearchNearVideoArgs } from '../../grpc/searcher.js';
import { AggregateRequest_GroupBy } from '../../proto/v1/aggregate.js';
import { Filters as FiltersGRPC, Vectors } from '../../proto/v1/base.js';
import { FilterValue } from '../filters/index.js';
import { AggregateBaseOptions, AggregateHybridOptions, AggregateNearOptions, GenerativeConfigRuntime, GroupByAggregate, GroupedTask, PropertiesMetrics, SinglePrompt } from '../index.js';
import { BaseHybridOptions, BaseNearOptions, Bm25Options, Bm25SearchOptions, FetchObjectByIdOptions, FetchObjectsOptions, HybridNearTextSubSearch, HybridNearVectorSubSearch, HybridOptions, HybridSearchOptions, ListOfVectors, MultiVectorType, NearOptions, NearTextOptions, NearVectorInputType, PrimitiveVectorType, SingleVectorType, TargetVectorInputType } from '../query/types.js';
import { TenantBC, TenantCreate, TenantUpdate } from '../tenants/types.js';
import { BatchObjects, DataObject, GenerateOptions, GroupByOptions, MetadataKeys, NestedProperties, NonReferenceInputs, PhoneNumberInput, QueryMetadata, ReferenceInput, WeaviateField } from '../types/index.js';
export declare class DataGuards {
    static isText: (argument?: WeaviateField) => argument is string;
    static isTextArray: (argument?: WeaviateField) => argument is string[];
    static isInt: (argument?: WeaviateField) => argument is number;
    static isIntArray: (argument?: WeaviateField) => argument is number[];
    static isFloat: (argument?: WeaviateField) => argument is number;
    static isFloatArray: (argument?: WeaviateField) => argument is number[];
    static isBoolean: (argument?: WeaviateField) => argument is boolean;
    static isBooleanArray: (argument?: WeaviateField) => argument is boolean[];
    static isDate: (argument?: WeaviateField) => argument is Date;
    static isDateArray: (argument?: WeaviateField) => argument is Date[];
    static isGeoCoordinate: (argument?: WeaviateField) => argument is Required<import("../../proto/v1/properties.js").GeoCoordinate>;
    static isPhoneNumber: (argument?: WeaviateField) => argument is PhoneNumberInput;
    static isNested: (argument?: WeaviateField) => argument is NestedProperties;
    static isNestedArray: (argument?: WeaviateField) => argument is NestedProperties[];
    static isEmptyArray: (argument?: WeaviateField) => argument is [];
    static isDataObject: <T>(obj: DataObject<T> | NonReferenceInputs<T>) => obj is DataObject<T>;
}
export declare class MetadataGuards {
    static isKeys: (argument?: QueryMetadata) => argument is MetadataKeys;
    static isAll: (argument?: QueryMetadata) => argument is "all";
    static isUndefined: (argument?: QueryMetadata) => argument is undefined;
}
declare class Aggregate {
    private static aggregations;
    private static common;
    static groupBy: <T>(groupBy?: GroupByAggregate<T> | undefined) => AggregateRequest_GroupBy;
    static hybrid: <V>(query: string, opts?: AggregateHybridOptions<any, import("../index.js").MetricsInput<string> | import("../index.js").MetricsInput<string>[] | import("../index.js").MetricsInput<string>[], V> | undefined) => Promise<AggregateHybridArgs>;
    static nearImage: <V>(image: string, opts?: AggregateNearOptions<import("../index.js").MetricsInput<string> | import("../index.js").MetricsInput<string>[] | import("../index.js").MetricsInput<string>[], V> | undefined) => AggregateNearImageArgs;
    static nearObject: <V>(id: string, opts?: AggregateNearOptions<import("../index.js").MetricsInput<string> | import("../index.js").MetricsInput<string>[] | import("../index.js").MetricsInput<string>[], V> | undefined) => AggregateNearObjectArgs;
    static nearText: <V>(query: string | string[], opts?: AggregateNearOptions<import("../index.js").MetricsInput<string> | import("../index.js").MetricsInput<string>[] | import("../index.js").MetricsInput<string>[], V> | undefined) => AggregateNearTextArgs;
    static nearVector: <V>(vector: NearVectorInputType, opts?: AggregateNearOptions<import("../index.js").MetricsInput<string> | import("../index.js").MetricsInput<string>[] | import("../index.js").MetricsInput<string>[], V> | undefined) => Promise<AggregateNearVectorArgs>;
    static overAll: (opts?: AggregateBaseOptions<PropertiesMetrics<any>>) => AggregateFetchArgs;
}
declare class Search {
    private static queryProperties;
    private static metadata;
    private static sortBy;
    private static rerank;
    static groupBy: <T>(groupBy?: GroupByOptions<T> | undefined) => GroupBy;
    static isGroupBy: <T>(args: any) => args is T;
    private static common;
    static bm25: <T, V>(query: string, opts?: Bm25Options<T, V>) => SearchBm25Args;
    static fetchObjects: <T, V>(args?: FetchObjectsOptions<T, V> | undefined) => SearchFetchArgs;
    static fetchObjectById: <T, V>(args: {
        id: string;
    } & FetchObjectByIdOptions<T, V>) => SearchFetchArgs;
    static hybrid: <T, V, I>(args: {
        query: string;
        supportsVectors: boolean;
    }, opts?: HybridOptions<T, V, I>) => Promise<SearchHybridArgs>;
    static nearAudio: <T, V, I>(args: {
        audio: string;
    }, opts?: NearOptions<T, V, I>) => SearchNearAudioArgs;
    static nearDepth: <T, V, I>(args: {
        depth: string;
    }, opts?: NearOptions<T, V, I>) => SearchNearDepthArgs;
    static nearImage: <T, V, I>(args: {
        image: string;
    }, opts?: NearOptions<T, V, I>) => SearchNearImageArgs;
    static nearIMU: <T, V, I>(args: {
        imu: string;
    }, opts?: NearOptions<T, V, I>) => SearchNearIMUArgs;
    static nearObject: <T, V, I>(args: {
        id: string;
    }, opts?: NearOptions<T, V, I>) => SearchNearObjectArgs;
    static nearText: <T, V, I>(args: {
        query: string | string[];
    }, opts?: NearTextOptions<T, V, I>) => SearchNearTextArgs;
    static nearThermal: <T, V, I>(args: {
        thermal: string;
    }, opts?: NearOptions<T, V, I>) => SearchNearThermalArgs;
    static nearVector: <T, V, I>(args: {
        vector: NearVectorInputType;
        supportsVectors: boolean;
    }, opts?: NearOptions<T, V, I>) => Promise<SearchNearVectorArgs>;
    static nearVideo: <T, V, I>(args: {
        video: string;
    }, opts?: NearOptions<T, V, I>) => SearchNearVideoArgs;
}
export declare class Serialize {
    static aggregate: typeof Aggregate;
    static search: typeof Search;
    static isNamedVectors: <T, V, I>(opts?: BaseNearOptions<T, V, I> | undefined) => boolean;
    static isMultiTarget: <T, V, I>(opts?: BaseNearOptions<T, V, I> | undefined) => boolean;
    static isMultiWeightPerTarget: <T, V, I>(opts?: BaseNearOptions<T, V, I> | undefined) => boolean;
    static isMultiVector: (vec?: NearVectorInputType) => boolean;
    static isMultiVectorPerTarget: (vec?: NearVectorInputType) => boolean;
    private static withImages;
    private static generativeQuery;
    static generative: <T>(args: {
        supportsSingleGrouped: boolean;
    }, opts?: GenerateOptions<T, GenerativeConfigRuntime | undefined> | undefined) => Promise<GenerativeSearch>;
    static isSinglePrompt(arg?: string | SinglePrompt): arg is SinglePrompt;
    static isGroupedTask<T>(arg?: string | GroupedTask<T>): arg is GroupedTask<T>;
    private static bm25QueryProperties;
    private static bm25SearchOperator;
    static bm25Search: <T>(args: {
        query: string;
    } & Bm25SearchOptions<T>) => BM25;
    static isHybridVectorSearch: <T, V, I>(vector: NearVectorInputType | HybridNearTextSubSearch | HybridNearVectorSubSearch | undefined) => vector is PrimitiveVectorType | Record<string, PrimitiveVectorType | ListOfVectors<SingleVectorType> | ListOfVectors<MultiVectorType>>;
    static isHybridNearTextSearch: <T, V, I>(vector: NearVectorInputType | HybridNearTextSubSearch | HybridNearVectorSubSearch | undefined) => vector is HybridNearTextSubSearch;
    static isHybridNearVectorSearch: <T, V, I>(vector: NearVectorInputType | HybridNearTextSubSearch | HybridNearVectorSubSearch | undefined) => vector is HybridNearVectorSubSearch;
    private static hybridVector;
    static hybridSearch: <T, V>(args: {
        query: string;
        supportsVectors: boolean;
    } & HybridSearchOptions<T, V>) => Promise<Hybrid>;
    static nearAudioSearch: <T, V, I>(args: {
        audio: string;
    } & NearOptions<T, V, I>) => NearAudioSearch;
    static nearDepthSearch: <T, V, I>(args: {
        depth: string;
    } & NearOptions<T, V, I>) => NearDepthSearch;
    static nearImageSearch: <T, V, I>(args: {
        image: string;
    } & NearOptions<T, V, I>) => NearImageSearch;
    static nearIMUSearch: <T, V, I>(args: {
        imu: string;
    } & NearOptions<T, V, I>) => NearIMUSearch;
    static nearObjectSearch: <T, V, I>(args: {
        id: string;
    } & NearOptions<T, V, I>) => NearObject;
    static nearTextSearch: <V>(args: {
        query: string | string[];
        targetVector?: TargetVectorInputType<V> | undefined;
        certainty?: number | undefined;
        distance?: number | undefined;
        moveAway?: {
            concepts?: string[] | undefined;
            force?: number | undefined;
            objects?: string[] | undefined;
        } | undefined;
        moveTo?: {
            concepts?: string[] | undefined;
            force?: number | undefined;
            objects?: string[] | undefined;
        } | undefined;
    }) => NearTextSearch;
    static nearThermalSearch: <T, V, I>(args: {
        thermal: string;
    } & NearOptions<T, V, I>) => NearThermalSearch;
    private static vectorToBuffer;
    private static vectorToBytes;
    /**
     * Convert a 2D array of numbers to a Uint8Array
     *
     * Defined as an async method so that control can be relinquished back to the event loop on each outer loop for large vectors
     */
    private static vectorsToBytes;
    static nearVectorSearch: <V>(args: {
        vector: NearVectorInputType;
        supportsVectors: boolean;
        certainty?: number | undefined;
        distance?: number | undefined;
        targetVector?: TargetVectorInputType<V> | undefined;
    }) => Promise<NearVector>;
    static targetVector: <V>(args?: {
        targetVector?: TargetVectorInputType<V> | undefined;
    } | undefined) => {
        targets?: Targets;
        targetVectors?: string[];
    };
    static vectors: <V>(args: {
        supportsVectors: boolean;
        argumentName: 'nearVector' | 'vector';
        targetVector?: TargetVectorInputType<V> | undefined;
        vector?: NearVectorInputType | undefined;
    }) => Promise<{
        targetVectors?: string[];
        targets?: Targets;
        vectorBytes?: Uint8Array;
        vectors?: Vectors[];
        vectorPerTarget?: Record<string, Uint8Array>;
        vectorForTargets?: VectorForTarget[];
    }>;
    private static targets;
    static nearVideoSearch: <T, V, I>(args: {
        video: string;
    } & NearOptions<T, V, I>) => NearVideoSearch;
    static filtersGRPC: (filters: FilterValue) => FiltersGRPC;
    private static filtersGRPCValueText;
    private static filtersGRPCValueTextArray;
    private static filterTargetToREST;
    static filtersREST: (filters: FilterValue) => WhereFilter;
    private static operator;
    static restProperties: (properties: Record<string, WeaviateField | undefined>, references?: Record<string, ReferenceInput<any> | undefined>) => Record<string, any>;
    private static batchProperties;
    static batchObjects: <T>(collection: string, objects: (DataObject<T> | NonReferenceInputs<T>)[], requiresInsertFix: boolean, tenant?: string) => Promise<BatchObjects<T>>;
    static tenants<T, M>(tenants: T[], mapper: (tenant: T) => M): M[][];
    static tenantCreate<T extends TenantBC | TenantCreate>(tenant: T): {
        name: string;
        activityStatus?: 'HOT' | 'COLD';
    };
    static tenantUpdate<T extends TenantBC | TenantUpdate>(tenant: T): {
        name: string;
        activityStatus: 'HOT' | 'COLD' | 'FROZEN';
    };
}
export {};
