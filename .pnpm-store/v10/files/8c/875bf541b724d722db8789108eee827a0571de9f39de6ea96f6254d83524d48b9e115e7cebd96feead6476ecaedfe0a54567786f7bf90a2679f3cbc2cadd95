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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilvusClient = void 0;
const _1 = require(".");
const sdk_json_1 = __importDefault(require("../sdk.json"));
/**
 * Milvus Client class that extends GRPCClient and handles communication with Milvus server.
 */
class MilvusClient extends _1.GRPCClient {
    /**
     * Returns the SDK information.
     * SDK information will be generated on the building phase
     * @returns Object containing SDK version and recommended Milvus version.
     */
    static get sdkInfo() {
        return {
            version: sdk_json_1.default.version,
            recommendMilvus: sdk_json_1.default.milvusVersion,
        };
    }
    /**
     * Creates a new instance of MilvusClient.
     * @param configOrAddress The Milvus server's address or client configuration object.
     * @param ssl Whether to use SSL or not.
     * @param username The username for authentication.
     * @param password The password for authentication.
     * @param channelOptions Additional channel options for gRPC.
     */
    constructor(configOrAddress, ssl, username, password, channelOptions) {
        // setup the configuration
        super(configOrAddress, ssl, username, password, channelOptions);
        // setup logger level if needed, winton logger is following singleton pattern.
        if (this.config.logLevel) {
            _1.logger.level = this.config.logLevel;
        }
        if (this.config.logPrefix) {
            _1.logger.defaultMeta = { service: this.config.logPrefix };
        }
        _1.logger.debug(`new client initialized, version: ${MilvusClient.sdkInfo.version} `);
        // If the configOrAddress is a string (i.e., the server's address), or if the configOrAddress object does not have the __SKIP_CONNECT__ property set to true, then establish a connection to the Milvus server using the current SDK version.
        if (typeof configOrAddress === 'string' ||
            !configOrAddress.__SKIP_CONNECT__) {
            this.connect(MilvusClient.sdkInfo.version);
        }
    }
    // High level API: align with python MilvusClient
    /**
     * Creates a new collection with the given parameters.
     * @function create_collection
     * @param {CreateColReq | CreateColWithSchemaAndIndexParamsReq | CreateCollectionReq} data - The data required to create the collection.
     * @returns {Promise<ResStatus>} - The result of the operation.
     */
    createCollection(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // check compatibility
            yield this.checkCompatibility({
                checker: () => {
                    (0, _1.checkCreateCollectionCompatibility)(data);
                },
            });
            // Check if fields and collection_name are present, otherwise throw an error.
            if (!data.collection_name) {
                throw new Error(_1.ERROR_REASONS.CREATE_COLLECTION_CHECK_PARAMS);
            }
            // if fields or schema are in the data, use old _createCollection
            if ('fields' in data || 'schema' in data) {
                const createCollectionRes = yield this._createCollection(data);
                if (createCollectionRes.error_code !== _1.ErrorCode.SUCCESS) {
                    throw new Error(createCollectionRes.reason);
                }
                // if index params available
                if ('index_params' in data) {
                    const indexParams = Array.isArray(data.index_params)
                        ? data.index_params
                        : [data.index_params];
                    const indexCreates = yield Promise.all(indexParams.map(indexParam => {
                        return this.createIndex(Object.assign(indexParam, {
                            collection_name: data.collection_name,
                        }));
                    }));
                    // check if all index creation is successful
                    const failedIndex = indexCreates.find(indexCreate => indexCreate.error_code !== _1.ErrorCode.SUCCESS);
                    if (failedIndex) {
                        throw new Error(failedIndex.reason);
                    }
                    // load collection sync
                    yield this.loadCollectionSync({
                        collection_name: data.collection_name,
                    });
                    // return
                    return createCollectionRes;
                }
                // just return create collection response
                return createCollectionRes;
            }
            const { collection_name, dimension, primary_field_name = _1.DEFAULT_PRIMARY_KEY_FIELD, id_type = _1.DataType.Int64, metric_type = _1.DEFAULT_METRIC_TYPE, vector_field_name = _1.DEFAULT_VECTOR_FIELD, enableDynamicField = true, enable_dynamic_field = true, auto_id = false, index_params = {}, timeout, consistency_level, } = data;
            // prepare result
            let result = { error_code: '', reason: '' };
            // check if the collection is existing
            const exist = yield this.hasCollection({ collection_name });
            let indexNotExist = true;
            // if not, create one
            if (!exist.value) {
                // build schema
                const schema = (0, _1.buildDefaultSchema)({
                    primary_field_name,
                    id_type,
                    vector_field_name,
                    dimension,
                    auto_id,
                });
                // create collection
                result = yield this.createCollection({
                    collection_name,
                    enable_dynamic_field: enableDynamicField || enable_dynamic_field,
                    fields: schema,
                    timeout,
                    consistency_level,
                });
                if (result.error_code !== _1.ErrorCode.SUCCESS) {
                    throw new Error(result.reason);
                }
            }
            else {
                const info = yield this.describeIndex({ collection_name });
                indexNotExist = info.status.error_code === _1.ErrorCode.IndexNotExist;
            }
            if (indexNotExist) {
                const createIndexParam = {
                    collection_name,
                    field_name: vector_field_name,
                    extra_params: Object.assign({ metric_type }, index_params),
                };
                // create index
                const createIndexPromise = yield this.createIndex(createIndexParam);
                // if failed, throw the error
                if (createIndexPromise.error_code !== _1.ErrorCode.SUCCESS) {
                    throw new Error(createIndexPromise.reason);
                }
            }
            else {
                _1.logger.info(`Collection ${collection_name} is already existed and indexed, index params ignored.`);
            }
            // load collection
            const loadIndexPromise = yield this.loadCollectionSync({
                collection_name,
            });
            // if failed, throw the error
            if (loadIndexPromise.error_code !== _1.ErrorCode.SUCCESS) {
                throw new Error(loadIndexPromise.reason);
            }
            return result;
        });
    }
}
exports.MilvusClient = MilvusClient;
//# sourceMappingURL=MilvusClient.js.map