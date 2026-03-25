var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { isAbortError } from 'abort-controller-x';
import ConnectionGQL from './gql.js';
import { ChannelCredentials, createChannel, createClientFactory, Metadata, Status, } from 'nice-grpc';
import { retryMiddleware } from 'nice-grpc-client-middleware-retry';
import { HealthCheckResponse_ServingStatus, HealthDefinition } from '../proto/google/health/v1/health.js';
import { WeaviateDefinition } from '../proto/v1/weaviate.js';
import Batcher from '../grpc/batcher.js';
import Searcher from '../grpc/searcher.js';
import TenantsManager from '../grpc/tenantsManager.js';
import { DbVersionSupport, initDbVersionProvider } from '../utils/dbVersion.js';
import { WeaviateGRPCUnavailableError, WeaviateUnsupportedFeatureError } from '../errors.js';
import Aggregator from '../grpc/aggregator.js';
const clientFactory = createClientFactory().use(retryMiddleware);
const MAX_GRPC_MESSAGE_LENGTH = 104858000; // 10mb, needs to be synchronized with GRPC server
// Must extend from ConnectionGQL so that it can be passed to all the builder methods,
// which are tightly coupled to ConnectionGQL
class ConnectionGRPC extends ConnectionGQL {
    constructor(params) {
        super(params);
        this.batch = (collection, consistencyLevel, tenant) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.grpc.batch(collection, consistencyLevel, tenant, `Bearer ${token}`));
            }
            return new Promise((resolve) => resolve(this.grpc.batch(collection, consistencyLevel, tenant)));
        };
        this.aggregate = (collection, consistencyLevel, tenant) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.grpc.aggregate(collection, consistencyLevel, tenant, `Bearer ${token}`));
            }
            return new Promise((resolve) => resolve(this.grpc.aggregate(collection, consistencyLevel, tenant)));
        };
        this.search = (collection, consistencyLevel, tenant) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.grpc.search(collection, consistencyLevel, tenant, `Bearer ${token}`));
            }
            return new Promise((resolve) => resolve(this.grpc.search(collection, consistencyLevel, tenant)));
        };
        this.tenants = (collection) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.grpc.tenants(collection, `Bearer ${token}`));
            }
            return new Promise((resolve) => resolve(this.grpc.tenants(collection)));
        };
        this.close = () => {
            this.grpc.close();
            this.http.close();
        };
        this.grpc = grpcClient(params);
    }
    static connect(params, grpcMaxLengthPromise) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield grpcMaxLengthPromise.then((grpcMaxMessageLength) => new ConnectionGRPC(Object.assign(Object.assign({}, params), { grpcMaxMessageLength })));
            const isHealthy = yield connection.grpc.health();
            if (!isHealthy) {
                yield connection.close();
                throw new WeaviateGRPCUnavailableError(params.grpcAddress);
            }
            return connection;
        });
    }
}
ConnectionGRPC.use = (params) => {
    const rest = new ConnectionGQL(params);
    const dbVersionProvider = initDbVersionProvider(rest);
    const dbVersionSupport = new DbVersionSupport(dbVersionProvider);
    if (params.skipInitChecks) {
        return {
            connection: new ConnectionGRPC(Object.assign(Object.assign({}, params), { grpcMaxMessageLength: MAX_GRPC_MESSAGE_LENGTH })),
            dbVersionProvider,
            dbVersionSupport,
        };
    }
    return Promise.all([
        ConnectionGRPC.connect(params, rest.get('/meta', true).then((res) => res.grpcMaxMessageSize || MAX_GRPC_MESSAGE_LENGTH)),
        dbVersionSupport.supportsCompatibleGrpcService().then((check) => {
            if (!check.supports) {
                throw new WeaviateUnsupportedFeatureError(`Checking for gRPC compatibility failed with message: ${check.message}`);
            }
        }),
    ]).then(([connection]) => {
        return { connection, dbVersionProvider, dbVersionSupport };
    });
};
export default ConnectionGRPC;
export const grpcClient = (config) => {
    const channelOptions = {
        'grpc.max_send_message_length': config.grpcMaxMessageLength,
        'grpc.max_receive_message_length': config.grpcMaxMessageLength,
    };
    if (config.grpcProxyUrl) {
        // grpc.http_proxy is not used by grpc.js under-the-hood
        // only uses the env var and whether http_proxy is enabled
        process.env.grpc_proxy = config.grpcProxyUrl;
        channelOptions['grpc.enabled_http_proxy'] = true;
    }
    const channel = createChannel(config.grpcAddress, config.grpcSecure ? ChannelCredentials.createSsl() : ChannelCredentials.createInsecure(), channelOptions);
    const client = clientFactory.create(WeaviateDefinition, channel);
    const health = clientFactory.create(HealthDefinition, channel);
    return {
        aggregate: (collection, consistencyLevel, tenant, bearerToken) => {
            var _a;
            return Aggregator.use(client, collection, getMetadataWithEmbeddingServiceAuth(config, bearerToken), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.query) || 30, consistencyLevel, tenant);
        },
        batch: (collection, consistencyLevel, tenant, bearerToken) => {
            var _a;
            return Batcher.use(client, collection, getMetadataWithEmbeddingServiceAuth(config, bearerToken), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.insert) || 90, consistencyLevel, tenant);
        },
        close: () => channel.close(),
        health: () => {
            var _a;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), (((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.init) || 2) * 1000);
            return health
                .check({ service: '/grpc.health.v1.Health/Check' }, {
                signal: controller.signal,
                retry: true,
                retryMaxAttempts: 1,
                retryableStatuses: [Status.UNAVAILABLE],
                onRetryableError(error, attempt, delayMs) {
                    console.warn(error, `Healthcheck ${attempt} failed. Retrying in ${delayMs}ms.`);
                },
            })
                .then((res) => res.status === HealthCheckResponse_ServingStatus.SERVING)
                .catch((err) => {
                if (isAbortError(err)) {
                    throw new WeaviateGRPCUnavailableError(config.grpcAddress);
                }
                throw err;
            })
                .finally(() => clearTimeout(timeoutId));
        },
        search: (collection, consistencyLevel, tenant, bearerToken) => {
            var _a;
            return Searcher.use(client, collection, getMetadataWithEmbeddingServiceAuth(config, bearerToken), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.query) || 30, consistencyLevel, tenant);
        },
        tenants: (collection, bearerToken) => {
            var _a;
            return TenantsManager.use(client, collection, new Metadata(bearerToken ? Object.assign(Object.assign({}, config.headers), { authorization: bearerToken }) : config.headers), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.query) || 30);
        },
    };
};
const getMetadataWithEmbeddingServiceAuth = (config, bearerToken) => new Metadata(bearerToken
    ? Object.assign(Object.assign({}, config.headers), { authorization: bearerToken, 'X-Weaviate-Cluster-Url': config.host, 
        //  keeping for backwards compatibility for older clusters for now. On newer clusters, Embedding Service reuses Authorization header.
        'X-Weaviate-Api-Key': bearerToken }) : config.headers);
