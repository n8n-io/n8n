import { Type, Root } from 'protobufjs';
import { KeyValuePair, FieldType, DataTypeMap, DataType, CreateCollectionReq, DescribeCollectionResponse, RowData, _Field, FieldData, SearchReq, SearchSimpleReq, SearchParam, HybridSearchSingleReq, HybridSearchReq, DslType, SearchRes, ConsistencyLevelEnum, RerankerObj, InsertTransformers, OutputTransformers, SearchDataType, FieldSchema, SearchMultipleDataType, TypeParamKey, keyValueObj } from '../';
/**
 * Formats key-value data based on the provided keys.
 * @param {KeyValuePair[]} data - The array of key-value pairs.
 * @param {string[]} keys - The keys to include in the formatted result.
 * @returns {Object} - The formatted key-value data as an object.
 */
export declare const formatKeyValueData: (data: KeyValuePair[], keys: string[]) => {
    [x: string]: any;
};
/**
 * parse {row_count:4} to [{key:"row_count",value:"4"}]
 * @param data Object
 * @returns {KeyValuePair[]}
 */
export declare const parseToKeyValue: (data?: {
    [x: string]: any;
} | undefined, valueToString?: boolean) => KeyValuePair[];
/**
 *
 * @param number Number like 3.1738998889923096
 * @param precision The precision you want, if is 3 will return 3.173 and If is 2 will return 3.17
 * @returns
 */
export declare const formatNumberPrecision: (number: number, precision: number) => number;
/**
 * Checks if the given time parameter is valid.
 *
 * @param ts - The time parameter to be checked.
 * @returns A boolean value indicating whether the time parameter is valid or not.
 */
export declare const checkTimeParam: (ts: any) => boolean;
/**
 * Converts a hybrid timestamp to Unix time.
 * @param hybridts - The hybrid timestamp to convert.
 * @returns The Unix time representation of the hybrid timestamp.
 * @throws An error if the hybridts parameter fails the time parameter check.
 */
export declare const hybridtsToUnixtime: (hybridts: bigint | string) => string;
/**
 * Converts a Unix timestamp to a hybrid timestamp.
 * @param unixtime - The Unix timestamp to convert.
 * @returns The hybrid timestamp as a string.
 * @throws An error if the unixtime parameter fails the check.
 */
export declare const unixtimeToHybridts: (unixtime: bigint | string) => string;
/**
 * Converts a JavaScript Date object to a hybridts timestamp.
 * @param datetime - The JavaScript Date object to be converted.
 * @returns The hybridts timestamp.
 * @throws An error if the input is not a valid Date object.
 */
export declare const datetimeToHybrids: (datetime: Date) => string;
/**
 * Converts a string to base64 encoding.
 * @param str The string to convert.
 * @returns The base64 encoded string.
 */
export declare const stringToBase64: (str: string) => string;
/**
 * Formats the given address by removing the http or https prefix and appending the default Milvus port if necessary.
 * @param address The address to format.
 * @returns The formatted address.
 */
export declare const formatAddress: (address: string) => string;
/**
 * Assigns specified properties from the `field` object to `type_params` within the `FieldType` object.
 * Converts properties to strings, serializing objects as JSON strings if needed, then removes them from `field`.
 *
 * @param field - The `FieldType` object to modify.
 * @param typeParamKeys - Keys to assign to `type_params` if present in `field`.
 * @returns The modified `FieldType` object.
 */
export declare const assignTypeParams: (field: FieldType, typeParamKeys?: TypeParamKey[]) => FieldType;
/**
 * Parses a time token and returns the corresponding number of milliseconds.
 *
 * @param {string} token - The time token to parse.
 * @returns {number} The number of milliseconds corresponding to the time token.
 * @throws {Error} If the time token is invalid.
 */
export declare const parseTimeToken: (token: string) => number;
/**
 * Extracts the method name from a URL path.
 *
 * @param {string} query - The URL path to extract the method name from.
 * @returns {string} The extracted method name.
 */
export declare const extractMethodName: (query: string) => string;
/**
 * Converts a `key` of type `keyof typeof DataTypeMap | DataType` to a `DataType`.
 *
 * @param {keyof typeof DataTypeMap | DataType} key - The key to convert.
 * @returns {DataType} The converted `DataType`.
 */
