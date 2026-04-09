/// <reference types="node" />
import { keyValueObj, DataType, ConsistencyLevelEnum, collectionNameReq, resStatusResponse, RANKER_TYPE, FunctionObject, VectorTypes, BFloat16Vector, Float16Vector, SparseVectorDic, SparseFloatVector, Int8Vector } from '../';
export declare enum HighlightType {
    Lexical = 0,
    Semantic = 1
}
export interface LexicalHighlighter {
    type: HighlightType.Lexical;
    pre_tags?: string[];
    post_tags?: string[];
    fragment_offset?: number;
    fragment_size?: number;
    num_of_fragments?: number;
    highlight_query?: {
        type: string;
        field: string;
        text: string;
    }[];
    highlight_search_text?: boolean;
}
export interface SemanticHighlighter {
    type: HighlightType.Semantic;
    queries: string[];
    input_fields: string[];
    pre_tags?: string[];
    post_tags?: string[];
    threshold?: number;
    highlight_only?: boolean;
    model_deployment_id?: string;
    max_client_batch_size?: number;
}
export type Highlighter = LexicalHighlighter | SemanticHighlighter;
export interface HighlightData {
    fragments: string[];
    scores: number[];
}
export type HighlightResult = Record<string, HighlightData>;
export interface SearchParam {
    anns_field: string;
    topk: string | number;
    metric_type: string;
    params: string;
    offset?: number;
    round_decimal?: number;
    ignore_growing?: boolean;
    group_by_field?: string;
    group_size?: number;
    strict_group_size?: boolean;
    hints?: string;
    [key: string]: any;
}
export type SearchText = string;
export type SearchEmbList = VectorTypes[];
export type SearchVector = VectorTypes;
export type SearchData = SearchVector | SearchText | SearchEmbList;
export interface SearchReq extends collectionNameReq {
    anns_field?: string;
    partition_names?: string[];
    expr?: string;
    exprValues?: keyValueObj;
    search_params: SearchParam;
    vectors?: SearchData | SearchData[];
    output_fields?: string[];
    travel_timestamp?: string;
    vector_type: DataType.BinaryVector | DataType.FloatVector;
    nq?: number;
    consistency_level?: ConsistencyLevelEnum;
    transformers?: OutputTransformers;
    ids?: number[] | string[];
    highlighter?: Highlighter;
}
export interface FunctionScore {
    functions: FunctionObject[];
    params: keyValueObj;
}
export interface SearchSimpleReq extends collectionNameReq {
    partition_names?: string[];
    anns_field?: string;
    data?: SearchData | SearchData[];
    vector?: SearchData | SearchData[];
    output_fields?: string[];
    limit?: number;
    topk?: number;
    offset?: number;
    filter?: string;
    expr?: string;
    exprValues?: keyValueObj;
    params?: keyValueObj;
    metric_type?: string;
    consistency_level?: ConsistencyLevelEnum;
    ignore_growing?: boolean;
    group_by_field?: string;
    group_size?: number;
    strict_group_size?: boolean;
    hints?: string;
    round_decimal?: number;
    transformers?: OutputTransformers;
    rerank?: RerankerObj | FunctionObject | FunctionScore;
    nq?: number;
    ids?: number[] | string[];
    highlighter?: Highlighter;
}
export type HybridSearchSingleReq = Pick<SearchParam, 'anns_field' | 'ignore_growing' | 'group_by_field'> & {
    data: SearchData;
    expr?: string;
    exprValues?: keyValueObj;
    params?: keyValueObj;
    transformers?: OutputTransformers;
};
export interface SearchIteratorReq extends Omit<SearchSimpleReq, 'vectors' | 'offset' | 'limit' | 'topk'> {
    limit?: number;
    batchSize: number;
    external_filter_fn?: (row: SearchResultData) => boolean;
}
export type RerankerObj = {
    strategy: RANKER_TYPE | string;
    params: keyValueObj;
};
export type HybridSearchReq = Omit<SearchSimpleReq, 'data' | 'vector' | 'vectors' | 'anns_field' | 'expr' | 'exprValues'> & {
    data: HybridSearchSingleReq[];
    rerank?: RerankerObj | FunctionObject | FunctionScore;
};
export interface SearchRes extends resStatusResponse {
    results: {
        top_k: number;
        fields_data: {
            type: string;
            field_name: string;
            field_id: number;
            field: 'vectors' | 'scalars';
            vectors?: {
                dim: string;
                data: 'float_vector' | 'binary_vector';
                float_vector?: {
                    data: number[];
                };
                binary_vector?: Buffer;
            };
            scalars: {
                [x: string]: any;
                data: string;
            };
        }[];
        scores: number[];
        ids: {
            int_id?: {
                data: number[];
            };
            str_id?: {
                data: string[];
            };
            id_field: 'int_id' | 'str_id';
        };
        num_queries: number;
        topks: number[];
        output_fields: string[];
        group_by_field_value: string;
        recalls: number[];
        search_iterator_v2_results?: Record<string, any>;
        _search_iterator_v2_results?: string;
        all_search_count?: number;
        highlight_results?: {
            field_name: string;
            datas: HighlightData[];
        }[];
    };
    collection_name: string;
    session_ts: number;
}
export type OutputTransformers = {
    [DataType.BFloat16Vector]?: (bf16bytes: Uint8Array) => BFloat16Vector;
    [DataType.Float16Vector]?: (f16: Uint8Array) => Float16Vector;
    [DataType.SparseFloatVector]?: (sparse: SparseVectorDic) => SparseFloatVector;
    [DataType.Int8Vector]?: (int8Vector: Int8Array) => Int8Vector;
};
export type DetermineResultsType<T extends Record<string, any>> = T['vectors'] extends [SearchData] ? SearchResultData[] : T['vectors'] extends SearchData[] ? SearchResultData[][] : T['vector'] extends SearchData ? SearchResultData[] : T['data'] extends SearchData ? SearchResultData[] : T['data'] extends SearchData[] ? SearchResultData[][] : SearchResultData[];
export interface SearchResultData {
    [x: string]: any;
    score: number;
    id: string;
    highlight?: HighlightResult;
}
export interface SearchResults<T extends SearchReq | SearchSimpleReq | HybridSearchReq> extends resStatusResponse {
    results: DetermineResultsType<T>;
    recalls: number[];
    session_ts: number;
    collection_name: string;
    all_search_count?: number;
    search_iterator_v2_results?: Record<string, any>;
    _search_iterator_v2_results?: string;
}
