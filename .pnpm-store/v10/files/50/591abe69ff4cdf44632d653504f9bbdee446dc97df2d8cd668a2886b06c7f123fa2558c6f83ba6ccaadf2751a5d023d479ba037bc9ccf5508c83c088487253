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
exports.BaseClient = void 0;
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const protobufjs_1 = __importDefault(require("protobufjs"));
const fs_1 = require("fs");
const grpc_js_1 = require("@grpc/grpc-js");
const __1 = require("../");
// path
const milvusProtoPath = path_1.default.resolve(__dirname, '../../proto/proto/milvus.proto');
const schemaProtoPath = path_1.default.resolve(__dirname, '../../proto/proto/schema.proto');
/**
 * Base gRPC client, setup all configuration here
 */
class BaseClient {
    /**
     * Sets up the configuration object for the gRPC client.
     *
     * @param configOrAddress The configuration object or the Milvus address as a string.
     * @param ssl Whether to use SSL or not. Default is false.
     * @param username The username for authentication. Required if password is provided.
     * @param password The password for authentication. Required if username is provided.
     */
    constructor(configOrAddress, ssl, username, password, channelOptions) {
        var _a, _b, _c, _d, _e;
        // Client ID
        this.clientId = `${crypto_1.default.randomUUID()}`;
        // flags to indicate that if the connection is established and its state
        this.connectStatus = __1.CONNECT_STATUS.NOT_CONNECTED;
        // connection promise
        this.connectPromise = Promise.resolve();
        // TLS mode, by default it is disabled
        this.tlsMode = __1.TLS_MODE.DISABLED;
        // server info
        this.serverInfo = {};
        // // The gRPC client instance.
        // public client!: Promise<Client>;
        // The timeout for connecting to the Milvus service.
        this.timeout = __1.DEFAULT_CONNECT_TIMEOUT;
        // The path to the Milvus protobuf file, user can define it from clientConfig
        this.protoFilePath = {
            milvus: milvusProtoPath,
            schema: schemaProtoPath,
        };
        // global metadata, send each grpc request with it
        this.metadata = new Map();
        // milvus proto
        this.protoInternalPath = {
            serviceName: 'milvus.proto.milvus.MilvusService',
            collectionSchema: 'milvus.proto.schema.CollectionSchema',
            fieldSchema: 'milvus.proto.schema.FieldSchema',
            functionSchema: 'milvus.proto.schema.FunctionSchema',
        };
        let config;
        // If a configuration object is provided, use it. Otherwise, create a new object with the provided parameters.
        if (typeof configOrAddress === 'object') {
            config = configOrAddress;
        }
        else {
            config = {
                address: configOrAddress,
                ssl,
                username,
                password,
                channelOptions,
            };
        }
        // Check if the Milvus address is set.
        if (!config.address) {
            throw new Error(__1.ERROR_REASONS.MILVUS_ADDRESS_IS_REQUIRED);
        }
        // make sure these are strings.
        config.username = config.username || '';
        config.password = config.password || '';
        // overwrite ID if necessary
        if (config.id) {
            this.clientId = config.id;
        }
        // Assign the configuration object.
        this.config = config;
        // setup proto file path
        if (this.config.protoFilePath) {
            const { milvus, schema } = this.config.protoFilePath;
            this.protoFilePath.milvus = milvus !== null && milvus !== void 0 ? milvus : this.protoFilePath.milvus;
            this.protoFilePath.schema = schema !== null && schema !== void 0 ? schema : this.protoFilePath.schema;
        }
        // Load the Milvus protobuf
        this.schemaProto = protobufjs_1.default.loadSync(this.protoFilePath.schema);
        this.milvusProto = protobufjs_1.default.loadSync(this.protoFilePath.milvus);
        // options
        this.channelOptions = Object.assign({ 
            // Milvus default max_receive_message_length is 100MB, but Milvus support change max_receive_message_length .
            // So SDK should support max_receive_message_length unlimited.
            'grpc.max_receive_message_length': -1, 'grpc.max_send_message_length': -1, 'grpc.keepalive_time_ms': 55 * 1000, 'grpc.keepalive_timeout_ms': 5 * 1000, 'grpc.keepalive_permit_without_calls': 1, 'grpc.enable_retries': 1 }, this.config.channelOptions);
        // overwrite if server name is provided.
        if ((_a = this.config.tls) === null || _a === void 0 ? void 0 : _a.serverName) {
            this.channelOptions[`grpc.ssl_target_name_override`] =
                this.config.tls.serverName;
        }
        // If the address starts with 'https://' or SSL is enabled, set to one-way authentication
        this.tlsMode =
            this.config.address.startsWith('https://') || this.config.ssl
                ? __1.TLS_MODE.ONE_WAY
                : __1.TLS_MODE.DISABLED;
        // If the root certificate path is provided, also set to one-way authentication
        this.tlsMode =
            this.config.tls &&
                (this.config.tls.rootCert || this.config.tls.rootCertPath)
                ? __1.TLS_MODE.ONE_WAY
                : this.tlsMode;
        // If the private key path is provided, set to two-way authentication
        this.tlsMode =
            this.config.tls &&
                (this.config.tls.privateKey || this.config.tls.privateKeyPath)
                ? __1.TLS_MODE.TWO_WAY
                : this.tlsMode;
        this.tlsMode = ((_b = this.config.tls) === null || _b === void 0 ? void 0 : _b.skipCertCheck) ? __1.TLS_MODE.UNAUTHORIZED : this.tlsMode;
        // Create credentials based on the TLS mode
        switch (this.tlsMode) {
            case __1.TLS_MODE.ONE_WAY:
                // For one-way authentication, create SSL credentials with the root certificate if provided
                const sslOption = ((_c = this.config.tls) === null || _c === void 0 ? void 0 : _c.rootCertPath)
                    ? (0, fs_1.readFileSync)((_d = this.config.tls) === null || _d === void 0 ? void 0 : _d.rootCertPath)
                    : ((_e = this.config.tls) === null || _e === void 0 ? void 0 : _e.rootCert) || undefined;
                this.creds = grpc_js_1.credentials.createSsl(sslOption);
                break;
            case __1.TLS_MODE.TWO_WAY:
                // For two-way authentication, create SSL credentials with the root certificate, private key, certificate chain, and verify options
                const { rootCertPath, rootCert, privateKeyPath, privateKey, certChainPath, certChain, verifyOptions, } = this.config.tls;
                const rootCertBuff = rootCert
                    ? rootCert
                    : rootCertPath
                        ? (0, fs_1.readFileSync)(rootCertPath)
                        : null;
                const privateKeyBuff = privateKey
                    ? privateKey
                    : privateKeyPath
                        ? (0, fs_1.readFileSync)(privateKeyPath)
                        : null;
                const certChainBuff = certChain
                    ? certChain
                    : certChainPath
                        ? (0, fs_1.readFileSync)(certChainPath)
                        : null;
                this.creds = grpc_js_1.credentials.createSsl(rootCertBuff, privateKeyBuff, certChainBuff, verifyOptions);
                break;
            case __1.TLS_MODE.UNAUTHORIZED:
                const opts = {
                    checkServerIdentity: () => { return undefined; },
                    rejectUnauthorized: false
                };
                this.creds = grpc_js_1.credentials.createSsl(null, null, null, opts);
                break;
            default:
                // If no TLS mode is specified, create insecure credentials
                this.creds = grpc_js_1.credentials.createInsecure();
                break;
        }
        // Set up the timeout for connecting to the Milvus service.
        this.timeout =
            typeof config.timeout === 'string'
                ? (0, __1.parseTimeToken)(config.timeout)
                : config.timeout || __1.DEFAULT_CONNECT_TIMEOUT;
    }
    /**
     * Checks the compatibility of the SDK with the Milvus server.
     *
     * @param {Object} data - Optional data object.
     * @param {string} data.message - The error message to throw if the SDK is incompatible.
     * @param {Function} data.checker - A function to call if the SDK is compatible.
     * @throws {Error} If the SDK is incompatible with the server.
     */
    checkCompatibility(data = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            // wait until connecting finished
            yield this.connectPromise;
            // if the connect command is successful and nothing returned
            // we need to check the compatibility for older milvus
            if (this.connectStatus === __1.CONNECT_STATUS.UNIMPLEMENTED) {
                // if checker available, use checker instead
                if (data.checker) {
                    return data.checker();
                }
                throw new Error(data.message ||
                    `This version of sdk is incompatible with the server, please downgrade your sdk or upgrade your server.`);
            }
        });
    }
}
exports.BaseClient = BaseClient;
//# sourceMappingURL=BaseClient.js.map