export declare const convertToDataType: (key: keyof typeof DataTypeMap | DataType) => DataType;
/**dd
 * Creates a deep copy of the provided object using JSON.parse and JSON.stringify.
 * Note that this function is not efficient and may cause performance issues if used with large or complex objects. It also does not handle cases where the object being cloned contains functions or prototype methods.
 *
 * @typeparam T The type of object being cloned.
 * @param {T} obj - The object to clone.
 * @returns {T} A new object with the same properties and values as the original.
 */
export declare const cloneObj: <T>(obj: T) => T;
/**
 * Formats the input data into a request payload for creating a collection.
 *
 * @param {CreateCollectionReq} data - The input data for creating a collection.
 * @param {Type} schemaType - The schema type for the collection.
 * @returns {Object} The formatted request payload.
 */
export declare const formatCollectionSchema: (data: CreateCollectionReq, schemaTypes: Record<string, Type>) => {
    [k: string]: any;
};
/**
 * Formats a `DescribeCollectionResponse` object by adding a `dataType` property to each field object in its `schema` array.
 * The `dataType` property represents the numerical value of the `data_type` property.
 *
 * @param {DescribeCollectionResponse} data - The `DescribeCollectionResponse` object to format.
 * @returns {DescribeCollectionResponse} A new `DescribeCollectionResponse` object with the updated `dataType` properties.
 */
export declare const formatDescribedCol: (data: DescribeCollectionResponse) => DescribeCollectionResponse;
/**
 * Builds a dynamic row object by separating the input data into non-dynamic fields and a dynamic field.
 *
 * @param {RowData} rowData - The input data object.
 * @param {Map<string, Field>} fieldMap - A map of field names to field objects.
 * @param {string} dynamicFieldName - The name of the dynamic field.
 * @returns {RowData} The generated dynamic row object.
 */
export declare const buildDynamicRow: (rowData: RowData, fieldMap: Map<string, _Field>, dynamicFieldName: string, functionOutputFields: string[]) => RowData;
/**
 * create a data map for each fields, resolve grpc data format
 * If the field is a vector, split the data into chunks of the appropriate size.
 * If the field is a scalar, decode the JSON/array data if necessary.
 */
export declare const buildFieldDataMap: (fields_data: any[], transformers?: OutputTransformers) => Map<string, RowData[]>;
/**
 * Generates an authentication string based on the provided credentials.
 *
 * @param {Object} data - An object containing the authentication credentials.
 * @param {string} [data.username] - The username to use for authentication.
 * @param {string} [data.password] - The password to use for authentication.
 * @param {string} [data.token] - The token to use for authentication.
 * @returns {string} The authentication string.
 */
export declare const getAuthString: (data: {
    username?: string;
    password?: string;
    token?: string;
}) => string;
/**
 * Builds the field data for a given row and column.
 *
 * @param {RowData} rowData - The data for the row.
 * @param {Field} column - The column information.
 * @returns {FieldData} The field data for the row and column.
 */
export declare const buildFieldData: (rowData: RowData, field: _Field, transformers?: InsertTransformers) => FieldData;
/**
 * Builds search parameters based on the provided data.
 * @param data - The data object containing search parameters.
 * @returns The search parameters in key-value format.
 */
export declare const buildSearchParams: (data: SearchSimpleReq | (HybridSearchSingleReq & HybridSearchReq), anns_field: string) => SearchParam;
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
    search_params?: KeyValuePair[];
    consistency_level: ConsistencyLevelEnum;
    expr?: string;
    expr_template_values?: keyValueObj;
    rank_params?: KeyValuePair[];
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
export declare const buildSearchRequest: (data: SearchReq | SearchSimpleReq | HybridSearchReq, collectionInfo: DescribeCollectionResponse, milvusProto: Root) => {
    isHybridSearch: boolean;
    request: FormatedSearchRequest;
    nq: number | undefined;
    round_decimal: number;
    expr_template_values: Record<string, TemplateValue> | undefined;
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
 * @param {SearchDataType[]} searchVector - The search vector or array of vectors to be formatted.
 * @param {DataType} dataType - The specified data type.
 * @returns {VectorTypes[]} The formatted search vector or array of vectors.
 */
export declare const formatSearchData: (searchData: SearchDataType | SearchMultipleDataType, field: FieldSchema) => SearchMultipleDataType;
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
