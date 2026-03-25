"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Data = void 0;
const __1 = require("../");
const Collection_1 = require("./Collection");
class Data extends Collection_1.Collection {
    constructor() {
        super(...arguments);
        // alias
        this.hybridSearch = this.search;
        /**
         * List indexed segments.
         *
         * @param {ListIndexedSegmentReq} data - The request parameters.
         * @param {string} data.collection_name - The name of the collection.
         * @param {string} data.index_name - The name of the collection's index.
         * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
         *
         * @returns {Promise<ListIndexedSegmentResponse>} The result of the operation.
         * @returns {string} status.error_code - The error code of the operation.
         * @returns {string} status.reason - The reason for the error, if any.
         * @returns {number[]} segmentIDs - Segment IDs.
         *
         * @throws {Error} if `collection_name` property is not present in `data`
         *
         * @example
         * ```
         *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
         *  const indexedSegments = await milvusClient.listIndexedSegment({
         *    collection_name: 'my_collection',
         *    index_name: 'my_index',
         *  });
         * ```
         */
        // async listIndexedSegment(
        //   data: ListIndexedSegmentReq
        // ): Promise<ListIndexedSegmentResponse> {
        //   if (!data || !data.collection_name) {
        //     throw new Error(ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
        //   }
        //   const res = await promisify(
        //     this.channelPool,
        //     'ListIndexedSegment',
        //     data,
        //     data.timeout || this.timeout
        //   );
        //   return res;
        // }
        /**
         * Describe segment index data.
         *
         * @param {DescribeSegmentIndexDataReq} data - The request parameters.
         * @param {string} data.collection_name - The name of the collection.
         * @param {number[]} data.segmentsIDs - The segment IDs.
         * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
         *
         * @returns {Promise<DescribeSegmentIndexDataResponse>} The result of the operation.
         * @returns {string} status.error_code - The error code of the operation.
         * @returns {string} status.reason - The reason for the error, if any.
         * @returns {number[]} segmentIDs - Segment IDs.
         *
         * @throws {Error} if `collection_name` property is not present in `data`
         *
         * @example
         * ```
         *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
         *  const segmentIndexData = await milvusClient.describeSegmentIndexData({
         *    collection_name: 'my_collection',
         *    segmentsIDs: [1,2,3,4],
         *  });
         * ```
         */
        // async describeSegmentIndexData(
        //   data: DescribeSegmentIndexDataReq
        // ): Promise<DescribeSegmentIndexDataResponse> {
        //   if (!data || !data.collection_name) {
        //     throw new Error(ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
        //   }
        //   const res = await promisify(
        //     this.channelPool,
        //     'DescribeSegmentIndexData',
        //     data,
        //     data.timeout || this.timeout
        //   );
        //   return res;
        // }
    }
    /**
     * Upsert data into Milvus, view _insert for detail
     */
    upsert(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._insert(data, true);
        });
    }
    /**
     * Insert data into Milvus, view _insert for detail
     */
    insert(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._insert(data);
        });
    }
    /**
     * Insert or upsert data into a Milvus collection.
     *
     * @param {InsertReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.partition_name] - The name of the partition (optional).
     * @param {{ [x: string]: any }[]} data.data - The data to be inserted. If the field type is binary, the vector data length needs to be dimension / 8.
     * @param {InsertTransformers} data.transformers - The transformers for bf16 or f16 data, it accept an f32 array, it should output f16 or bf16 bytes (optional)
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<MutationResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number[]} succ_index - Index array of the successfully inserted data.
     * @returns {number[]} err_index - Index array of the unsuccessfully inserted data.
     * @returns {number[]} IDs - ID array of the successfully inserted data.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.insert({
     *    collection_name: 'my_collection',
     *    fields_data: [{
     *      vector_field: [1,2,2,4],
     *      scalar_field: 1
     *    }]
     *  });
     * ```
     */
    _insert(data, upsert = false) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            // ensure fields data available
            data.fields_data = data.fields_data || data.data;
            if (!data.fields_data ||
                !Array.isArray(data.fields_data) ||
                !data.fields_data.length) {
                throw new Error(__1.ERROR_REASONS.INSERT_CHECK_FIELD_DATA_IS_REQUIRED);
            }
            const { collection_name } = data;
            const describeReq = { collection_name, cache: true };
            if (data.db_name) {
                describeReq.db_name = data.db_name;
            }
            const collectionInfo = yield this.describeCollection(describeReq);
            if (collectionInfo.status.error_code !== __1.ErrorCode.SUCCESS) {
                throw collectionInfo;
            }
            // Tip: The field data sequence needs to be set same as `collectionInfo.schema.fields`.
            const functionOutputFields = [];
            const fieldMap = new Map(collectionInfo.schema.fields.reduce((acc, v) => {
                // if autoID is true, ignore the primary key field or if upsert is true
                const insertable = !v.autoID || upsert;
                //  if function field is set, you need to ignore the field value in the data.
                if (v.is_function_output) {
                    functionOutputFields.push(v.name); // ignore function field
                }
                else if (insertable) {
                    acc.push([
                        v.name,
                        {
                            name: v.name,
                            type: v.data_type,
                            elementType: v.element_type,
                            dim: Number(v.dim),
                            data: [],
                            nullable: v.nullable,
                            default_value: v.default_value,
                        },
                    ]);
                }
                return acc;
            }, []));
            // dynamic field is enabled, create $meta field
            const isDynamic = collectionInfo.schema.enable_dynamic_field;
            if (isDynamic) {
                fieldMap.set(__1.DEFAULT_DYNAMIC_FIELD, {
                    name: __1.DEFAULT_DYNAMIC_FIELD,
                    type: 'JSON',
                    elementType: 'None',
                    data: [],
                    nullable: false,
                });
            }
            // Loop through each row and set the corresponding field values in the Map.
            data.fields_data.forEach((rowData, rowIndex) => {
                // if support dynamic field, all field not in the schema would be grouped to a dynamic field
                rowData = isDynamic
                    ? (0, __1.buildDynamicRow)(rowData, fieldMap, __1.DEFAULT_DYNAMIC_FIELD, functionOutputFields)
                    : rowData;
                // get each fieldname from the row object
                const fieldNames = Object.keys(rowData);
                // go through each fieldname and encode or format data
                fieldNames.forEach(name => {
                    const field = fieldMap.get(name);
                    if (!field) {
                        throw new Error(`${__1.ERROR_REASONS.INSERT_CHECK_WRONG_FIELD} ${rowIndex}`);
                    }
                    if (__1.DataTypeMap[field.type] === __1.DataType.BinaryVector &&
                        rowData[name].length !== field.dim / 8) {
                        throw new Error(__1.ERROR_REASONS.INSERT_CHECK_WRONG_DIM);
                    }
                    // build field data
                    switch (__1.DataTypeMap[field.type]) {
                        case __1.DataType.BinaryVector:
                        case __1.DataType.FloatVector:
                            field.data = field.data.concat((0, __1.buildFieldData)(rowData, field));
                            break;
                        default:
                            field.data[rowIndex] = (0, __1.buildFieldData)(rowData, field, data.transformers);
                            break;
                    }
                });
            });
            // The actual data we pass to Milvus gRPC.
            const params = Object.assign(Object.assign({}, data), { num_rows: data.fields_data.length, schema_timestamp: collectionInfo.update_timestamp });
            // transform data from map to array, milvus grpc params
            params.fields_data = Array.from(fieldMap.values()).map(field => {
                var _a;
                // milvus return string for field type, so we define the DataTypeMap to the value we need.
                // but if milvus change the string, may cause we cant find value.
                const type = __1.DataTypeMap[field.type];
                const key = __1.VectorDataTypes.includes(type) ? 'vectors' : 'scalars';
                const dataKey = (0, __1.getDataKey)(type);
                const elementType = __1.DataTypeMap[field.elementType];
                const elementTypeKey = (0, __1.getDataKey)(elementType);
                // check if need valid data
                const needValidData = key !== 'vectors' &&
                    (field.nullable === true ||
                        (typeof field.default_value !== 'undefined' &&
                            field.default_value !== null));
                // get valid data
                const valid_data = needValidData
                    ? (0, __1.getValidDataArray)(field.data, (_a = data.fields_data) === null || _a === void 0 ? void 0 : _a.length)
                    : [];
                // build key value
                let keyValue;
                switch (type) {
                    case __1.DataType.FloatVector:
                        keyValue = {
                            dim: field.dim,
                            [dataKey]: {
                                data: field.data,
                            },
                        };
                        break;
                    case __1.DataType.BFloat16Vector:
                    case __1.DataType.Float16Vector:
                        keyValue = {
                            dim: field.dim,
                            [dataKey]: Buffer.concat(field.data),
                        };
                        break;
                    case __1.DataType.BinaryVector:
                        keyValue = {
                            dim: field.dim,
                            [dataKey]: (0, __1.f32ArrayToBinaryBytes)(field.data),
                        };
                        break;
                    case __1.DataType.SparseFloatVector:
                        const dim = (0, __1.getSparseDim)(field.data);
                        keyValue = {
                            dim,
                            [dataKey]: {
                                dim,
                                contents: (0, __1.sparseRowsToBytes)(field.data),
                            },
                        };
                        break;
                    case __1.DataType.Array:
                        keyValue = {
                            [dataKey]: {
                                data: field.data
                                    .filter(v => v !== undefined)
                                    .map(d => {
                                    return {
                                        [elementTypeKey]: {
                                            type: elementType,
                                            data: d,
                                        },
                                    };
                                }),
                                element_type: elementType,
                            },
                        };
                        break;
                    default:
                        keyValue = {
                            [dataKey]: {
                                data: field.data.filter(v => v !== undefined),
                            },
                        };
                        break;
                }
                return {
                    type,
                    field_name: field.name,
                    is_dynamic: field.name === __1.DEFAULT_DYNAMIC_FIELD,
                    [key]: keyValue,
                    valid_data: valid_data,
                };
            });
            // if timeout is not defined, set timeout to 0
            const timeout = typeof data.timeout === 'undefined' ? 0 : data.timeout;
            // delete data
            try {
                delete params.data;
            }
            catch (e) { }
            // execute Insert
            let promise = yield (0, __1.promisify)(this.channelPool, upsert ? 'Upsert' : 'Insert', params, timeout);
            // if schema mismatch, reload collection info and redo the insert request
            if (promise.status.error_code === __1.ErrorCode.SchemaMismatch) {
                // load collection info without cache
                yield this.describeCollection({ collection_name });
                // redo the insert request
                promise = yield this._insert(data, upsert);
            }
            return promise;
        });
    }
    /**
     * Delete entities in a Milvus collection.
     *
     * @param {DeleteEntitiesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.partition_name] - The name of the partition (optional).
     * @param {string} data.expr - Boolean expression used to filter entities for deletion.
     * @param {string} [data.consistency_level] - The consistency level of the new collection. Can be "Strong" (Milvus default), "Session", "Bounded", "Eventually", or "Customized".
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<MutationResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number[]} IDs - ID array of the successfully deleted data.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.deleteEntities({
     *    collection_name: 'my_collection',
     *    expr: 'id in [1,2,3,4]'
     *  });
     * ```
     */
    deleteEntities(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collection_name) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            // check expr or filter
            if (!data.filter && !data.expr) {
                throw new Error(__1.ERROR_REASONS.FILTER_EXPR_REQUIRED);
            }
            // filter > expr
            data.expr = data.filter || data.expr;
            const req = data;
            // if exprValues exist, format it
            if (data.exprValues) {
                req.expr_template_values = (0, __1.formatExprValues)(data.exprValues);
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'Delete', req, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Delete entities in a Milvus collection.
     *
     * @param {DeleteReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.partition_name] - The name of the partition (optional).
     * @param {(string[] | number[])} [data.ids] - IDs of the entities to delete.
     * @param {string} [data.filter] - Filter expression, takes precedence over ids.
     * @param {string} [data.consistency_level] - The consistency level of the new collection. Can be "Strong" (Milvus default), "Session", "Bounded", "Eventually", or "Customized".
     * @param {string} [data.expr] - equals to data.filter.
     * @param {number} [data.timeout] - Optional duration of time in milliseconds to allow for the RPC. If undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<MutationResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number[]} IDs - Array of IDs of the successfully deleted entities.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.delete({
     *    collection_name: 'my_collection',
     *    filter: 'id in [1,2,3,4]'
     *  });
     * ```
     *
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.delete({
     *    collection_name: 'my_collection',
     *    ids: [1,2,3,4]
     *  });
     * ```
     */
    delete(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collection_name) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const pkField = yield this.getPkFieldName(data);
            const pkFieldType = yield this.getPkFieldType(data);
            let expr = '';
            // generate expr by different type of pk
            if (data.ids) {
                expr =
                    __1.DataTypeMap[pkFieldType] === __1.DataType.VarChar
                        ? `${pkField} in ["${data.ids.join('","')}"]`
                        : `${pkField} in [${data.ids.join(',')}]`;
            }
            // if filter exist use filter;
            if (data.filter) {
                expr = data.filter;
            }
            const req = Object.assign(Object.assign({}, data), { expr });
            return this.deleteEntities(req);
        });
    }
    /**
     * Perform vector similarity search in a Milvus collection.
     *
     * @param {SearchReq | SearchSimpleReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {Number[]} data.vector - Original vector to search with.
     * @param {string[]} [data.partition_names] - Array of partition names (optional).
     * @param {number} [data.topk] - Topk (optional).
     * @param {number} [data.limit] - Alias for topk (optional).
     * @param {number} [data.offset] - Offset (optional).
     * @param {string} [data.filter] - Scalar field filter expression (optional).
     * @param {string[]} [data.output_fields] - Support scalar field (optional).
     * @param {object} [data.params] - Search params (optional).
     * @param {OutputTransformers} data.transformers - The transformers for bf16 or f16 data, it accept bytes or sparse dic vector, it can ouput f32 array or other format(optional)
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<SearchResults>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {{score:number,id:string, [outputfield]: value}[]} results - Array of search results.
     * @returns {number} session_ts - The timestamp of the search session.
     * @returns {string} collection_name - The name of the collection.
     * @returns {number} all_search_count - The total number of search operations.
     * @returns {string[]} recalls - The recalls of the search operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const searchResults = await milvusClient.search({
     *    collection_name: 'my_collection',
     *    vector: [1, 2, 3, 4],
     *  });
     * ```
     */
    search(params) {
        return __awaiter(this, void 0, void 0, function* () {
            // default collection request
            const describeCollectionRequest = {
                collection_name: params.collection_name,
                cache: true,
            };
            // get collection info
            if (params.db_name) {
                // if the request has `db_name` pass it to the request.
                describeCollectionRequest.db_name = params.db_name;
            }
            const collectionInfo = yield this.describeCollection(describeCollectionRequest);
            // build search params
            const { request, nq, round_decimal, isHybridSearch } = (0, __1.buildSearchRequest)(params, collectionInfo, this.milvusProto);
            // if db_name exist, pass it to the request
            if (params.db_name) {
                request.db_name = params.db_name;
            }
            // execute search
            const originSearchResult = yield (0, __1.promisify)(this.channelPool, isHybridSearch ? 'HybridSearch' : 'Search', request, params.timeout || this.timeout);
            // if search failed
            // if nothing returned
            // return empty with status
            if (originSearchResult.status.error_code !== __1.ErrorCode.SUCCESS ||
                originSearchResult.results.scores.length === 0) {
                return {
                    status: originSearchResult.status,
                    results: [],
                    recalls: [],
                    session_ts: -1,
                    collection_name: params.collection_name,
                    search_iterator_v2_results: originSearchResult.results &&
                        originSearchResult.results.search_iterator_v2_results,
                    _search_iterator_v2_results: originSearchResult.results &&
                        originSearchResult.results._search_iterator_v2_results,
                };
            }
            // build final results array
            const results = (0, __1.formatSearchResult)(originSearchResult, {
                round_decimal,
                transformers: params.transformers,
            });
            return {
                status: originSearchResult.status,
                // nq === 1, return the first object of results array
                results: nq === 1 ? results[0] || [] : results,
                recalls: originSearchResult.results.recalls,
                session_ts: originSearchResult.session_ts,
                collection_name: params.collection_name,
                all_search_count: originSearchResult.results.all_search_count,
                search_iterator_v2_results: originSearchResult.results.search_iterator_v2_results,
                _search_iterator_v2_results: originSearchResult.results._search_iterator_v2_results,
            };
        });
    }
    searchIterator(param) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this;
            // Get available count
            const count = yield client.count({
                collection_name: param.collection_name,
                expr: param.expr || param.filter || '',
            });
            // get collection Info
            const collectionInfo = yield this.describeCollection({
                collection_name: param.collection_name,
            });
            // if limit not set, set it to count
            if (!param.limit || param.limit === __1.NO_LIMIT) {
                param.limit = count.data;
            }
            // Ensure limit does not exceed the total count
            const total = Math.min(param.limit, count.data);
            // Ensure batch size does not exceed the total count or max search size
            let batchSize = Math.min(param.batchSize, total, __1.DEFAULT_MAX_SEARCH_SIZE);
            // Iterator fields
            const ITERATOR_FIELD = 'iterator';
            const ITER_SEARCH_V2_KEY = 'search_iter_v2';
            const ITER_SEARCH_ID_KEY = 'search_iter_id';
            const ITER_SEARCH_BATCH_SIZE_KEY = 'search_iter_batch_size';
            const ITER_SEARCH_LAST_BOUND_KEY = 'search_iter_last_bound';
            const GUARANTEE_TIMESTAMP_KEY = 'guarantee_timestamp';
            const COLLECTION_ID = 'collection_id';
            let currentTotal = 0;
            // search iterator special params
            const params = Object.assign(Object.assign({}, param.params), { [ITERATOR_FIELD]: true, [ITER_SEARCH_V2_KEY]: true, [ITER_SEARCH_BATCH_SIZE_KEY]: batchSize, [GUARANTEE_TIMESTAMP_KEY]: 0, [COLLECTION_ID]: collectionInfo.collectionID });
            return {
                [Symbol.asyncIterator]() {
                    return {
                        next() {
                            var _a;
                            return __awaiter(this, void 0, void 0, function* () {
                                if (currentTotal >= total) {
                                    return { done: true, value: null };
                                }
                                try {
                                    const batchRes = yield client.search(Object.assign(Object.assign({}, param), { params, limit: batchSize }));
                                    // update current total and batch size
                                    currentTotal += batchRes.results.length;
                                    batchSize = Math.min(batchSize, total - currentTotal);
                                    // update search params
                                    params[ITER_SEARCH_ID_KEY] =
                                        batchRes.search_iterator_v2_results.token;
                                    params[ITER_SEARCH_LAST_BOUND_KEY] =
                                        (_a = batchRes.search_iterator_v2_results) === null || _a === void 0 ? void 0 : _a.last_bound;
                                    params[GUARANTEE_TIMESTAMP_KEY] = batchRes.session_ts;
                                    params[ITER_SEARCH_BATCH_SIZE_KEY] = batchSize;
                                    return {
                                        done: currentTotal > total || !batchRes.results.length,
                                        value: param.external_filter_fn
                                            ? batchRes.results.filter(param.external_filter_fn)
                                            : batchRes.results,
                                    };
                                }
                                catch (error) {
                                    console.error('Error during search iteration:', error);
                                    return { done: true, value: null };
                                }
                            });
                        },
                    };
                },
            };
        });
    }
    /**
     * Executes a query and returns an async iterator that allows iterating over the results in batches.
     *
     * @param {QueryIteratorReq} data - The query iterator request data.
     * @returns {Promise<any>} - An async iterator that yields batches of query results.
     * @throws {Error} - If an error occurs during the query execution.
     *
     * @example
     * const queryData = {
     *   collection_name: 'my_collection',
     *   expr: 'age > 30',
     *   limit: 100,
     *   pageSize: 10
     * };
     *
     * const iterator = await queryIterator(queryData);
     *
     * for await (const batch of iterator) {
     *   console.log(batch); // Process each batch of query results
     * }
     */
    queryIterator(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // get collection info
            const pkField = yield this.getPkField(data);
            // store client;
            const client = this;
            // expr
            const userExpr = data.expr || data.filter || '';
            // get count
            const count = yield client.count({
                collection_name: data.collection_name,
                expr: userExpr,
            });
            // if limit not set, set it to count
            if (!data.limit || data.limit === __1.NO_LIMIT) {
                data.limit = count.data;
            }
            // total should be the minimum of total and count
            const total = data.limit > count.data ? count.data : data.limit;
            const batchSize = data.batchSize > __1.DEFAULT_MAX_SEARCH_SIZE
                ? __1.DEFAULT_MAX_SEARCH_SIZE
                : data.batchSize;
            // local variables
            let expr = userExpr;
            let lastBatchRes = [];
            let lastPKId = '';
            let currentBatchSize = batchSize; // Store the current batch size
            // return iterator
            return {
                currentTotal: 0,
                [Symbol.asyncIterator]() {
                    return {
                        currentTotal: this.currentTotal,
                        next() {
                            return __awaiter(this, void 0, void 0, function* () {
                                // if reach the limit, return done
                                if (this.currentTotal >= total) {
                                    return { done: true, value: lastBatchRes };
                                }
                                // set limit for current batch
                                data.limit = currentBatchSize; // Use the current batch size
                                // get current page expr
                                data.expr = (0, __1.getQueryIteratorExpr)({
                                    expr: expr,
                                    pkField,
                                    lastPKId,
                                });
                                // search data
                                const res = yield client.query(data);
                                // get last item of the data
                                const lastItem = res.data[res.data.length - 1];
                                // update last pk id
                                lastPKId = lastItem && lastItem[pkField.name];
                                // store last batch result
                                lastBatchRes = res.data;
                                // update current total
                                this.currentTotal += lastBatchRes.length;
                                // Update the current batch size based on remaining data
                                currentBatchSize = Math.min(batchSize, total - this.currentTotal);
                                return { done: false, value: lastBatchRes };
                            });
                        },
                    };
                },
            };
        });
    }
    /**
     * Flushes the newly inserted vectors that are temporarily buffered in the cache to the object storage.
     * This is an asynchronous function and may take some time to execute deponds on your data size.
     *
     * @param {FlushReq} data - The request parameters.
     * @param {string[]} data.collection_names - Array of collection names.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<FlushResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const flushStatus = await milvusClient.flush({
     *    collection_names: ['my_collection'],
     *  });
     * ```
     */
    flush(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data ||
                !Array.isArray(data.collection_names) ||
                !data.collection_names.length) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'Flush', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * This function is similar to the `flush` function, but it is synchronous.
     * This ensures that the flush operation is completed before the function returns.
     *
     * @param {FlushReq} data - The request parameters.
     * @param {string[]} data.collection_names - Array of collection names.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetFlushStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const flushSyncStatus = await milvusClient.flushSync({
     *    collection_names: ['my_collection'],
     *  });
     * ```
     */
    flushSync(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data ||
                !Array.isArray(data.collection_names) ||
                !data.collection_names.length) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            // copy flushed collection names
            const res = yield (0, __1.promisify)(this.channelPool, 'Flush', data, data.timeout || this.timeout);
            // After flush will return collection segment ids, need use GetPersistentSegmentInfo to check segment flush status.
            const segIDs = Object.keys(res.coll_segIDs)
                .map(v => res.coll_segIDs[v].data)
                .reduce((pre, cur) => [...pre, ...cur], []);
            let isFlushed = false;
            let flushRes = null;
            while (!isFlushed) {
                flushRes = yield this.getFlushState({ segmentIDs: segIDs });
                yield (0, __1.sleep)(100);
                isFlushed = flushRes.flushed;
            }
            // Before Milvus pre-GA will throw error
            return flushRes;
        });
    }
    /**
     * Query vector data in Milvus. Current release of Milvus only supports expression as fieldname in [id1,id2,id3].
     *
     * @param {QueryReq} data - The request parameters.
     * @param {string} data.collection_name - Collection name.
     * @param {string[]} [data.ids] - IDs to get.
     * @param {string} [data.expr] - Scalar field filter expression.
     * @param {string} [data.filter] - Equals to data.expr.
     * @param {string[]} [data.partitions_names] - Array of partition names (optional).
     * @param {string[]} data.output_fields - Vector or scalar field to be returned.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     * @param {{key: value}[]} [data.params] - An optional key pair json array of search parameters.
     * @param {OutputTransformers} data.transformers - The transformers for bf16 or f16 data, it accept bytes or sparse dic vector, it can ouput f32 array or other format(optional)
     *
     * @returns {Promise<QueryResults>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {{field_name: value}[]} data - Data of all fields that you defined in `output_fields`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const queryResults = await milvusClient.query({
     *    collection_name: 'my_collection',
     *    filter: "age in [1,2,3,4,5,6,7,8]",
     *    output_fields: ["age"],
     *  });
     * ```
     */
    query(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            // Set up limits and offset for the query
            let limits;
            let offset;
            if (typeof data.limit === 'number') {
                limits = { limit: data.limit };
            }
            if (typeof data.offset === 'number') {
                offset = { offset: data.offset };
            }
            // id in expression
            let primaryKeyInIdsExpression = '';
            // if we have ids
            if (data.ids && data.ids.length > 0) {
                const pkField = yield this.getPkFieldName(data);
                const pkFieldType = yield this.getPkFieldType(data);
                // generate expr by different type of pk
                primaryKeyInIdsExpression =
                    __1.DataTypeMap[pkFieldType] === __1.DataType.VarChar
                        ? `${pkField} in ["${data.ids.join('","')}"]`
                        : `${pkField} in [${data.ids.join(',')}]`;
            }
            // filter > expr or empty > ids
            data.expr = data.filter || data.expr || primaryKeyInIdsExpression;
            // if exprValues exist, format it
            if (data.exprValues) {
                data.expr_template_values = (0, __1.formatExprValues)(data.exprValues);
            }
            // Execute the query and get the results
            const promise = yield (0, __1.promisify)(this.channelPool, 'Query', Object.assign(Object.assign({}, data), { output_fields: data.output_fields || ['*'], query_params: (0, __1.parseToKeyValue)(Object.assign(Object.assign({}, limits), offset)) }), data.timeout || this.timeout);
            // always get output_fields from fields_data
            const output_fields = promise.fields_data.map(f => f.field_name);
            // build field data map
            const fieldsDataMap = (0, __1.buildFieldDataMap)(promise.fields_data, data.transformers);
            // For each output field, check if it has a fixed schema or not
            const fieldDataContainer = output_fields.map(field_name => {
                // Check if the field_name exists in the fieldsDataMap
                const isFixedSchema = fieldsDataMap.has(field_name);
                // Get the data for the field_name from the fieldsDataMap
                // If the field_name is not in the fieldsDataMap, use the DEFAULT_DYNAMIC_FIELD
                const data = fieldsDataMap.get(isFixedSchema ? field_name : __1.DEFAULT_DYNAMIC_FIELD);
                // Return an object containing the field_name and its corresponding data
                // If the schema is fixed, use the data directly
                // If the schema is not fixed, map the data to extract the field_name values
                return {
                    data: isFixedSchema ? data : data.map(d => d[field_name]),
                    field_name,
                };
            });
            // Initialize an array to hold the query results
            let results = [];
            // parse column data to [{fieldname:value}]
            results = fieldDataContainer.reduce((acc, v) => {
                v.data.forEach((d, i) => {
                    acc[i] = Object.assign(Object.assign({}, acc[i]), { [v.field_name]: d });
                });
                return acc;
            }, []);
            return {
                status: promise.status,
                data: results,
            };
        });
    }
    count(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const req = {
                collection_name: data.collection_name,
                expr: data.expr || '',
                output_fields: [__1.DEFAULT_COUNT_QUERY_STRING],
            };
            if (data.db_name) {
                req.db_name = data.db_name;
            }
            const queryResult = yield this.query(req);
            return {
                status: queryResult.status,
                data: Number(queryResult.data[0][__1.DEFAULT_COUNT_QUERY_STRING]),
            };
        });
    }
    /**
     * Retrieve vector data by providing IDs in Milvus.
     *
     * @param {GetReq} data - The request parameters.
     * @param {string} data.collection_name - Collection name.
     * @param {string[]} data.ids - IDs to get.
     * @param {string[]} [data.partitions_names] - Array of partition names (optional).
     * @param {string[]} data.output_fields - Vector or scalar field to be returned.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     * @param {{key: value}[]} [data.params] - An optional key pair json array.
     *
     * @returns {Promise<QueryResults>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {{field_name: value}[]} data - Data of all fields that you defined in `output_fields`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const getResults = await milvusClient.get({
     *    collection_name: 'my_collection',
     *    ids: ['1','2','3','4','5','6','7','8'],
     *    output_fields: ["age"],
     *  });
     * ```
     */
    get(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.query(data);
        });
    }
    /**
     * @ignore
     * @param data
     *  | Property | Type | Description |
     *  | :--- | :-- | :-- |
     *  | request | object | Only allow "system_info" for now |
     */
    getMetric(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.request || !data.request.metric_type) {
                throw new Error(__1.ERROR_REASONS.GET_METRIC_CHECK_PARAMS);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetMetrics', {
                request: JSON.stringify(data.request),
            }, data.timeout || this.timeout);
            return Object.assign(Object.assign({}, res), { response: JSON.parse(res.response) });
        });
    }
    /**
     * Get the flush state of specified segment IDs in Milvus.
     *
     * @param {GetFlushStateReq} data - The request parameters.
     * @param {number[]} data.segmentIDs - The segment IDs.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetFlushStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {boolean[]} flushed - Array indicating whether each segment is flushed or not.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const flushState = await milvusClient.getFlushState({
     *    segmentIDs: [1,2,3,4],
     *  });
     * ```
     */
    getFlushState(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.segmentIDs) {
                throw new Error(__1.ERROR_REASONS.GET_FLUSH_STATE_CHECK_PARAMS);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetFlushState', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Perform a load balancing operation from a source query node to destination query nodes.
     * This function only works in a Milvus cluster.
     *
     * @param {LoadBalanceReq} data - The request parameters.
     * @param {number} data.src_nodeID - The source query node id to balance.
     * @param {number[]} [data.dst_nodeIDs] - The destination query node ids to balance (optional).
     * @param {number[]} [data.sealed_segmentIDs] - Sealed segment ids to balance (optional).
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {SegmentInfo[]} infos - Information about the segments.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const loadBalanceStatus = await milvusClient.loadBalance({
     *    src_nodeID: 31,
     *  });
     * ```
     */
    loadBalance(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.src_nodeID) {
                throw new Error(__1.ERROR_REASONS.LOAD_BALANCE_CHECK_PARAMS);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'LoadBalance', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Notifies Proxy to return segments information from query nodes.
     *
     * @param {GetQuerySegmentInfoReq} data - The request parameters.
     * @param {string} data.collectionName - The name of the collection to get segments info.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetQuerySegmentInfoResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {QuerySegmentInfo[]} infos - The growing segments' information in query cluster.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const querySegmentInfo = await milvusClient.getQuerySegmentInfo({
     *    collectionName: 'my_collection',
     *  });
     * ```
     */
    getQuerySegmentInfo(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collectionName) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetQuerySegmentInfo', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Notifies Proxy to return segments information from data nodes.
     *
     * @param {GetPersistentSegmentInfoReq} data - The request parameters.
     * @param {string} data.collectionName - The name of the collection to get segments info.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetPersistentSegmentInfoResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {PersistentSegmentInfo[]} infos - The growing segments' information in data cluster.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const persistentSegmentInfo = await milvusClient.getPersistentSegmentInfo({
     *    collectionName: 'my_collection',
     *  });
     * ```
     */
    getPersistentSegmentInfo(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collectionName) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetPersistentSegmentInfo', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Import data from files.
     *
     * @param {ImportReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string[]} data.files - Array of file paths.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ImportResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string[]} tasks - Array of task IDs.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const importResponse = await milvusClient.bulkInsert({
     *    collection_name: 'my_collection',
     *    files: ['path-to-data-file.json'],
     *  });
     * ```
     */
    /* istanbul ignore next */
    bulkInsert(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collection_name) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            if (!data || !data.files) {
                throw new Error(__1.ERROR_REASONS.IMPORT_FILE_CHECK);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'Import', Object.assign(Object.assign({}, data), { options: data.options || [] }), data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * List import tasks.
     *
     * @param {ListImportTasksReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.limit] - Optional, maximum number of tasks returned, list all tasks if the value is 0.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListImportTasksResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - Import state.
     * @returns {number} row_count - How many rows to import.
     * @returns {string[]} id_list - ID lists.
     * @returns {string} collection_id - Collection to be imported to.
     * @returns {string[]} tasks - TaskId array.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const listImportTasksResponse = await milvusClient.listImportTasks({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    /* istanbul ignore next */
    listImportTasks(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collection_name) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'ListImportTasks', Object.assign(Object.assign({}, data), { limit: data.limit || 0 }), data.timeout || this.timeout);
            return res;
        });
    }
}
exports.Data = Data;
//# sourceMappingURL=Data.js.map