"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatExprValues = exports.formatSearchData = exports.formatSearchResult = exports.buildSearchRequest = exports.createFunctionScore = exports.buildHighlighter = exports.convertRerankParams = exports.WeightedRanker = exports.RRFRanker = exports.buildSearchParams = void 0;
const __1 = require("../");
/**
 * Type guard to check if an object is a FunctionScore
 * @param obj - The object to check
 * @returns True if the object is a FunctionScore
 */
const isFunctionScore = (obj) => {
    return (obj &&
        typeof obj === 'object' &&
        Array.isArray(obj.functions) &&
        typeof obj.params === 'object' &&
        obj.params !== null);
};
/**
 * Builds search parameters based on the provided data.
 * @param data - The data object containing search parameters.
 * @returns The search parameters in key-value format.
 */
const buildSearchParams = (data, anns_field) => {
    var _a, _b, _c, _d, _e, _f;
    // create search params
    const search_params = {
        anns_field: data.anns_field || anns_field,
        params: JSON.stringify((_a = data.params) !== null && _a !== void 0 ? _a : {}),
        topk: (_c = (_b = data.limit) !== null && _b !== void 0 ? _b : data.topk) !== null && _c !== void 0 ? _c : __1.DEFAULT_TOPK,
        offset: (_d = data.offset) !== null && _d !== void 0 ? _d : 0,
        metric_type: (_e = data.metric_type) !== null && _e !== void 0 ? _e : '',
        ignore_growing: (_f = data.ignore_growing) !== null && _f !== void 0 ? _f : false,
    };
    // if group_by_field is set
    // reminder: never add this kind of key again, just put params in the params object
    if (data.group_by_field) {
        search_params.group_by_field = data.group_by_field;
    }
    if (data.strict_group_size) {
        search_params.strict_group_size = data.strict_group_size;
    }
    if (data.group_size) {
        search_params.group_size = data.group_size;
    }
    if (data.hints) {
        search_params.hints = data.hints;
    }
    // data.params -> search_params
    for (let key in data.params) {
        search_params[key] = data.params[key];
    }
    return search_params;
};
exports.buildSearchParams = buildSearchParams;
/**
 * Creates a RRFRanker object with the specified value of k.
 * @param k - The value of k used in the RRFRanker strategy.
 * @returns An object representing the RRFRanker strategy with the specified value of k.
 */
const RRFRanker = (k = 60) => {
    return {
        strategy: __1.RANKER_TYPE.RRF,
        params: {
            k,
        },
    };
};
exports.RRFRanker = RRFRanker;
/**
 * Creates a weighted ranker object.
 * @param weights - An array of numbers representing the weights.
 * @returns The weighted ranker object.
 */
const WeightedRanker = (weights) => {
    return {
        strategy: __1.RANKER_TYPE.WEIGHTED,
        params: {
            weights,
        },
    };
};
exports.WeightedRanker = WeightedRanker;
/**
 * Converts the rerank parameters object to a format suitable for API requests.
 * @param rerank - The rerank parameters object.
 * @returns The converted rerank parameters object.
 */
const convertRerankParams = (rerank) => {
    const r = (0, __1.cloneObj)(rerank);
    r.params = JSON.stringify(r.params);
    return r;
};
exports.convertRerankParams = convertRerankParams;
/**
 * Serializes a Highlighter object into the gRPC Highlighter message format.
 * @param highlighter - The highlighter configuration.
 * @returns The serialized highlighter object with type and params as KeyValuePair[].
 */
const buildHighlighter = (highlighter) => {
    const { type } = highlighter, rest = __rest(highlighter, ["type"]);
    return { type, params: (0, __1.parseToKeyValue)(rest, true) };
};
exports.buildHighlighter = buildHighlighter;
/**
 * Creates function_score object for search requests
 * @param isRerankFunction - Whether the rerank is a function object
 * @param searchHybridReq - The hybrid search request
 * @param schemaTypes - Schema types for creating function objects
 * @returns Function score object or empty object
 */
