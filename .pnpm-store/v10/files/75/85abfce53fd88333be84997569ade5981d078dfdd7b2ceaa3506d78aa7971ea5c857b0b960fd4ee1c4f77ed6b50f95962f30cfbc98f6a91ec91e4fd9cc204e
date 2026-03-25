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
exports.Collection = void 0;
const Database_1 = require("./Database");
const lru_cache_1 = require("lru-cache");
const __1 = require("../");
/**
 * @see [collection operation examples](https://github.com/milvus-io/milvus-sdk-node/blob/main/example/Collection.ts)
 */
class Collection extends Database_1.Database {
    constructor() {
        super(...arguments);
        // LRU cache for describe collection
        this.collectionInfoCache = new lru_cache_1.LRUCache({
            max: 256,
            // how long to live in ms, 12h
            ttl: 1000 * 60 * 12,
            // return stale items before removing from cache?
            allowStale: false,
            updateAgeOnGet: false,
            updateAgeOnHas: false,
        });
        /**
         * @deprecated Use alterCollectionProperties instead.
         */
        this.alterCollection = this.alterCollectionProperties;
        // alias
        this.list_collections = this.showCollections;
        // alias
        this.listCollections = this.showCollections;
        // alias
        this.getCollectionStats = this.getCollectionStatistics;
        this.loadCollectionSync = this.loadCollection;
        // alias
        this.drop_collection = this.dropCollection;
        // alias
        this.describeReplicas = this.getReplicas;
    }
    /**
     * Creates a new collection in Milvus.
     *
     * @param {CreateCollectionReq} data - The data for the new collection.
     * @param {string} data.collection_name - The name of the new collection.
     * @param {string} [data.description] - The description of the new collection.
     * @param {number} [data.num_partitions] - The number of partitions allowed in the new collection.
     * @param {string} [data.consistency_level] - The consistency level of the new collection. Can be "Strong" (Milvus default), "Session", "Bounded", "Eventually", or "Customized".
     * @param {FieldType[]} data.fields - The fields of the new collection. See [FieldType](https://github.com/milvus-io/milvus-sdk-node/blob/main/milvus/types/Collection.ts#L8) for more details.
     * @param {properties} [data.properties] - An optional object containing key-value pairs of properties for the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.createCollection({
     *    collection_name: 'my_collection',
     *    fields: [
     *      {
     *        name: "vector_01",
     *        description: "vector field",
     *        data_type: DataType.FloatVect,
     *        type_params: {
     *          dim: "8"
     *        }
     *      },
     *      {
     *        name: "age",
     *        data_type: DataType.Int64,
     *        autoID: true,
     *        is_primary_key: true,
     *        description: "",
     *      },
     *    ],
     *  });
     * ```
     */
    _createCollection(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Destructure the data object and set default values for consistency_level and description.
            const { collection_name, consistency_level = data.consistency_level || 'Bounded', num_partitions, } = data || {};
            let fields = data.fields;
            if (data.schema) {
                fields = data.schema;
            }
            // Check if fields and collection_name are present, otherwise throw an error.
            if (!(fields === null || fields === void 0 ? void 0 : fields.length) || !collection_name) {
                throw new Error(__1.ERROR_REASONS.CREATE_COLLECTION_CHECK_PARAMS);
            }
            // Check if the fields are valid.
            (0, __1.checkCollectionFields)(fields);
            // if num_partitions is set, validate it
            if (typeof num_partitions !== 'undefined') {
                (0, __1.validatePartitionNumbers)(num_partitions);
            }
            // Get the CollectionSchemaType and FieldSchemaType from the schemaProto object.
            const schemaTypes = {
                collectionSchemaType: this.schemaProto.lookupType(this.protoInternalPath.collectionSchema),
                fieldSchemaType: this.schemaProto.lookupType(this.protoInternalPath.fieldSchema),
                functionSchemaType: this.schemaProto.lookupType(this.protoInternalPath.functionSchema),
            };
            // Create the payload object with the collection_name, description, and fields.
            // it should follow CollectionSchema in schema.proto
            const payload = (0, __1.formatCollectionSchema)(data, schemaTypes);
            // Create the collectionParams object from the payload.
            const collectionSchema = schemaTypes.collectionSchemaType.create(payload);
            // Encode the collectionParams object to bytes.
            const schemaBytes = schemaTypes.collectionSchemaType
                .encode(collectionSchema)
                .finish();
            // Get the consistency level value from the ConsistencyLevelEnum object.
            const level = (_a = __1.ConsistencyLevelEnum[consistency_level]) !== null && _a !== void 0 ? _a : __1.ConsistencyLevelEnum.Bounded;
            // build the request object
            const req = Object.assign(Object.assign({}, data), { schema: schemaBytes, consistency_level: level, enable_dynamic_field: data.enableDynamicField || data.enable_dynamic_field });
            // if properties is set, parse it to key-value pairs
            if (data.properties) {
                req.properties = (0, __1.parseToKeyValue)(data.properties);
            }
            // Call the promisify function to create the collection.
            const createPromise = yield (0, __1.promisify)(this.channelPool, 'CreateCollection', req, data.timeout || this.timeout);
            // Return the promise.
            return createPromise;
        });
    }
    /**
     * Checks if a collection exists.
     *
     * @param {HasCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to check.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<BoolResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {boolean} value - `true` if the collection exists, `false` otherwise.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.hasCollection({ collection_name: 'my_collection' });
     * ```
     */
    hasCollection(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            let response = {
                status: { error_code: 'Success', reason: '', code: 0 },
                value: true,
            };
            // avoid to call describe collection, because it has cache
            const res = yield (0, __1.promisify)(this.channelPool, 'DescribeCollection', data, data.timeout || this.timeout);
            if (res.status.error_code !== __1.ErrorCode.SUCCESS) {
                response.value = false;
            }
            return response;
        });
    }
    /**
     * Lists all collections or gets the loading status of a collection.
     *
     * @param {ShowCollectionsReq} data - The request parameters.
     * @param {ShowCollectionsType} [data.type] - The type of collections to show. Can be "All" (default) or "Loaded".
     * @param {string[]} [data.collection_names] - If `type` is "Loaded", Milvus will return `collection_names` along with their in-memory percentages.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ShowCollectionsResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {CollectionData[]} data - An array containing information about each collection, including its name, ID, creation timestamp (UTC), and loaded percentage (100 means fully loaded).
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.showCollections();
     * ```
     */
    showCollections(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const req = {
                type: data ? data.type : __1.ShowCollectionsType.All,
                collection_names: (data === null || data === void 0 ? void 0 : data.collection_names) || [],
            };
            if (data === null || data === void 0 ? void 0 : data.db_name) {
                req.db_name = data.db_name;
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'ShowCollections', req, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            const result = [];
            promise.collection_names.forEach((name, index) => {
                result.push({
                    name,
                    id: promise.collection_ids[index],
                    timestamp: promise.created_utc_timestamps[index],
                    loadedPercentage: promise.inMemory_percentages[index],
                });
            });
            promise.data = result;
            return promise;
        });
    }
    /**
     * Modifies collection properties.
     *
     * @param {AlterCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to modify.
     * @param {Object} data.properties - The properties to modify. For example, to change the TTL, use {"collection.ttl.seconds": 18000}.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.alterCollection({
     *    collection_name: 'my-collection',
     *    properties: {"collection.ttl.seconds": 18000}
     *  });
     * ```
     */
    alterCollectionProperties(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const req = {
                collection_name: data.collection_name,
                properties: (0, __1.parseToKeyValue)(data.properties),
            };
            if (data.db_name) {
                req.db_name = data.db_name;
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'AlterCollection', req, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
    /**
     * Drops collection properties.
     * Note that this operation only deletes the properties of the collection, not the collection itself.
     * If you want to delete the collection, use the dropCollection method.
     *
     * @param {DropCollectionPropertiesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to modify.
     * @param {string[]} data.properties - The properties to delete. For example, to delete the TTL, use ["collection.ttl.seconds"].
     * @param {string} [data.db_name] - The name of the database where the collection is located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     * const milvusClient = new milvusClient(MILUVS_ADDRESS);
     * const resStatus = await milvusClient.dropCollectionProperties({
     *  collection_name: 'my-collection',
     *  delete_keys: ["collection.ttl.seconds"]
     * });
     * ```
     *
     */
    dropCollectionProperties(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const req = {
                collection_name: data.collection_name,
                properties: [],
                delete_keys: data.properties,
            };
            if (data.db_name) {
                req.db_name = data.db_name;
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'AlterCollection', Object.assign({}, req), (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
    /**
     * Modifies a collection field's properties.
     * Note that this operation only modifies the properties of the field, not the field itself.
     *
     * @param {AlterCollectionFieldPropertiesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to modify.
     * @param {string} data.field_name - The name of the field to modify.
     * @param {Object} data.properties - The properties to modify. For example, to change field mmap setting and max_length, use { 'mmap.enabled', true, max_length: 128}.
     * @param {string} [data.db_name] - The name of the database where the collection is located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     * const milvusClient = new milvusClient(MILUVS_ADDRESS);
     * const resStatus = await milvusClient.alterCollectionField({
     *   collection_name: 'my-collection',
     *   field_name: 'my-field',
     *   properties: {"mmap.enabled": true}
     * });
     * ```
     */
    alterCollectionFieldProperties(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const req = {
                collection_name: data.collection_name,
                field_name: data.field_name,
                properties: (0, __1.parseToKeyValue)(data.properties),
            };
            if (data.db_name) {
                req.db_name = data.db_name;
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'AlterCollectionField', req, (data === null || data === void 0 ? void 0 : data.timeout) || this.timeout);
            return promise;
        });
    }
    /**
     * Shows the details of a collection, such as its name and schema.
     *
     * @param {DescribeCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to describe.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<DescribeCollectionResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {FieldSchema[]} schema - Information of all fields in this collection.
     * @returns {string} collectionID - The ID of the collection.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.describeCollection({ collection_name: 'my_collection' });
     * ```
     */
    describeCollection(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const key = `${this.metadata.get(__1.METADATA.DATABASE)}:${data.collection_name}`;
            // if we have cache return cache data
            if (this.collectionInfoCache.has(key) && data.cache === true) {
                return Promise.resolve(this.collectionInfoCache.get(key));
            }
            // get new data
            const promise = yield (0, __1.promisify)(this.channelPool, 'DescribeCollection', data, data.timeout || this.timeout);
            const results = (0, __1.formatDescribedCol)(promise);
            // update cache
            this.collectionInfoCache.set(key, results);
            return results;
        });
    }
    /**
     * Show the statistics information of a collection.
     *
     * @param {GetCollectionStatisticsReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to get statistics for.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<StatisticsResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {Object[]} stats - An array of objects, each containing a key-value pair representing a statistic.
     * @returns {Object} data - Transforms **stats** to an object with properties representing statistics (e.g., { row_count: 0 }).
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.getCollectionStatistics({ collection_name: 'my_collection' });
     * ```
     */
    getCollectionStatistics(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const promise = yield (0, __1.promisify)(this.channelPool, 'GetCollectionStatistics', data, data.timeout || this.timeout);
            promise.data = (0, __1.formatKeyValueData)(promise.stats, ['row_count']);
            return promise;
        });
    }
    /**
     * Load collection data into query nodes, then you can do vector search on this collection.
     * It's an async function, but you can use showCollections to check loading status.
     *
     * @param {LoadCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to load.
     * @param {number} [data.replica_number] - The number of replicas.
     * @param {string[]} [data.resource_groups] - The names of the resource groups.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.loadCollection({ collection_name: 'my_collection' });
     * ```
     */
    loadCollectionAsync(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const promise = yield (0, __1.promisify)(this.channelPool, 'LoadCollection', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Refresh the loading status of a collection.
     *
     * @param {RefreshLoadReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to refresh.
     * @param {string} [data.db_name] - The name of the database where the collection is located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.refreshLoad({ collection_name: 'my_collection' });
     * ```
     */
    refreshLoad(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.loadCollectionAsync(Object.assign(Object.assign({}, data), { refresh: true }));
        });
    }
    /**
     * Same function as loadCollection, but it's a synchronous function.
     * Helps to ensure this collection is loaded.
     *
     * @param {LoadCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to load.
     * @param {number} [data.replica_number] - The number of replicas.
     * @param {string[]} [data.resource_groups] - The names of the resource groups.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.loadCollectionSync({ collection_name: 'my_collection' });
     * ```
     */
    loadCollection(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const promise = yield (0, __1.promisify)(this.channelPool, 'LoadCollection', data, data.timeout || this.timeout);
            if (promise.error_code !== __1.ErrorCode.SUCCESS) {
                throw new Error(`ErrorCode: ${promise.error_code}. Reason: ${promise.reason}`);
            }
            let loadedPercentage = 0;
            while (Number(loadedPercentage) < 100) {
                const getLoadingProgressParam = {
                    collection_name: data.collection_name,
                };
                if (data.db_name) {
                    getLoadingProgressParam.db_name = data.db_name;
                }
                let res = yield this.getLoadingProgress(getLoadingProgressParam);
                if (res.status.error_code !== __1.ErrorCode.SUCCESS) {
                    throw new Error(`ErrorCode: ${res.status.error_code}. Reason: ${res.status.reason}`);
                }
                loadedPercentage = Number(res.progress);
                // sleep 400ms
                yield (0, __1.sleep)(400);
            }
            return promise;
        });
    }
    /**
     * Release a collection from cache to reduce cache usage.
     * Note that you cannot search while the corresponding collection is unloaded.
     *
     * @param {ReleaseLoadCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to release.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.releaseCollection({ collection_name: 'my_collection' });
     * ```
     */
    releaseCollection(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const promise = yield (0, __1.promisify)(this.channelPool, 'ReleaseCollection', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Rename a collection.
     *
     * @param {RenameCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The current name of the collection.
     * @param {string} data.new_collection_name - The new name for the collection.
     * @param {string} data.db_name - Optional, the name of the database where the collection is located.
     * @param {string} data.new_db_name - Optional, the name of the database where the new collection will be located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.renameCollection({
     *    collection_name: 'my_collection',
     *    new_collection_name: 'my_new_collection'
     *  });
     * ```
     */
    renameCollection(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const req = {
                oldName: data.collection_name,
                newName: data.new_collection_name,
            };
            // if db_name is set, add it to the request
            if (data.db_name) {
                req.db_name = data.db_name;
            }
            // if new_db_name is set, add it to the request
            if (data.new_db_name) {
                req.newDBName = data.new_db_name;
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'RenameCollection', req, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Drop a collection. Note that this drops all data in the collection.
     *
     * @param {DropCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to drop.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.dropCollection({ collection_name: 'my_collection' });
     * ```
     */
    dropCollection(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const promise = yield (0, __1.promisify)(this.channelPool, 'DropCollection', data, data.timeout || this.timeout);
            this.collectionInfoCache.delete(`${this.metadata.get(__1.METADATA.DATABASE)}:${data.collection_name}`);
            return promise;
        });
    }
    /**
     * Create a collection alias, then you can use the alias instead of the collection_name when you perform a vector search.
     *
     * @param {CreateAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.createAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    createAlias(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            if (!data.alias) {
                throw new Error(__1.ERROR_REASONS.ALIAS_NAME_IS_REQUIRED);
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'CreateAlias', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Describe a collection alias.
     *
     * @param {DescribeAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<DescribeAliasResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} collection - The name of the collection that the alias points to.
     * @returns {string} alias - The alias of the collection.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.describeAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    describeAlias(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            if (!data.alias) {
                throw new Error(__1.ERROR_REASONS.ALIAS_NAME_IS_REQUIRED);
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'DescribeAlias', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * List all aliases of a collection.
     *
     * @param {ListAliasesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListAliasesResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string[]} aliases - The list of aliases of the collection.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.listAliases({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    listAliases(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            if (!data.collection_name) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'ListAliases', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Drop a collection alias.
     *
     * @param {DropAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.dropAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    dropAlias(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data.alias) {
                throw new Error(__1.ERROR_REASONS.ALIAS_NAME_IS_REQUIRED);
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'DropAlias', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Alter a collection alias.
     *
     * @param {AlterAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.alterAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    alterAlias(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            if (!data.alias) {
                throw new Error(__1.ERROR_REASONS.ALIAS_NAME_IS_REQUIRED);
            }
            const promise = yield (0, __1.promisify)(this.channelPool, 'AlterAlias', data, data.timeout || this.timeout);
            return promise;
        });
    }
    /**
     * Perform compaction on a collection. This operation reduces the storage space used by the collection by removing deleted data and optimizing the data layout.
     *
     * @param {CompactReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to compact.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<CompactionResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} compactionID - The ID of the compaction operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.compact({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    compact(data) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, __1.checkCollectionName)(data);
            const collectionInfo = yield this.describeCollection(data);
            const res = yield (0, __1.promisify)(this.channelPool, 'ManualCompaction', {
                collectionID: collectionInfo.collectionID,
            }, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Get the compaction state of a targeted compaction id.
     *
     * @param {GetCompactionStateReq} data - The request parameters.
     * @param {number|string} data.compactionID - The ID of the compaction operation, returned by the compact method.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetCompactionStateResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - The state of the compaction operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getCompactionState({
     *    compactionID: 'your_compaction_id',
     *  });
     * ```
     */
    getCompactionState(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.compactionID) {
                throw new Error(__1.ERROR_REASONS.COMPACTION_ID_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetCompactionState', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Get the compaction states of a targeted compaction id.
     *
     * @param {GetCompactionPlansReq} data - The request parameters.
     * @param {number|string} data.compactionID - The ID of the compaction operation, returned by the compact method.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetCompactionPlansResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - The state of the compaction operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getCompactionStateWithPlans({
     *    compactionID: 'your_compaction_id',
     *  });
     * ```
     */
    getCompactionStateWithPlans(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.compactionID) {
                throw new Error(__1.ERROR_REASONS.COMPACTION_ID_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetCompactionStateWithPlans', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Get replicas of a collection.
     *
     * @param {GetReplicaReq} data - The request parameters.
     * @param {number|string} data.collectionID - The ID of the collection, returned by the compact method.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ReplicasResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {ReplicaInfo[]} replicas - An array of replica information.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getReplicas({
     *    collectionID: 'your_collection_id',
     *  });
     * ```
     *
     * @returns
     * ```
     * {
     *  replicas: [
     *     {
     *      partition_ids: [Array],
     *      shard_replicas: [Array],
     *      node_ids: [Array],
     *      replicaID: '436724291187770258',
     *      collectionID: '436777253933154305'
     *    }
     *  ],
     *  status: { error_code: 'Success', reason: '' }
     * }
     * ```
     */
    getReplicas(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collectionID) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_ID_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetReplicas', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Get the loading progress of a collection.
     *
     * @param {GetLoadingProgressReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetLoadingProgressResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number} total_row_num - The total number of rows in the collection.
     * @returns {number} total_loaded_row_num - The total number of loaded rows in the collection.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getLoadingProgress({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getLoadingProgress(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collection_name) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetLoadingProgress', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Get the loading state of a collection.
     *
     * @param {GetLoadStateReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetLoadStateResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - The loading state of the collection.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getLoadState({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getLoadState(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !data.collection_name) {
                throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
            }
            const res = yield (0, __1.promisify)(this.channelPool, 'GetLoadState', data, data.timeout || this.timeout);
            return res;
        });
    }
    /**
     * Get the primary key field name of a collection.
     *
     * @param {DescribeCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<string>} The primary key field name of the collection.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const pkFieldName = await milvusClient.getPkFieldName({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getPkFieldName(data, desc) {
        return __awaiter(this, void 0, void 0, function* () {
            // get collection info
            const collectionInfo = desc ? desc : yield this.describeCollection(data);
            // pk field
            let pkField = '';
            // extract key information
            for (let i = 0; i < collectionInfo.schema.fields.length; i++) {
                const f = collectionInfo.schema.fields[i];
                // get pk field info
                if (f.is_primary_key) {
                    pkField = f.name;
                    break;
                }
            }
            return pkField;
        });
    }
    /**
     * Get the primary key field type.
     *
     * @param {DescribeCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<keyof typeof DataType>} The primary key field type.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const pkFieldType = await milvusClient.getPkFieldType({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getPkFieldType(data, desc) {
        return __awaiter(this, void 0, void 0, function* () {
            // get collection info
            const collectionInfo = desc ? desc : yield this.describeCollection(data);
            // pk field type
            let pkFieldType = 'Int64';
            // extract key information
            for (let i = 0; i < collectionInfo.schema.fields.length; i++) {
                const f = collectionInfo.schema.fields[i];
                // get pk field type info
                if (f.is_primary_key) {
                    pkFieldType = f.data_type;
                    break;
                }
            }
            return pkFieldType;
        });
    }
    /**
     * Get the primary field
     */
    getPkField(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // get collection info
            const collectionInfo = yield this.describeCollection(data);
            // pk field
            let pkField = collectionInfo.schema.fields[0];
            // extract key information
            for (let i = 0; i < collectionInfo.schema.fields.length; i++) {
                const f = collectionInfo.schema.fields[i];
                // get pk field info
                if (f.is_primary_key) {
                    pkField = f;
                    break;
                }
            }
            return pkField;
        });
    }
}
exports.Collection = Collection;
//# sourceMappingURL=Collection.js.map