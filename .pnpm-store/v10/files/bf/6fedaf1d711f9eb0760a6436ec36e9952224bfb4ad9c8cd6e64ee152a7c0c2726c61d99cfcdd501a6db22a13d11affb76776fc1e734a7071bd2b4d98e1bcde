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
exports.GRPCClient = exports.LOADER_OPTIONS = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const generic_pool_1 = require("generic-pool");
const __1 = require("../");
const User_1 = require("./User");
// default loader options
exports.LOADER_OPTIONS = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true, // populate oneof fields
};
/**
 * A client for interacting with the Milvus server via gRPC.
 */
class GRPCClient extends User_1.User {
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
        // alias
        this.useDatabase = this.use;
        // Get the gRPC service for Milvus
        const MilvusService = (0, __1.getGRPCService)({
            protoPath: this.protoFilePath.milvus,
            serviceName: this.protoInternalPath.serviceName, // the name of the Milvus service
        }, Object.assign(Object.assign({}, exports.LOADER_OPTIONS), this.config.loaderOptions));
        // setup auth if necessary
        const auth = (0, __1.getAuthString)(this.config);
        if (auth.length > 0) {
            this.metadata.set(__1.METADATA.AUTH, auth);
        }
        // setup database
        this.metadata.set(__1.METADATA.DATABASE, this.config.database || __1.DEFAULT_DB);
        // meta interceptor, add the injector
        const metaInterceptor = (0, __1.getMetaInterceptor)(this.metadataListener.bind(this));
        // retry interceptor
        const retryInterceptor = (0, __1.getRetryInterceptor)({
            maxRetries: typeof this.config.maxRetries === 'undefined'
                ? __1.DEFAULT_MAX_RETRIES
                : this.config.maxRetries,
            retryDelay: typeof this.config.retryDelay === 'undefined'
                ? __1.DEFAULT_RETRY_DELAY
                : this.config.retryDelay,
            clientId: this.clientId,
        });
        // interceptors
        const interceptors = [metaInterceptor];
        // add trace if necessary
        if (this.config.trace) {
            // add trace interceptor
            interceptors.push((0, __1.getTraceInterceptor)());
        }
        // add retry interceptor
        interceptors.push(retryInterceptor);
        // add interceptors
        this.channelOptions.interceptors = interceptors;
        // create grpc pool
        this.channelPool = this.createChannelPool(MilvusService);
    }
    // create a grpc service client(connect)
    connect(sdkVersion) {
        // connect to get identifier
        this.connectPromise = this._getServerInfo(sdkVersion);
    }
    /**
     * Creates a pool of gRPC service clients.
     *
     * @param {ServiceClientConstructor} ServiceClientConstructor - The constructor for the gRPC service client.
     *
     * @returns {Pool} - A pool of gRPC service clients.
     */
    createChannelPool(ServiceClientConstructor) {
        var _a;
        return (0, generic_pool_1.createPool)({
            create: () => __awaiter(this, void 0, void 0, function* () {
                // Create a new gRPC service client
                return new ServiceClientConstructor((0, __1.formatAddress)(this.config.address), // format the address
                this.creds, this.channelOptions);
            }),
            destroy: (client) => __awaiter(this, void 0, void 0, function* () {
                // Close the gRPC service client
                return new Promise((resolve, reject) => {
                    client.close();
                    resolve(client.getChannel().getConnectivityState(true));
                });
            }),
        }, (_a = this.config.pool) !== null && _a !== void 0 ? _a : {
            min: __1.DEFAULT_POOL_MIN,
            max: __1.DEFAULT_POOL_MAX,
        });
    }
    /**
     * Injects client metadata into the metadata of the gRPC client.
     * @param metadata The metadata object of the gRPC client.
     * @returns The updated metadata object.
     */
    metadataListener(metadata) {
        // inject client metadata into the metadata of the grpc client
        for (var [key, value] of this.metadata) {
            metadata.add(key, value);
        }
        return metadata;
    }
    /**
     * Sets the active database for the gRPC client.
     * @param data An optional object containing the name of the database to use.
     * @returns A Promise that resolves with a `ResStatus` object.
     */
    use(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                if (!data || data.db_name === '') {
                    __1.logger.info(`No database name provided, using default database: ${__1.DEFAULT_DB}`);
                }
                // update database
                this.metadata.set(__1.METADATA.DATABASE, (data && data.db_name) || __1.DEFAULT_DB);
                resolve({ error_code: __1.ErrorCode.SUCCESS, reason: '' });
            });
        });
    }
    /**
     * Retrieves server information from the Milvus server.
     * @param {string} sdkVersion - The version of the SDK being used.
     * @returns {Promise<void>} - A Promise that resolves when the server information has been retrieved.
     */
    _getServerInfo(sdkVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            // build user info
            const userInfo = {
                client_info: {
                    sdk_type: 'nodejs',
                    sdk_version: sdkVersion,
                    local_time: (0, dayjs_1.default)().format(`YYYY-MM-DD HH:mm:ss.SSS`),
                    user: this.config.username,
                },
            };
            // update connect status
            this.connectStatus = __1.CONNECT_STATUS.CONNECTING;
            return (0, __1.promisify)(this.channelPool, 'Connect', userInfo, this.timeout).then(f => {
                // add new identifier interceptor
                if (f && f.identifier) {
                    // update identifier
                    this.metadata.set(__1.METADATA.CLIENT_ID, f.identifier);
                    // setup identifier
                    this.serverInfo = f.server_info;
                }
                // update connect status
                this.connectStatus =
                    f && f.identifier
                        ? __1.CONNECT_STATUS.CONNECTED
                        : __1.CONNECT_STATUS.UNIMPLEMENTED;
            });
        });
    }
    /**
     * Closes the connection to the Milvus server.
     * This method drains and clears the connection pool, and updates the connection status to SHUTDOWN.
     * @returns {Promise<CONNECT_STATUS>} The updated connection status.
     */
    closeConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            // Close all connections in the pool
            if (this.channelPool) {
                yield this.channelPool.drain();
                yield this.channelPool.clear();
                // update status
                this.connectStatus = __1.CONNECT_STATUS.SHUTDOWN;
            }
            return this.connectStatus;
        });
    }
    /**
     * Returns version information for the Milvus server.
     * This method returns a Promise that resolves with a `GetVersionResponse` object.
     */
    getVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            // wait until connecting finished
            yield this.connectPromise;
            return yield (0, __1.promisify)(this.channelPool, 'GetVersion', {}, this.timeout);
        });
    }
    /**
     * Checks the health of the Milvus server.
     * This method returns a Promise that resolves with a `CheckHealthResponse` object.
     */
    checkHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            // wait until connecting finished
            yield this.connectPromise;
            return yield (0, __1.promisify)(this.channelPool, 'CheckHealth', {}, this.timeout);
        });
    }
}
exports.GRPCClient = GRPCClient;
//# sourceMappingURL=GrpcClient.js.map