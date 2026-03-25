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
exports.httpClient = void 0;
const abort_controller_x_1 = require("abort-controller-x");
const openidConfigurationGetter_js_1 = __importDefault(require("../misc/openidConfigurationGetter.js"));
const errors_js_1 = require("../errors.js");
const auth_js_1 = require("./auth.js");
class ConnectionREST {
    constructor(params) {
        this.postReturn = (path, payload) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.http.post(path, payload, true, token));
            }
            return this.http.post(path, payload, true, '');
        };
        this.postEmpty = (path, payload) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.http.post(path, payload, false, token));
            }
            return this.http.post(path, payload, false, '');
        };
        this.put = (path, payload, expectReturnContent = true) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.http.put(path, payload, expectReturnContent, token));
            }
            return this.http.put(path, payload, expectReturnContent);
        };
        this.patch = (path, payload) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.http.patch(path, payload, token));
            }
            return this.http.patch(path, payload);
        };
        this.delete = (path, payload, expectReturnContent = false) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.http.delete(path, payload, expectReturnContent, token));
            }
            return this.http.delete(path, payload, expectReturnContent);
        };
        this.head = (path, payload) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.http.head(path, payload, token));
            }
            return this.http.head(path, payload);
        };
        this.get = (path, expectReturnContent = true) => {
            if (this.authEnabled) {
                return this.login().then((token) => this.http.get(path, expectReturnContent, token));
            }
            return this.http.get(path, expectReturnContent);
        };
        this.login = () => __awaiter(this, void 0, void 0, function* () {
            if (this.apiKey) {
                return this.apiKey;
            }
            if (!this.oidcAuth) {
                return '';
            }
            const localConfig = yield new openidConfigurationGetter_js_1.default(this.http).do();
            if (localConfig === undefined) {
                console.warn('client is configured for authentication, but server is not');
                return '';
            }
            if (Date.now() >= this.oidcAuth.getExpiresAt()) {
                yield this.oidcAuth.refresh(localConfig);
            }
            return this.oidcAuth.getAccessToken();
        });
        this.getDetails = () => __awaiter(this, void 0, void 0, function* () {
            return ({
                host: new URL(this.host).host, // removes default port
                bearerToken: this.authEnabled ? yield this.login().then((token) => `Bearer ${token}`) : undefined,
                headers: this.headers,
            });
        });
        params = this.sanitizeParams(params);
        this.host = params.host;
        this.headers = params.headers;
        this.http = (0, exports.httpClient)(params);
        this.authEnabled = this.parseAuthParams(params);
    }
    parseAuthParams(params) {
        var _a;
        if (params.authClientSecret && params.apiKey) {
            throw new errors_js_1.WeaviateInvalidInputError('must provide one of authClientSecret (OIDC) or apiKey, cannot provide both');
        }
        if (params.authClientSecret) {
            this.oidcAuth = new auth_js_1.OidcAuthenticator(this.http, params.authClientSecret);
            return true;
        }
        if (params.apiKey) {
            this.apiKey = (_a = params.apiKey) === null || _a === void 0 ? void 0 : _a.apiKey;
            return true;
        }
        return false;
    }
    sanitizeParams(params) {
        // Remove trailing slashes from the host
        while (params.host.endsWith('/')) {
            params.host = params.host.slice(0, -1);
        }
        const protocolPattern = /^(https?|ftp|file)(?::\/\/)/;
        const extractedSchemeMatch = params.host.match(protocolPattern);
        // Check for the existence of scheme in params
        if (params.scheme) {
            // If the host contains a scheme different than provided scheme, replace it and throw a warning
            if (extractedSchemeMatch && extractedSchemeMatch[1] !== `${params.scheme}`) {
                throw new errors_js_1.WeaviateInvalidInputError(`The host contains a different protocol than specified in the scheme (scheme: ${params.scheme} != host: ${extractedSchemeMatch[1]})`);
            }
            else if (!extractedSchemeMatch) {
                // If no scheme in the host, simply prefix with the provided scheme
                params.host = `${params.scheme}://${params.host}`;
            }
            // If there's no scheme in params, ensure the host starts with a recognized protocol
        }
        else if (!extractedSchemeMatch) {
            throw new errors_js_1.WeaviateInvalidInputError('The host must start with a recognized protocol (e.g., http or https) if no scheme is provided.');
        }
        return params;
    }
}
exports.default = ConnectionREST;
__exportStar(require("./auth.js"), exports);
const fetchWithTimeout = (input, timeout, init) => {
    const controller = new AbortController();
    // Set a timeout to abort the request
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
    return fetch(input, Object.assign(Object.assign({}, init), { signal: controller.signal }))
        .catch((error) => {
        if ((0, abort_controller_x_1.isAbortError)(error)) {
            throw new errors_js_1.WeaviateRequestTimeoutError(`Request timed out after ${timeout}ms`);
        }
        throw error; // For other errors, rethrow them
    })
        .finally(() => clearTimeout(timeoutId));
};
const httpClient = (config) => {
    const version = '/v1';
    const baseUri = `${config.host}${version}`;
    const url = makeUrl(baseUri);
    return {
        close: () => { var _a; return (_a = config.agent) === null || _a === void 0 ? void 0 : _a.destroy(); },
        post: (path, payload, expectReturnContent, bearerToken) => {
            var _a;
            const request = {
                method: 'POST',
                headers: Object.assign(Object.assign(Object.assign({}, config.headers), { 'content-type': 'application/json' }), getAuthHeaders(config, bearerToken)),
                body: JSON.stringify(payload),
                agent: config.agent,
            };
            return fetchWithTimeout(url(path), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.insert) || 90, request).then(checkStatus(expectReturnContent));
        },
        put: (path, payload, expectReturnContent = true, bearerToken = '') => {
            var _a;
            const request = {
                method: 'PUT',
                headers: Object.assign(Object.assign(Object.assign({}, config.headers), { 'content-type': 'application/json' }), getAuthHeaders(config, bearerToken)),
                body: JSON.stringify(payload),
                agent: config.agent,
            };
            return fetchWithTimeout(url(path), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.insert) || 90, request).then(checkStatus(expectReturnContent));
        },
        patch: (path, payload, bearerToken = '') => {
            var _a;
            const request = {
                method: 'PATCH',
                headers: Object.assign(Object.assign(Object.assign({}, config.headers), { 'content-type': 'application/json' }), getAuthHeaders(config, bearerToken)),
                body: JSON.stringify(payload),
                agent: config.agent,
            };
            return fetchWithTimeout(url(path), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.insert) || 90, request).then(checkStatus(false));
        },
        delete: (path, payload = null, expectReturnContent = false, bearerToken = '') => {
            var _a;
            const request = {
                method: 'DELETE',
                headers: Object.assign(Object.assign(Object.assign({}, config.headers), { 'content-type': 'application/json' }), getAuthHeaders(config, bearerToken)),
                body: payload ? JSON.stringify(payload) : undefined,
                agent: config.agent,
            };
            return fetchWithTimeout(url(path), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.insert) || 90, request).then(checkStatus(expectReturnContent));
        },
        head: (path, payload = null, bearerToken = '') => {
            var _a;
            const request = {
                method: 'HEAD',
                headers: Object.assign(Object.assign(Object.assign({}, config.headers), { 'content-type': 'application/json' }), getAuthHeaders(config, bearerToken)),
                body: payload ? JSON.stringify(payload) : undefined,
                agent: config.agent,
            };
            return fetchWithTimeout(url(path), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.query) || 30, request).then(handleHeadResponse(false));
        },
        get: (path, expectReturnContent = true, bearerToken = '') => {
            var _a;
            const request = {
                method: 'GET',
                headers: Object.assign(Object.assign({}, config.headers), getAuthHeaders(config, bearerToken)),
                agent: config.agent,
            };
            return fetchWithTimeout(url(path), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.query) || 30, request).then(checkStatus(expectReturnContent));
        },
        getRaw: (path, bearerToken = '') => {
            var _a;
            // getRaw does not handle the status leaving this to the caller
            const request = {
                method: 'GET',
                headers: Object.assign(Object.assign({}, config.headers), getAuthHeaders(config, bearerToken)),
                agent: config.agent,
            };
            return fetchWithTimeout(url(path), ((_a = config.timeout) === null || _a === void 0 ? void 0 : _a.query) || 30, request);
        },
        externalGet: (externalUrl) => {
            return fetch(externalUrl, {
                method: 'GET',
                headers: Object.assign({}, config.headers),
            }).then(checkStatus(true));
        },
        externalPost: (externalUrl, body, contentType) => {
            if (contentType == undefined || contentType == '') {
                contentType = 'application/json';
            }
            const request = {
                body: undefined,
                method: 'POST',
                headers: Object.assign(Object.assign({}, config.headers), { 'content-type': contentType }),
            };
            if (body != null) {
                request.body = body;
            }
            return fetch(externalUrl, request).then(checkStatus(true));
        },
    };
};
exports.httpClient = httpClient;
const makeUrl = (basePath) => (path) => basePath + path;
const checkStatus = (expectResponseBody) => (res) => {
    if (res.status >= 400) {
        return res.text().then((errText) => {
            let err;
            try {
                // in case of invalid json response (like empty string)
                err = JSON.stringify(JSON.parse(errText));
            }
            catch (e) {
                err = errText;
            }
            if (res.status === 401) {
                return Promise.reject(new errors_js_1.WeaviateUnauthenticatedError(err));
            }
            else if (res.status === 403) {
                return Promise.reject(new errors_js_1.WeaviateInsufficientPermissionsError(403, err));
            }
            else {
                return Promise.reject(new errors_js_1.WeaviateUnexpectedStatusCodeError(res.status, err));
            }
        });
    }
    if (expectResponseBody) {
        return res.json();
    }
    return Promise.resolve(undefined);
};
const handleHeadResponse = (expectResponseBody) => (res) => {
    if (res.status == 200 || res.status == 204 || res.status == 404) {
        return Promise.resolve(res.status == 200 || res.status == 204);
    }
    return checkStatus(expectResponseBody)(res);
};
const getAuthHeaders = (config, bearerToken) => bearerToken
    ? {
        Authorization: `Bearer ${bearerToken}`,
        'X-Weaviate-Cluster-Url': config.host,
        //  keeping for backwards compatibility for older clusters for now. On newer clusters, Embedding Service reuses Authorization header.
        'X-Weaviate-Api-Key': bearerToken,
    }
    : undefined;
