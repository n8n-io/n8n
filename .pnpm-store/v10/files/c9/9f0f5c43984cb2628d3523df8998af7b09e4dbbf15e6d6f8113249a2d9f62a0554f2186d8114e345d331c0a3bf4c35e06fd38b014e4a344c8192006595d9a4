import { Root } from 'protobufjs';
import { KeyValuePair, DescribeCollectionResponse, SearchReq, SearchSimpleReq, SearchParam, HybridSearchReq, DslType, SearchRes, ConsistencyLevelEnum, RerankerObj, OutputTransformers, SearchData, FieldSchema, keyValueObj, FunctionObject, FunctionScore, Highlighter } from '../';
/**
 * Builds search parameters based on the provided data.
 * @param data - The data object containing search parameters.
 * @returns The search parameters in key-value format.
 */
export declare const buildSearchParams: (data: Omit<SearchSimpleReq, 'collection_name'>, anns_field: string) => SearchParam;
/**
 * Creates a RRFRanker object with the specified value of k.
 * @param k - The value of k used in the RRFRanker strategy.
 * @returns An object representing the RRFRanker strategy with the specified value of k.
 */
export declare const RRFRanker: (k?: number) => RerankerObj;
/**
 * Creates a weighted ranker object.
 * @param weights - An array of numbers representing the weights.
 * @returns The weighted ranker object.
 */
export declare const WeightedRanker: (weights: number[]) => RerankerObj;
/**
 * Converts the rerank parameters object to a format suitable for API requests.
 * @param rerank - The rerank parameters object.
 * @returns The converted rerank parameters object.
 */
export declare const convertRerankParams: (rerank: RerankerObj) => any;
type FormatedSearchRequest = {
    collection_name: string;
    partition_names: string[];
    output_fields: string[];
    nq?: number;
    dsl?: string;
    dsl_type?: DslType;
    placeholder_group?: Uint8Array;
    ids?: {
        int_id?: {
            data: number[];
        };
        str_id?: {
            data: string[];
        };
    };
    search_params?: KeyValuePair[];
    consistency_level: ConsistencyLevelEnum;
    expr?: string;
    expr_template_values?: keyValueObj;
    rank_params?: KeyValuePair[];
    function_score?: any;
    requests?: FormatedSearchRequest[];
    highlighter?: {
        type: number;
        params: KeyValuePair[];
    };
};
/**
 * Serializes a Highlighter object into the gRPC Highlighter message format.
 * @param highlighter - The highlighter configuration.
 * @returns The serialized highlighter object with type and params as KeyValuePair[].
 */
export declare const buildHighlighter: (highlighter: Highlighter) => {
    type: number;
    params: KeyValuePair[];
};
/**
 * Creates function_score object for search requests
 * @param isRerankFunction - Whether the rerank is a function object
 * @param searchHybridReq - The hybrid search request
 * @param schemaTypes - Schema types for creating function objects
 * @returns Function score object or empty object
 */
export declare const createFunctionScore: (rerank?: RerankerObj | FunctionObject | FunctionScore) => {
    function_score?: undefined;
} | {
    function_score: {
        functions: {
            input_field_names: string[];
            output_field_names: string[];
            params: KeyValuePair<string, string | number>[];
            name: string;
            description?: string | undefined;
            type: import("../").FunctionType;
        }[];
        params: KeyValuePair<string, string | number>[];
    };
};
/**
 * This method is used to build search request for a given data.
 * It first fetches the collection info and then constructs the search request based on the data type.
 * It also creates search vectors and a placeholder group for the search.
 *
 * @param {SearchReq | SearchSimpleReq | HybridSearchReq} data - The data for which to build the search request.
 * @param {DescribeCollectionResponse} collectionInfo - The collection information.
 * @param {Root} milvusProto - The milvus protocol object.
 * @returns {Object} An object containing the search requests and search vectors.
 * @returns {Object} return.params - The search requests used in the operation.
 * @returns {string} return.params.collection_name - The name of the collection.
 * @returns {string[]} return.params.partition_names - The partition names.
 * @returns {string[]} return.params.output_fields - The output fields.
 * @returns {number} return.params.nq - The number of query vectors.
 * @returns {string} return.params.dsl - The domain specific language.
 * @returns {string} return.params.dsl_type - The type of the domain specific language.
 * @returns {Uint8Array} return.params.placeholder_group - The placeholder group.
 * @returns {Object} return.params.search_params - The search parameters.
 * @returns {string} return.params.consistency_level - The consistency level.
 * @returns {Number[][]} return.searchVectors - The search vectors used in the operation.
 * @returns {number} return.round_decimal - The score precision.
 */
