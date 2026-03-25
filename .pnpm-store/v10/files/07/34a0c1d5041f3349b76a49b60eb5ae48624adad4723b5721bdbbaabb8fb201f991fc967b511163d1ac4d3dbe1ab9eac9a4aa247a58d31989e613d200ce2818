var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { backup } from './collections/backup/client.js';
import cluster from './collections/cluster/index.js';
import { configGuards } from './collections/config/index.js';
import { configure, reconfigure } from './collections/configure/index.js';
import collections, { queryFactory } from './collections/index.js';
import { ApiKey, AuthAccessTokenCredentials, AuthClientCredentials, AuthUserPasswordCredentials, isApiKey, mapApiKey, } from './connection/auth.js';
import * as helpers from './connection/helpers.js';
import { ConnectionGRPC } from './connection/index.js';
import MetaGetter from './misc/metaGetter.js';
import roles, { permissions } from './roles/index.js';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { LiveChecker, OpenidConfigurationGetter, ReadyChecker } from './misc/index.js';
import weaviateV2 from './v2/index.js';
import alias from './alias/index.js';
import filter from './collections/filters/index.js';
import groups from './groups/index.js';
import users from './users/index.js';
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
export function connectToCustom(options) {
    return helpers.connectToCustom(client, options);
}
/**
 * Connect to a locally-deployed Weaviate instance, e.g. as a Docker compose stack.
 *
 * @param {ConnectToLocalOptions} [options] Options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your local Weaviate instance.
 */
export function connectToLocal(options) {
    return helpers.connectToLocal(client, options);
}
/**
 * Connect to your own Weaviate Cloud (WCD) instance.
 *
 * @deprecated Use `connectToWeaviateCloud` instead.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWCDOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCD instance.
 */
export function connectToWCD(clusterURL, options) {
    console.warn('The `connectToWCD` method is deprecated. Please use `connectToWeaviateCloud` instead. This method will be removed in a future release.');
    return helpers.connectToWeaviateCloud(clusterURL, client, options);
}
/**
 * Connect to your own Weaviate Cloud Service (WCS) instance.
 *
 * @deprecated Use `connectToWeaviateCloud` instead.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWCSOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCS instance.
 */
export function connectToWCS(clusterURL, options) {
    console.warn('The `connectToWCS` method is deprecated. Please use `connectToWeaviateCloud` instead. This method will be removed in a future release.');
    return helpers.connectToWeaviateCloud(clusterURL, client, options);
}
/**
 * Connect to your own Weaviate Cloud (WCD) instance.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWeaviateCloudOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCD instance.
 */
export function connectToWeaviateCloud(clusterURL, options) {
    return helpers.connectToWeaviateCloud(clusterURL, client, options);
}
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
        const agent = httpSecure ? new HttpsAgent({ keepAlive: true }) : new HttpAgent({ keepAlive: true });
        const { connection, dbVersionProvider, dbVersionSupport } = yield ConnectionGRPC.use({
            host: `${scheme}://${httpHost}:${httpPort}${httpPath || ''}`,
            scheme: scheme,
            headers: params.headers,
            grpcAddress: `${grpcHost}:${grpcPort}`,
            grpcSecure: grpcSecure,
            grpcProxyUrl: (_a = params.proxies) === null || _a === void 0 ? void 0 : _a.grpc,
            apiKey: isApiKey(params.auth) ? mapApiKey(params.auth) : undefined,
            authClientSecret: isApiKey(params.auth) ? undefined : params.auth,
            agent,
            timeout: params.timeout,
            skipInitChecks: params.skipInitChecks,
        });
        const ifc = {
            alias: alias(connection),
            backup: backup(connection),
            cluster: cluster(connection),
            collections: collections(connection, dbVersionSupport),
            groups: groups(connection),
            roles: roles(connection),
            users: users(connection),
            close: () => Promise.resolve(connection.close()), // hedge against future changes to add I/O to .close()
            getMeta: () => new MetaGetter(connection).do(),
            getConnectionDetails: connection.getDetails,
            getOpenIDConfig: () => new OpenidConfigurationGetter(connection.http).do(),
            getWeaviateVersion: () => dbVersionSupport.getVersion(),
            isLive: () => new LiveChecker(connection, dbVersionProvider).do(),
            isReady: () => new ReadyChecker(connection, dbVersionProvider).do(),
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
    ApiKey,
    AuthUserPasswordCredentials,
    AuthAccessTokenCredentials,
    AuthClientCredentials,
    configure,
    configGuards,
    filter: filter(),
    reconfigure,
    permissions,
    query: queryFactory,
};
export default app;
export * from './collections/index.js';
export * from './connection/index.js';
export * from './roles/types.js';
export * from './utils/base64.js';
export * from './utils/uuid.js';
export { ApiKey, AuthAccessTokenCredentials, AuthClientCredentials, AuthUserPasswordCredentials, weaviateV2, };
