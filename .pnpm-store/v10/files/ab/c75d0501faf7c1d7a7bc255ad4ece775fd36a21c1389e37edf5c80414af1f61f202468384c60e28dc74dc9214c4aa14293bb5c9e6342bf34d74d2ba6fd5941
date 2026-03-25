import { Move } from './nearText.js';
export interface HybridArgs {
    alpha?: number;
    query: string;
    vector?: number[];
    properties?: string[];
    targetVectors?: string[];
    fusionType?: FusionType;
    searches?: HybridSubSearch[];
    maxVectorDistance?: number;
}
export interface NearTextSubSearch {
    concepts: string[];
    certainty?: number;
    distance?: number;
    moveAwayFrom?: Move;
    moveTo?: Move;
}
export interface NearVectorSubSearch {
    vector: number[];
    certainty?: number;
    distance?: number;
    targetVectors?: string[];
}
export interface HybridSubSearch {
    nearText?: NearTextSubSearch;
    nearVector?: NearVectorSubSearch;
}
export declare enum FusionType {
    rankedFusion = "rankedFusion",
    relativeScoreFusion = "relativeScoreFusion"
}
export default class GraphQLHybrid {
    private alpha?;
    private query;
    private vector?;
    private properties?;
    private targetVectors?;
    private fusionType?;
    private searches?;
    private maxVectorDistance?;
    constructor(args: HybridArgs);
    toString(): string;
}