const createFunctionScore = (rerank) => {
    if (!rerank) {
        return {};
    }
    if (isFunctionScore(rerank)) {
        const functionScore = rerank;
        return {
            function_score: {
                functions: functionScore.functions.map(func => (Object.assign(Object.assign({}, func), { input_field_names: func.input_field_names || [], output_field_names: func.output_field_names || [], params: (0, __1.parseToKeyValue)(func.params, true) }))),
                params: (0, __1.parseToKeyValue)(functionScore.params, true),
            },
        };
    }
    if (typeof rerank === 'object' && 'type' in rerank) {
        const functionObject = rerank;
        return {
            function_score: {
                functions: [
                    Object.assign(Object.assign({}, functionObject), { input_field_names: functionObject.input_field_names || [], output_field_names: functionObject.output_field_names || [], params: (0, __1.parseToKeyValue)(functionObject.params, true) }),
                ],
                params: [],
            },
        };
    }
    return {};
};
exports.createFunctionScore = createFunctionScore;
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
const buildSearchRequest = (params, collectionInfo, milvusProto) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // type cast
    const searchReq = params;
    const searchHybridReq = params;
    const searchSimpleReq = params;
    const searchSimpleOrHybridReq = params;
    // Initialize requests array
    const requests = [];
    // detect if the request is hybrid search request
    const isHybridSearch = !!(searchHybridReq.data &&
        searchHybridReq.data.length &&
        typeof searchHybridReq.data[0] === 'object' &&
        searchHybridReq.data[0].anns_field);
    // output fields(reference fields)
    const default_output_fields = ['*'];
    // build user search requests
    const userRequests = isHybridSearch
        ? searchHybridReq.data.map(d => (Object.assign(Object.assign({}, params), d)))
        : [
            Object.assign(Object.assign({}, searchSimpleReq), { data: searchReq.vectors || searchSimpleReq.vector || searchSimpleReq.data, anns_field: searchSimpleReq.anns_field ||
                    Object.keys(collectionInfo.anns_fields || {})[0] }),
        ];
    // get primary field type for ids
    const pkField = collectionInfo.schema.fields.find(f => f.is_primary_key);
    const pkDataType = pkField
        ? pkField.dataType || __1.DataTypeMap[pkField.data_type]
        : undefined;
    for (const userRequest of userRequests) {
        const { data, anns_field } = userRequest;
        const annsField = collectionInfo.anns_fields[anns_field];
        if (!annsField) {
            throw new Error(__1.ERROR_REASONS.NO_ANNS_FEILD_FOUND_IN_SEARCH);
        }
        // get ids from request
        const ids = userRequest.ids || searchReq.ids || searchSimpleReq.ids || undefined;
        // if ids is set, we use ids for search
        // check if ids is valid
        if (ids && ids.length > 0) {
            if (!pkField) {
                throw new Error('Primary field not found. Cannot use ids parameter without primary field.');
            }
            // validation
            if (pkDataType === __1.DataType.Int64) {
                if (!ids.every((id) => typeof id === 'number' || (typeof id === 'string' && !isNaN(Number(id))))) {
                    throw new Error(`The type of ids should be integer/string number because the primary key field ${pkField.name} is Int64.`);
                }
            }
            else if (pkDataType === __1.DataType.VarChar) {
                if (!ids.every((id) => typeof id === 'string')) {
                    throw new Error(`The type of ids should be string because the primary key field ${pkField.name} is VarChar.`);
                }
            }
            else {
                throw new Error(`The primary key field ${pkField.name} has unsupported type for ID search.`);
            }
        }
        // get search data
        // if ids is set, we don't need to format search data
        // checks check if data is valid
        if ((!ids || ids.length === 0) && !data) {
            throw new Error('Search data is required');
        }
        const searchData = ids && ids.length > 0 ? [] : (0, exports.formatSearchData)(data, annsField);
        const request = {
            collection_name: params.collection_name,
            partition_names: params.partition_names || [],
            output_fields: params.output_fields || default_output_fields,
            nq: ids && ids.length > 0 ? ids.length : searchReq.nq || searchData.length,
            dsl: userRequest.expr || searchReq.expr || searchSimpleReq.filter || '',
            dsl_type: __1.DslType.BoolExprV1,
            search_params: (0, __1.parseToKeyValue)(searchReq.search_params || (0, exports.buildSearchParams)(userRequest, anns_field)),
            consistency_level: params.consistency_level || collectionInfo.consistency_level,
        };
        if (ids && ids.length > 0) {
            if (pkDataType === __1.DataType.Int64) {
                request.ids = { int_id: { data: ids } };
            }
            else if (pkDataType === __1.DataType.VarChar) {
                request.ids = { str_id: { data: ids } };
            }
        }
        else {
            // use placeholder_group for vector search
            request.placeholder_group = (0, __1.buildPlaceholderGroupBytes)(milvusProto, searchData, annsField);
        }
        // if exprValues is set, add it to the request(inner)
        if (userRequest.exprValues) {
            request.expr_template_values = (0, exports.formatExprValues)(userRequest.exprValues);
        }
        requests.push(request);
    }
    /**
     *  It will decide the score precision.
     *  If round_decimal is 3, need return like 3.142
     *  And if Milvus return like 3.142, Node will add more number after this like 3.142000047683716.
     *  So the score need to slice by round_decimal
     */
    const round_decimal = (_d = (_b = (_a = searchReq.search_params) === null || _a === void 0 ? void 0 : _a.round_decimal) !== null && _b !== void 0 ? _b : (_c = searchSimpleReq.params) === null || _c === void 0 ? void 0 : _c.round_decimal) !== null && _d !== void 0 ? _d : -1;
    // get rerank
    const rerank = searchSimpleOrHybridReq.rerank;
    const isRerankerObj = !!(rerank &&
        typeof rerank === 'object' &&
        'strategy' in rerank);
    const hasRerankFunction = !!(rerank &&
        typeof rerank === 'object' &&
        'type' in rerank);
    const hasFunctionScore = isFunctionScore(rerank);
    // build highlighter if provided
    const highlighter = searchSimpleOrHybridReq.highlighter || searchReq.highlighter;
    const highlighterParam = highlighter
        ? { highlighter: (0, exports.buildHighlighter)(highlighter) }
        : {};
    return Object.assign(Object.assign({ isHybridSearch: isHybridSearch, request: isHybridSearch
            ? Object.assign(Object.assign(Object.assign({ collection_name: params.collection_name, partition_names: params.partition_names, requests: requests, output_fields: (_e = requests[0]) === null || _e === void 0 ? void 0 : _e.output_fields, consistency_level: (_f = requests[0]) === null || _f === void 0 ? void 0 : _f.consistency_level }, (0, exports.createFunctionScore)(rerank)), {
                rank_params: [
                    ...(isRerankerObj
                        ? (0, __1.parseToKeyValue)((0, exports.convertRerankParams)(rerank))
                        : !hasRerankFunction && !hasFunctionScore
                            ? (0, __1.parseToKeyValue)((0, exports.convertRerankParams)((0, exports.RRFRanker)()))
                            : []),
                    { key: 'round_decimal', value: round_decimal },
                    {
                        key: 'limit',
                        value: (_h = (_g = searchSimpleReq.limit) !== null && _g !== void 0 ? _g : searchSimpleReq.topk) !== null && _h !== void 0 ? _h : __1.DEFAULT_TOPK,
                    },
                    {
                        key: 'offset',
                        value: (_j = searchSimpleReq.offset) !== null && _j !== void 0 ? _j : 0,
                    },
                ],
            }), highlighterParam) : Object.assign(Object.assign(Object.assign({}, requests[0]), (0, exports.createFunctionScore)(rerank)), highlighterParam) }, (round_decimal !== -1 ? { round_decimal } : {})), { nq: requests[0].nq });
};
exports.buildSearchRequest = buildSearchRequest;
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
const formatSearchResult = (searchRes, options) => {
    var _a;
    const { round_decimal } = options;
    // build final results array
    const results = [];
    const { topks, scores, fields_data, highlight_results } = searchRes.results;
    // build fields data map
    const fieldsDataMap = (0, __1.buildFieldDataMap)(fields_data, options.transformers);
    // build output name array
    const output_fields = [
        ...(!!((_a = searchRes.results.output_fields) === null || _a === void 0 ? void 0 : _a.length)
            ? searchRes.results.output_fields
            : fields_data.map(f => f.field_name)),
    ];
    // check highlight results once outside the loop
    const hasHighlights = !!(highlight_results && highlight_results.length > 0);
    // fieldsDataMap.set('score', scores); TODO: fieldDataMap to support formatter
    /**
     * This code block formats the search results returned by Milvus into row data for easier use.
     * Milvus supports multiple queries to search and returns all columns data, so we need to splice the data for each search result using the `topk` variable.
     * The `topk` variable is the key we use to splice data for every search result.
     * The `scores` array is spliced using the `topk` value, and the resulting scores are formatted to the specified precision using the `formatNumberPrecision` function. The resulting row data is then pushed to the `results` array.
     */
    let offset = 0;
    topks.forEach((v, queryIndex) => {
        const topk = Number(v);
        const queryResults = [];
        if (topk > 0) {
            for (let hitIndex = 0; hitIndex < topk; hitIndex++) {
                const absoluteIndex = offset + hitIndex; // Correct index for flat arrays
                const score = scores[absoluteIndex]; // Access score without modifying array
                const fixedScore = typeof round_decimal === 'undefined' || round_decimal === -1
                    ? score
                    : (0, __1.formatNumberPrecision)(score, round_decimal);
                const result = { score: fixedScore };
                // Get ID - Assuming ID field name is known or included in output_fields
                // Example: const idFieldName = collectionInfo.schema.primary_field_name;
                // if (fieldsDataMap.has(idFieldName)) {
                //    result.id = fieldsDataMap.get(idFieldName)![absoluteIndex];
                // }
                output_fields.forEach(field_name => {
                    const isFixedSchema = fieldsDataMap.has(field_name);
                    const dataArray = fieldsDataMap.get(isFixedSchema ? field_name : __1.DEFAULT_DYNAMIC_FIELD);
                    // Safer read-only access for dynamic fields
                    const value = isFixedSchema
                        ? dataArray[absoluteIndex]
                        : dataArray[absoluteIndex]
                            ? dataArray[absoluteIndex][field_name]
                            : undefined;
                    result[field_name] = value;
                });
                // attach highlight results if available
                if (hasHighlights) {
                    const highlight = {};
                    let hasAny = false;
                    for (const hr of highlight_results) {
                        const data = hr.datas[absoluteIndex];
                        if (data) {
                            highlight[hr.field_name] = {
                                fragments: data.fragments || [],
                                scores: data.scores || [],
                            };
                            hasAny = true;
                        }
                    }
                    if (hasAny) {
                        result.highlight = highlight;
                    }
                }
                queryResults.push(result);
            }
        }
        results[queryIndex] = queryResults;
        offset += topk; // Update offset for the next query's results
    });
    return results;
};
exports.formatSearchResult = formatSearchResult;
/**
 * Formats the search vector to match a specific data type.
 * It should be an array, if the search data is a single vector, return a single array, if the search data is a array of vectors, return the array
 * @param {SearchData[]} searchVector - The search vector or array of vectors to be formatted.
 * @param {FieldSchema} field - The field schema.
 * @returns {[SearchData] | SearchData[]}
 */
