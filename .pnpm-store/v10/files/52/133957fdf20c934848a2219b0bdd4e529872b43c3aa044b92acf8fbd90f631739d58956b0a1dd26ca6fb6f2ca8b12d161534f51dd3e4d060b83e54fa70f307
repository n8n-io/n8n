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
import { WeaviateStartUpError } from '../errors.js';
import { AuthAccessTokenCredentials, AuthClientCredentials, AuthUserPasswordCredentials, } from './auth.js';
export function connectToWeaviateCloud(clusterURL, clientMaker, options) {
    // check if the URL is set
    if (!clusterURL)
        throw new Error('Missing `clusterURL` parameter');
    if (!clusterURL.startsWith('http')) {
        clusterURL = `https://${clusterURL}`;
    }
    const url = new URL(clusterURL);
    let grpcHost;
    if (url.hostname.endsWith('.weaviate.network')) {
        const [ident, ...rest] = url.hostname.split('.');
        grpcHost = `${ident}.grpc.${rest.join('.')}`;
    }
    else {
        grpcHost = `grpc-${url.hostname}`;
    }
    const _a = options || {}, { authCredentials: auth, headers } = _a, rest = __rest(_a, ["authCredentials", "headers"]);
    if ([AuthAccessTokenCredentials, AuthClientCredentials, AuthUserPasswordCredentials].some((c) => auth instanceof c)) {
        console.warn('Connecting to Weaviate Cloud (WCD) using OIDC is deprecated and will be removed in August 2025. Please use API keys instead.');
    }
    return clientMaker(Object.assign({ connectionParams: {
            http: {
                secure: true,
                host: url.hostname,
                port: 443,
            },
            grpc: {
                secure: true,
                host: grpcHost,
                port: 443,
            },
        }, auth, headers: options === null || options === void 0 ? void 0 : options.headers }, rest)).catch((e) => {
        throw new WeaviateStartUpError(`Weaviate failed to startup with message: ${e.message}`);
    });
}
export function connectToLocal(clientMaker, options) {
    const _a = options || {}, { host, port, grpcPort, authCredentials: auth } = _a, rest = __rest(_a, ["host", "port", "grpcPort", "authCredentials"]);
    return clientMaker(Object.assign({ connectionParams: {
            http: {
                secure: false,
                host: host || 'localhost',
                port: port || 8080,
            },
            grpc: {
                secure: false,
                host: host || 'localhost',
                port: grpcPort || 50051,
            },
        }, auth }, rest)).catch((e) => {
        throw new WeaviateStartUpError(`Weaviate failed to startup with message: ${e.message}`);
    });
}
export function connectToCustom(clientMaker, options) {
    const _a = options || {}, { httpHost, httpPath, httpPort, httpSecure, grpcHost, grpcPort, grpcSecure, authCredentials: auth } = _a, rest = __rest(_a, ["httpHost", "httpPath", "httpPort", "httpSecure", "grpcHost", "grpcPort", "grpcSecure", "authCredentials"]);
    return clientMaker(Object.assign({ connectionParams: {
            http: {
                secure: httpSecure || false,
                host: httpHost || 'localhost',
                path: httpPath || '',
                port: httpPort || 8080,
            },
            grpc: {
                secure: grpcSecure || false,
                host: grpcHost || 'localhost',
                port: grpcPort || 50051,
            },
        }, auth }, rest)).catch((e) => {
        throw new WeaviateStartUpError(`Weaviate failed to startup with message: ${e.message}`);
    });
}
