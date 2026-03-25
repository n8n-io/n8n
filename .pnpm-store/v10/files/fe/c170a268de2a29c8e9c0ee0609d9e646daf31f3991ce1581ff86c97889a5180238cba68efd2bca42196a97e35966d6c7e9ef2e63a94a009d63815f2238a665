import _m0 from "protobufjs/minimal.js";
import { ConsistencyLevel, Filters, Vectors } from "./base.js";
import { BM25, Hybrid, NearAudioSearch, NearDepthSearch, NearImageSearch, NearIMUSearch, NearObject, NearTextSearch, NearThermalSearch, NearVector, NearVideoSearch } from "./base_search.js";
import { GenerativeReply, GenerativeResult, GenerativeSearch } from "./generative.js";
import { Properties } from "./properties.js";
export declare const protobufPackage = "weaviate.v1";
export interface SearchRequest {
    /** required */
    collection: string;
    /** parameters */
    tenant: string;
    consistencyLevel?: ConsistencyLevel | undefined;
    /** what is returned */
    properties?: PropertiesRequest | undefined;
    metadata?: MetadataRequest | undefined;
    groupBy?: GroupBy | undefined;
    /** affects order and length of results. 0/empty (default value) means disabled */
    limit: number;
    offset: number;
    autocut: number;
    after: string;
    /** protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED */
    sortBy: SortBy[];
    /** matches/searches for objects */
    filters?: Filters | undefined;
    hybridSearch?: Hybrid | undefined;
    bm25Search?: BM25 | undefined;
    nearVector?: NearVector | undefined;
    nearObject?: NearObject | undefined;
    nearText?: NearTextSearch | undefined;
    nearImage?: NearImageSearch | undefined;
    nearAudio?: NearAudioSearch | undefined;
    nearVideo?: NearVideoSearch | undefined;
    nearDepth?: NearDepthSearch | undefined;
    nearThermal?: NearThermalSearch | undefined;
    nearImu?: NearIMUSearch | undefined;
    generative?: GenerativeSearch | undefined;
    rerank?: Rerank | undefined;
    /** @deprecated */
    uses123Api: boolean;
    /** @deprecated */
    uses125Api: boolean;
    uses127Api: boolean;
}
export interface GroupBy {
    /**
     * currently only supports one entry (eg just properties, no refs). But might
     * be extended in the future.
     * protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED
     */
    path: string[];
    numberOfGroups: number;
    objectsPerGroup: number;
}
export interface SortBy {
    ascending: boolean;
    /**
     * currently only supports one entry (eg just properties, no refs). But the
     * weaviate datastructure already has paths in it and this makes it easily
     * extendable in the future
     * protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED
     */
    path: string[];
}
export interface MetadataRequest {
    uuid: boolean;
    vector: boolean;
    creationTimeUnix: boolean;
    lastUpdateTimeUnix: boolean;
    distance: boolean;
    certainty: boolean;
    score: boolean;
    explainScore: boolean;
    isConsistent: boolean;
    vectors: string[];
}
export interface PropertiesRequest {
    nonRefProperties: string[];
    refProperties: RefPropertiesRequest[];
    objectProperties: ObjectPropertiesRequest[];
    returnAllNonrefProperties: boolean;
}
export interface ObjectPropertiesRequest {
    propName: string;
    primitiveProperties: string[];
    objectProperties: ObjectPropertiesRequest[];
}
export interface RefPropertiesRequest {
    referenceProperty: string;
    properties: PropertiesRequest | undefined;
    metadata: MetadataRequest | undefined;
    targetCollection: string;
}
export interface Rerank {
    property: string;
    query?: string | undefined;
}
export interface SearchReply {
    took: number;
    results: SearchResult[];
    /** @deprecated */
    generativeGroupedResult?: string | undefined;
    groupByResults: GroupByResult[];
    generativeGroupedResults?: GenerativeResult | undefined;
}
export interface RerankReply {
    score: number;
}
export interface GroupByResult {
    name: string;
    minDistance: number;
    maxDistance: number;
    numberOfObjects: number;
    objects: SearchResult[];
    rerank?: RerankReply | undefined;
    /** @deprecated */
    generative?: GenerativeReply | undefined;
    generativeResult?: GenerativeResult | undefined;
}
export interface SearchResult {
    properties: PropertiesResult | undefined;
    metadata: MetadataResult | undefined;
    generative?: GenerativeResult | undefined;
}
export interface MetadataResult {
    id: string;
    /**
     * protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED
     *
     * @deprecated
     */
    vector: number[];
    creationTimeUnix: number;
    creationTimeUnixPresent: boolean;
    lastUpdateTimeUnix: number;
    lastUpdateTimeUnixPresent: boolean;
    distance: number;
    distancePresent: boolean;
    certainty: number;
    certaintyPresent: boolean;
    score: number;
    scorePresent: boolean;
    explainScore: string;
    explainScorePresent: boolean;
    isConsistent?: boolean | undefined;
    /** @deprecated */
    generative: string;
    /** @deprecated */
    generativePresent: boolean;
    isConsistentPresent: boolean;
    vectorBytes: Uint8Array;
    idAsBytes: Uint8Array;
    rerankScore: number;
    rerankScorePresent: boolean;
    vectors: Vectors[];
}
export interface PropertiesResult {
    refProps: RefPropertiesResult[];
    targetCollection: string;
    metadata: MetadataResult | undefined;
    nonRefProps: Properties | undefined;
    refPropsRequested: boolean;
}
export interface RefPropertiesResult {
    properties: PropertiesResult[];
    propName: string;
}
export declare const SearchRequest: {
    encode(message: SearchRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SearchRequest;
    fromJSON(object: any): SearchRequest;
    toJSON(message: SearchRequest): unknown;
    create(base?: DeepPartial<SearchRequest>): SearchRequest;
    fromPartial(object: DeepPartial<SearchRequest>): SearchRequest;
};
export declare const GroupBy: {
    encode(message: GroupBy, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GroupBy;
    fromJSON(object: any): GroupBy;
    toJSON(message: GroupBy): unknown;
    create(base?: DeepPartial<GroupBy>): GroupBy;
    fromPartial(object: DeepPartial<GroupBy>): GroupBy;
};
export declare const SortBy: {
    encode(message: SortBy, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SortBy;
    fromJSON(object: any): SortBy;
    toJSON(message: SortBy): unknown;
    create(base?: DeepPartial<SortBy>): SortBy;
    fromPartial(object: DeepPartial<SortBy>): SortBy;
};
export declare const MetadataRequest: {
    encode(message: MetadataRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MetadataRequest;
    fromJSON(object: any): MetadataRequest;
    toJSON(message: MetadataRequest): unknown;
    create(base?: DeepPartial<MetadataRequest>): MetadataRequest;
    fromPartial(object: DeepPartial<MetadataRequest>): MetadataRequest;
};
export declare const PropertiesRequest: {
    encode(message: PropertiesRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): PropertiesRequest;
    fromJSON(object: any): PropertiesRequest;
    toJSON(message: PropertiesRequest): unknown;
    create(base?: DeepPartial<PropertiesRequest>): PropertiesRequest;
    fromPartial(object: DeepPartial<PropertiesRequest>): PropertiesRequest;
};
export declare const ObjectPropertiesRequest: {
    encode(message: ObjectPropertiesRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ObjectPropertiesRequest;
    fromJSON(object: any): ObjectPropertiesRequest;
    toJSON(message: ObjectPropertiesRequest): unknown;
    create(base?: DeepPartial<ObjectPropertiesRequest>): ObjectPropertiesRequest;
    fromPartial(object: DeepPartial<ObjectPropertiesRequest>): ObjectPropertiesRequest;
};
export declare const RefPropertiesRequest: {
    encode(message: RefPropertiesRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): RefPropertiesRequest;
    fromJSON(object: any): RefPropertiesRequest;
    toJSON(message: RefPropertiesRequest): unknown;
    create(base?: DeepPartial<RefPropertiesRequest>): RefPropertiesRequest;
    fromPartial(object: DeepPartial<RefPropertiesRequest>): RefPropertiesRequest;
};
export declare const Rerank: {
    encode(message: Rerank, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Rerank;
    fromJSON(object: any): Rerank;
    toJSON(message: Rerank): unknown;
    create(base?: DeepPartial<Rerank>): Rerank;
    fromPartial(object: DeepPartial<Rerank>): Rerank;
};
export declare const SearchReply: {
    encode(message: SearchReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SearchReply;
    fromJSON(object: any): SearchReply;
    toJSON(message: SearchReply): unknown;
    create(base?: DeepPartial<SearchReply>): SearchReply;
    fromPartial(object: DeepPartial<SearchReply>): SearchReply;
};
export declare const RerankReply: {
    encode(message: RerankReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): RerankReply;
    fromJSON(object: any): RerankReply;
    toJSON(message: RerankReply): unknown;
    create(base?: DeepPartial<RerankReply>): RerankReply;
    fromPartial(object: DeepPartial<RerankReply>): RerankReply;
};
export declare const GroupByResult: {
    encode(message: GroupByResult, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GroupByResult;
    fromJSON(object: any): GroupByResult;
    toJSON(message: GroupByResult): unknown;
    create(base?: DeepPartial<GroupByResult>): GroupByResult;
    fromPartial(object: DeepPartial<GroupByResult>): GroupByResult;
};
export declare const SearchResult: {
    encode(message: SearchResult, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SearchResult;
    fromJSON(object: any): SearchResult;
    toJSON(message: SearchResult): unknown;
    create(base?: DeepPartial<SearchResult>): SearchResult;
    fromPartial(object: DeepPartial<SearchResult>): SearchResult;
};
export declare const MetadataResult: {
    encode(message: MetadataResult, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MetadataResult;
    fromJSON(object: any): MetadataResult;
    toJSON(message: MetadataResult): unknown;
    create(base?: DeepPartial<MetadataResult>): MetadataResult;
    fromPartial(object: DeepPartial<MetadataResult>): MetadataResult;
};
export declare const PropertiesResult: {
    encode(message: PropertiesResult, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): PropertiesResult;
    fromJSON(object: any): PropertiesResult;
    toJSON(message: PropertiesResult): unknown;
    create(base?: DeepPartial<PropertiesResult>): PropertiesResult;
    fromPartial(object: DeepPartial<PropertiesResult>): PropertiesResult;
};
export declare const RefPropertiesResult: {
    encode(message: RefPropertiesResult, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): RefPropertiesResult;
    fromJSON(object: any): RefPropertiesResult;
    toJSON(message: RefPropertiesResult): unknown;
    create(base?: DeepPartial<RefPropertiesResult>): RefPropertiesResult;
    fromPartial(object: DeepPartial<RefPropertiesResult>): RefPropertiesResult;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
