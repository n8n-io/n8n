import _m0 from "protobufjs/minimal.js";
import { Vectors } from "./base.js";
export declare const protobufPackage = "weaviate.v1";
export declare enum CombinationMethod {
    COMBINATION_METHOD_UNSPECIFIED = 0,
    COMBINATION_METHOD_TYPE_SUM = 1,
    COMBINATION_METHOD_TYPE_MIN = 2,
    COMBINATION_METHOD_TYPE_AVERAGE = 3,
    COMBINATION_METHOD_TYPE_RELATIVE_SCORE = 4,
    COMBINATION_METHOD_TYPE_MANUAL = 5,
    UNRECOGNIZED = -1
}
export declare function combinationMethodFromJSON(object: any): CombinationMethod;
export declare function combinationMethodToJSON(object: CombinationMethod): string;
export interface WeightsForTarget {
    target: string;
    weight: number;
}
export interface Targets {
    targetVectors: string[];
    combination: CombinationMethod;
    weightsForTargets: WeightsForTarget[];
}
export interface VectorForTarget {
    name: string;
    /**
     * deprecated in 1.29.0 - use vectors
     *
     * @deprecated
     */
    vectorBytes: Uint8Array;
    vectors: Vectors[];
}
export interface SearchOperatorOptions {
    operator: SearchOperatorOptions_Operator;
    minimumOrTokensMatch?: number | undefined;
}
export declare enum SearchOperatorOptions_Operator {
    OPERATOR_UNSPECIFIED = 0,
    OPERATOR_OR = 1,
    OPERATOR_AND = 2,
    UNRECOGNIZED = -1
}
export declare function searchOperatorOptions_OperatorFromJSON(object: any): SearchOperatorOptions_Operator;
export declare function searchOperatorOptions_OperatorToJSON(object: SearchOperatorOptions_Operator): string;
export interface Hybrid {
    query: string;
    properties: string[];
    /**
     * protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED
     *
     * @deprecated
     */
    vector: number[];
    alpha: number;
    fusionType: Hybrid_FusionType;
    /**
     * deprecated in 1.29.0 - use vectors
     *
     * @deprecated
     */
    vectorBytes: Uint8Array;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    /** targets in msg is ignored and should not be set for hybrid */
    nearText: NearTextSearch | undefined;
    /** same as above. Use the target vector in the hybrid message */
    nearVector: NearVector | undefined;
    targets: Targets | undefined;
    bm25SearchOperator?: SearchOperatorOptions | undefined;
    vectorDistance?: number | undefined;
    vectors: Vectors[];
}
export declare enum Hybrid_FusionType {
    FUSION_TYPE_UNSPECIFIED = 0,
    FUSION_TYPE_RANKED = 1,
    FUSION_TYPE_RELATIVE_SCORE = 2,
    UNRECOGNIZED = -1
}
export declare function hybrid_FusionTypeFromJSON(object: any): Hybrid_FusionType;
export declare function hybrid_FusionTypeToJSON(object: Hybrid_FusionType): string;
export interface NearVector {
    /**
     * protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED
     *
     * @deprecated
     */
    vector: number[];
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.29.0 - use vectors
     *
     * @deprecated
     */
    vectorBytes: Uint8Array;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
    /**
     * deprecated in 1.26.2 - use vector_for_targets
     *
     * @deprecated
     */
    vectorPerTarget: {
        [key: string]: Uint8Array;
    };
    vectorForTargets: VectorForTarget[];
    vectors: Vectors[];
}
export interface NearVector_VectorPerTargetEntry {
    key: string;
    value: Uint8Array;
}
export interface NearObject {
    id: string;
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface NearTextSearch {
    /** protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED */
    query: string[];
    certainty?: number | undefined;
    distance?: number | undefined;
    moveTo?: NearTextSearch_Move | undefined;
    moveAway?: NearTextSearch_Move | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface NearTextSearch_Move {
    force: number;
    concepts: string[];
    uuids: string[];
}
export interface NearImageSearch {
    image: string;
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface NearAudioSearch {
    audio: string;
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface NearVideoSearch {
    video: string;
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface NearDepthSearch {
    depth: string;
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface NearThermalSearch {
    thermal: string;
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface NearIMUSearch {
    imu: string;
    certainty?: number | undefined;
    distance?: number | undefined;
    /**
     * deprecated in 1.26 - use targets
     *
     * @deprecated
     */
    targetVectors: string[];
    targets: Targets | undefined;
}
export interface BM25 {
    query: string;
    properties: string[];
    searchOperator?: SearchOperatorOptions | undefined;
}
export declare const WeightsForTarget: {
    encode(message: WeightsForTarget, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): WeightsForTarget;
    fromJSON(object: any): WeightsForTarget;
    toJSON(message: WeightsForTarget): unknown;
    create(base?: DeepPartial<WeightsForTarget>): WeightsForTarget;
    fromPartial(object: DeepPartial<WeightsForTarget>): WeightsForTarget;
};
export declare const Targets: {
    encode(message: Targets, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Targets;
    fromJSON(object: any): Targets;
    toJSON(message: Targets): unknown;
    create(base?: DeepPartial<Targets>): Targets;
    fromPartial(object: DeepPartial<Targets>): Targets;
};
export declare const VectorForTarget: {
    encode(message: VectorForTarget, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): VectorForTarget;
    fromJSON(object: any): VectorForTarget;
    toJSON(message: VectorForTarget): unknown;
    create(base?: DeepPartial<VectorForTarget>): VectorForTarget;
    fromPartial(object: DeepPartial<VectorForTarget>): VectorForTarget;
};
export declare const SearchOperatorOptions: {
    encode(message: SearchOperatorOptions, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SearchOperatorOptions;
    fromJSON(object: any): SearchOperatorOptions;
    toJSON(message: SearchOperatorOptions): unknown;
    create(base?: DeepPartial<SearchOperatorOptions>): SearchOperatorOptions;
    fromPartial(object: DeepPartial<SearchOperatorOptions>): SearchOperatorOptions;
};
export declare const Hybrid: {
    encode(message: Hybrid, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Hybrid;
    fromJSON(object: any): Hybrid;
    toJSON(message: Hybrid): unknown;
    create(base?: DeepPartial<Hybrid>): Hybrid;
    fromPartial(object: DeepPartial<Hybrid>): Hybrid;
};
export declare const NearVector: {
    encode(message: NearVector, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearVector;
    fromJSON(object: any): NearVector;
    toJSON(message: NearVector): unknown;
    create(base?: DeepPartial<NearVector>): NearVector;
    fromPartial(object: DeepPartial<NearVector>): NearVector;
};
export declare const NearVector_VectorPerTargetEntry: {
    encode(message: NearVector_VectorPerTargetEntry, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearVector_VectorPerTargetEntry;
    fromJSON(object: any): NearVector_VectorPerTargetEntry;
    toJSON(message: NearVector_VectorPerTargetEntry): unknown;
    create(base?: DeepPartial<NearVector_VectorPerTargetEntry>): NearVector_VectorPerTargetEntry;
    fromPartial(object: DeepPartial<NearVector_VectorPerTargetEntry>): NearVector_VectorPerTargetEntry;
};
export declare const NearObject: {
    encode(message: NearObject, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearObject;
    fromJSON(object: any): NearObject;
    toJSON(message: NearObject): unknown;
    create(base?: DeepPartial<NearObject>): NearObject;
    fromPartial(object: DeepPartial<NearObject>): NearObject;
};
export declare const NearTextSearch: {
    encode(message: NearTextSearch, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearTextSearch;
    fromJSON(object: any): NearTextSearch;
    toJSON(message: NearTextSearch): unknown;
    create(base?: DeepPartial<NearTextSearch>): NearTextSearch;
    fromPartial(object: DeepPartial<NearTextSearch>): NearTextSearch;
};
export declare const NearTextSearch_Move: {
    encode(message: NearTextSearch_Move, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearTextSearch_Move;
    fromJSON(object: any): NearTextSearch_Move;
    toJSON(message: NearTextSearch_Move): unknown;
    create(base?: DeepPartial<NearTextSearch_Move>): NearTextSearch_Move;
    fromPartial(object: DeepPartial<NearTextSearch_Move>): NearTextSearch_Move;
};
export declare const NearImageSearch: {
    encode(message: NearImageSearch, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearImageSearch;
    fromJSON(object: any): NearImageSearch;
    toJSON(message: NearImageSearch): unknown;
    create(base?: DeepPartial<NearImageSearch>): NearImageSearch;
    fromPartial(object: DeepPartial<NearImageSearch>): NearImageSearch;
};
export declare const NearAudioSearch: {
    encode(message: NearAudioSearch, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearAudioSearch;
    fromJSON(object: any): NearAudioSearch;
    toJSON(message: NearAudioSearch): unknown;
    create(base?: DeepPartial<NearAudioSearch>): NearAudioSearch;
    fromPartial(object: DeepPartial<NearAudioSearch>): NearAudioSearch;
};
export declare const NearVideoSearch: {
    encode(message: NearVideoSearch, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearVideoSearch;
    fromJSON(object: any): NearVideoSearch;
    toJSON(message: NearVideoSearch): unknown;
    create(base?: DeepPartial<NearVideoSearch>): NearVideoSearch;
    fromPartial(object: DeepPartial<NearVideoSearch>): NearVideoSearch;
};
export declare const NearDepthSearch: {
    encode(message: NearDepthSearch, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearDepthSearch;
    fromJSON(object: any): NearDepthSearch;
    toJSON(message: NearDepthSearch): unknown;
    create(base?: DeepPartial<NearDepthSearch>): NearDepthSearch;
    fromPartial(object: DeepPartial<NearDepthSearch>): NearDepthSearch;
};
export declare const NearThermalSearch: {
    encode(message: NearThermalSearch, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearThermalSearch;
    fromJSON(object: any): NearThermalSearch;
    toJSON(message: NearThermalSearch): unknown;
    create(base?: DeepPartial<NearThermalSearch>): NearThermalSearch;
    fromPartial(object: DeepPartial<NearThermalSearch>): NearThermalSearch;
};
export declare const NearIMUSearch: {
    encode(message: NearIMUSearch, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NearIMUSearch;
    fromJSON(object: any): NearIMUSearch;
    toJSON(message: NearIMUSearch): unknown;
    create(base?: DeepPartial<NearIMUSearch>): NearIMUSearch;
    fromPartial(object: DeepPartial<NearIMUSearch>): NearIMUSearch;
};
export declare const BM25: {
    encode(message: BM25, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BM25;
    fromJSON(object: any): BM25;
    toJSON(message: BM25): unknown;
    create(base?: DeepPartial<BM25>): BM25;
    fromPartial(object: DeepPartial<BM25>): BM25;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