export declare const buildSearchRequest: (params: SearchReq | SearchSimpleReq | HybridSearchReq, collectionInfo: DescribeCollectionResponse, milvusProto: Root) => {
    nq: number | undefined;
    round_decimal?: number | undefined;
    isHybridSearch: boolean;
    request: {
        highlighter: {
            type: number;
            params: KeyValuePair[];
        };
        rank_params: KeyValuePair<string, string | number>[];
        function_score?: undefined;
        collection_name: string;
        partition_names: string[] | undefined;
        requests: FormatedSearchRequest[];
        output_fields: string[];
        consistency_level: ConsistencyLevelEnum;
    } | {
        highlighter?: undefined;
        rank_params: KeyValuePair<string, string | number>[];
        function_score?: undefined;
        collection_name: string;
        partition_names: string[] | undefined;
        requests: FormatedSearchRequest[];
        output_fields: string[];
        consistency_level: ConsistencyLevelEnum;
    } | {
        highlighter: {
            type: number;
            params: KeyValuePair[];
        };
        rank_params: KeyValuePair<string, string | number>[];
        function_score: {
            functions: {
                input_field_names: string[];
                output_field_names: string[];
                params: KeyValuePair<string, string | number>[];
                name: string;
                description?: string | undefined;
                type: import("../").FunctionType;
            }[];
            params: KeyValuePair<string, string | number>[];
        };
        collection_name: string;
        partition_names: string[] | undefined;
        requests: FormatedSearchRequest[];
        output_fields: string[];
        consistency_level: ConsistencyLevelEnum;
    } | {
        highlighter?: undefined;
        rank_params: KeyValuePair<string, string | number>[];
        function_score: {
            functions: {
                input_field_names: string[];
                output_field_names: string[];
                params: KeyValuePair<string, string | number>[];
                name: string;
                description?: string | undefined;
                type: import("../").FunctionType;
            }[];
            params: KeyValuePair<string, string | number>[];
        };
        collection_name: string;
        partition_names: string[] | undefined;
        requests: FormatedSearchRequest[];
        output_fields: string[];
        consistency_level: ConsistencyLevelEnum;
    } | {
        highlighter?: {
            type: number;
            params: KeyValuePair[];
        } | undefined;
        function_score?: any;
        collection_name: string;
        partition_names: string[];
        output_fields: string[];
        nq?: number | undefined;
        dsl?: string | undefined;
        dsl_type?: DslType | undefined;
        placeholder_group?: Uint8Array | undefined;
        ids?: {
            int_id?: {
                data: number[];
            } | undefined;
            str_id?: {
                data: string[];
            } | undefined;
        } | undefined;
        search_params?: KeyValuePair<string, string | number>[] | undefined;
        consistency_level: ConsistencyLevelEnum;
        expr?: string | undefined;
        expr_template_values?: keyValueObj | undefined;
        rank_params?: KeyValuePair<string, string | number>[] | undefined;
        requests?: FormatedSearchRequest[] | undefined;
    };
};
/**
 * Formats the search results returned by Milvus into row data for easier use.
 *
 * @param {SearchRes} searchRes - The search results returned by Milvus.
 * @param {Object} options - The options for formatting the search results.
 * @param {number} options.round_decimal - The number of decimal places to which to round the scores.
 *
 * @returns {any[]} The formatted search results.
 *
 */
export declare const formatSearchResult: (searchRes: SearchRes, options: {
    round_decimal: number;
    transformers?: OutputTransformers;
}) => any[];
/**
 * Formats the search vector to match a specific data type.
 * It should be an array, if the search data is a single vector, return a single array, if the search data is a array of vectors, return the array
 * @param {SearchData[]} searchVector - The search vector or array of vectors to be formatted.
 * @param {FieldSchema} field - The field schema.
 * @returns {[SearchData] | SearchData[]}
 */
export declare const formatSearchData: (searchData: SearchData | SearchData[], field: FieldSchema) => [SearchData] | SearchData[];
type TemplateValue = {
    bool_val: boolean;
} | {
    int64_val: number;
} | {
    float_val: number;
} | {
    string_val: string;
} | {
    array_val: TemplateArrayValue;
};
type TemplateArrayValue = {
    bool_data: {
        data: boolean[];
    };
} | {
    long_data: {
        data: number[];
    };
} | {
    double_data: {
        data: number[];
    };
} | {
    string_data: {
        data: string[];
    };
} | {
    json_data: {
        data: any[];
    };
} | {
    array_data: {
        data: TemplateArrayValue[];
    };
};
export declare const formatExprValues: (exprValues: Record<string, any>) => Record<string, TemplateValue>;
export {};
