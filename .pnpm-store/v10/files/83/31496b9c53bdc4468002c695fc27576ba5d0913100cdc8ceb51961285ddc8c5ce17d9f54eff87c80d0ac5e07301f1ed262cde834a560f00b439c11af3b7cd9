"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.weaviateV2 = exports.AuthUserPasswordCredentials = exports.AuthClientCredentials = exports.AuthAccessTokenCredentials = exports.ApiKey = exports.connectToWeaviateCloud = exports.connectToWCS = exports.connectToWCD = exports.connectToLocal = exports.connectToCustom = void 0;
const client_js_1 = require("./collections/backup/client.js");
const index_js_1 = __importDefault(require("./collections/cluster/index.js"));
const index_js_2 = require("./collections/config/index.js");
const index_js_3 = require("./collections/configure/index.js");
const index_js_4 = __importStar(require("./collections/index.js"));
const auth_js_1 = require("./connection/auth.js");
Object.defineProperty(exports, "ApiKey", { enumerable: true, get: function () { return auth_js_1.ApiKey; } });
Object.defineProperty(exports, "AuthAccessTokenCredentials", { enumerable: true, get: function () { return auth_js_1.AuthAccessTokenCredentials; } });
Object.defineProperty(exports, "AuthClientCredentials", { enumerable: true, get: function () { return auth_js_1.AuthClientCredentials; } });
Object.defineProperty(exports, "AuthUserPasswordCredentials", { enumerable: true, get: function () { return auth_js_1.AuthUserPasswordCredentials; } });
const helpers = __importStar(require("./connection/helpers.js"));
const index_js_5 = require("./connection/index.js");
const metaGetter_js_1 = __importDefault(require("./misc/metaGetter.js"));
const index_js_6 = __importStar(require("./roles/index.js"));
const http_1 = require("http");
const https_1 = require("https");
const index_js_7 = require("./misc/index.js");
const index_js_8 = __importDefault(require("./v2/index.js"));
exports.weaviateV2 = index_js_8.default;
const index_js_9 = __importDefault(require("./alias/index.js"));
const index_js_10 = __importDefault(require("./collections/filters/index.js"));
const index_js_11 = __importDefault(require("./groups/index.js"));
const index_js_12 = __importDefault(require("./users/index.js"));
const cleanHost = (host, protocol) => {
    if (host.includes('http')) {
        console.warn(`The ${protocol}.host parameter should not include the protocol. Please remove the http:// or https:// from the ${protocol}.host parameter.\
      To specify a secure connection, set the secure parameter to true. The protocol will be inferred from the secure parameter instead.`);
        return host.replace('http://', '').replace('https://', '');
    }
    return host;
};
/**
 * Connect to a custom Weaviate deployment, e.g. your own self-hosted Kubernetes cluster.
 *
 * @param {ConnectToCustomOptions} options Options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your custom Weaviate deployment.
 */
function connectToCustom(options) {
    return helpers.connectToCustom(client, options);
}
exports.connectToCustom = connectToCustom;
/**
 * Connect to a locally-deployed Weaviate instance, e.g. as a Docker compose stack.
 *
 * @param {ConnectToLocalOptions} [options] Options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your local Weaviate instance.
 */
function connectToLocal(options) {
    return helpers.connectToLocal(client, options);
}
exports.connectToLocal = connectToLocal;
/**
 * Connect to your own Weaviate Cloud (WCD) instance.
 *
 * @deprecated Use `connectToWeaviateCloud` instead.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWCDOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCD instance.
 */
function connectToWCD(clusterURL, options) {
    console.warn('The `connectToWCD` method is deprecated. Please use `connectToWeaviateCloud` instead. This method will be removed in a future release.');
    return helpers.connectToWeaviateCloud(clusterURL, client, options);
}
exports.connectToWCD = connectToWCD;
/**
 * Connect to your own Weaviate Cloud Service (WCS) instance.
 *
 * @deprecated Use `connectToWeaviateCloud` instead.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWCSOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCS instance.
 */