const formatSearchData = (searchData, field) => {
    const { is_function_output, _placeholderType } = field;
    if (is_function_output) {
        return Array.isArray(searchData)
            ? searchData
            : [searchData];
    }
    switch (_placeholderType) {
        case __1.PlaceholderType.EmbListFloatVector:
            const isMultiEmbeddingList = Array.isArray(searchData) &&
                Array.isArray(searchData[0]) &&
                Array.isArray(searchData[0][0]);
            if (isMultiEmbeddingList) {
                return searchData.map(v => v.flat());
            }
            else {
                return [searchData.flat()];
            }
        case __1.PlaceholderType.FloatVector:
        case __1.PlaceholderType.BinaryVector:
        case __1.PlaceholderType.Float16Vector:
        case __1.PlaceholderType.BFloat16Vector:
        case __1.PlaceholderType.Int8Vector:
            if (!Array.isArray(searchData)) {
                // for bytes
                return [searchData];
            }
        case __1.PlaceholderType.SparseFloatVector:
            const type = (0, __1.getSparseFloatVectorType)(searchData);
            if (type !== 'unknown') {
                return [searchData];
            }
        default:
            return searchData;
    }
};
exports.formatSearchData = formatSearchData;
const formatExprValues = (exprValues) => {
    const result = {};
    for (const [key, value] of Object.entries(exprValues)) {
        if (Array.isArray(value)) {
            // Handle arrays
            result[key] = { array_val: convertArray(value) };
        }
        else {
            // Handle primitive types
            if (typeof value === 'boolean') {
                result[key] = { bool_val: value };
            }
            else if (typeof value === 'number') {
                result[key] = Number.isInteger(value)
                    ? { int64_val: value }
                    : { float_val: value };
            }
            else if (typeof value === 'string') {
                result[key] = { string_val: value };
            }
        }
    }
    return result;
};
exports.formatExprValues = formatExprValues;
const convertArray = (arr) => {
    const first = arr[0];
    switch (typeof first) {
        case 'boolean':
            return {
                bool_data: {
                    data: arr,
                },
            };
        case 'number':
            if (Number.isInteger(first)) {
                return {
                    long_data: {
                        data: arr,
                    },
                };
            }
            else {
                return {
                    double_data: {
                        data: arr,
                    },
                };
            }
        case 'string':
            return {
                string_data: {
                    data: arr,
                },
            };
        case 'object':
            if (Array.isArray(first)) {
                return {
                    array_data: {
                        data: arr.map(convertArray),
                    },
                };
            }
            else {
                return {
                    json_data: {
                        data: arr,
                    },
                };
            }
        default:
            return {
                string_data: {
                    data: arr,
                },
            };
    }
};
//# sourceMappingURL=Search.js.map