function connectToWCS(clusterURL, options) {
    console.warn('The `connectToWCS` method is deprecated. Please use `connectToWeaviateCloud` instead. This method will be removed in a future release.');
    return helpers.connectToWeaviateCloud(clusterURL, client, options);
}
exports.connectToWCS = connectToWCS;
/**
 * Connect to your own Weaviate Cloud (WCD) instance.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWeaviateCloudOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCD instance.
 */
function connectToWeaviateCloud(clusterURL, options) {
    return helpers.connectToWeaviateCloud(clusterURL, client, options);
}
exports.connectToWeaviateCloud = connectToWeaviateCloud;
function client(params) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let { host: httpHost } = params.connectionParams.http;
        let { host: grpcHost } = params.connectionParams.grpc;
        const { port: httpPort, secure: httpSecure, path: httpPath } = params.connectionParams.http;
        const { port: grpcPort, secure: grpcSecure } = params.connectionParams.grpc;
        httpHost = cleanHost(httpHost, 'rest');
        grpcHost = cleanHost(grpcHost, 'grpc');
        // check if headers are set
        if (!params.headers)
            params.headers = {};
        const scheme = httpSecure ? 'https' : 'http';
        const agent = httpSecure ? new https_1.Agent({ keepAlive: true }) : new http_1.Agent({ keepAlive: true });
        const { connection, dbVersionProvider, dbVersionSupport } = yield index_js_5.ConnectionGRPC.use({
            host: `${scheme}://${httpHost}:${httpPort}${httpPath || ''}`,
            scheme: scheme,
            headers: params.headers,
            grpcAddress: `${grpcHost}:${grpcPort}`,
            grpcSecure: grpcSecure,
            grpcProxyUrl: (_a = params.proxies) === null || _a === void 0 ? void 0 : _a.grpc,
            apiKey: (0, auth_js_1.isApiKey)(params.auth) ? (0, auth_js_1.mapApiKey)(params.auth) : undefined,
            authClientSecret: (0, auth_js_1.isApiKey)(params.auth) ? undefined : params.auth,
            agent,
            timeout: params.timeout,
            skipInitChecks: params.skipInitChecks,
        });
        const ifc = {
            alias: (0, index_js_9.default)(connection),
            backup: (0, client_js_1.backup)(connection),
            cluster: (0, index_js_1.default)(connection),
            collections: (0, index_js_4.default)(connection, dbVersionSupport),
            groups: (0, index_js_11.default)(connection),
            roles: (0, index_js_6.default)(connection),
            users: (0, index_js_12.default)(connection),
            close: () => Promise.resolve(connection.close()), // hedge against future changes to add I/O to .close()
            getMeta: () => new metaGetter_js_1.default(connection).do(),
            getConnectionDetails: connection.getDetails,
            getOpenIDConfig: () => new index_js_7.OpenidConfigurationGetter(connection.http).do(),
            getWeaviateVersion: () => dbVersionSupport.getVersion(),
            isLive: () => new index_js_7.LiveChecker(connection, dbVersionProvider).do(),
            isReady: () => new index_js_7.ReadyChecker(connection, dbVersionProvider).do(),
        };
        if (connection.oidcAuth)
            ifc.oidcAuth = connection.oidcAuth;
        return ifc;
    });
}
const app = {
    connectToCustom,
    connectToLocal,
    connectToWCD,
    connectToWCS,
    connectToWeaviateCloud,
    client,
    ApiKey: auth_js_1.ApiKey,
    AuthUserPasswordCredentials: auth_js_1.AuthUserPasswordCredentials,
    AuthAccessTokenCredentials: auth_js_1.AuthAccessTokenCredentials,
    AuthClientCredentials: auth_js_1.AuthClientCredentials,
    configure: index_js_3.configure,
    configGuards: index_js_2.configGuards,
    filter: (0, index_js_10.default)(),
    reconfigure: index_js_3.reconfigure,
    permissions: index_js_6.permissions,
    query: index_js_4.queryFactory,
};
exports.default = app;
__exportStar(require("./collections/index.js"), exports);
__exportStar(require("./connection/index.js"), exports);
__exportStar(require("./roles/types.js"), exports);
__exportStar(require("./utils/base64.js"), exports);
__exportStar(require("./utils/uuid.js"), exports);
