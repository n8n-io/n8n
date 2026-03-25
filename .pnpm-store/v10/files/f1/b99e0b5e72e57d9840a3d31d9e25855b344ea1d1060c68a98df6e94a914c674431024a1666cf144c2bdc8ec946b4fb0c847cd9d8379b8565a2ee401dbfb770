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
exports.HttpClient = exports.HttpBaseClient = void 0;
const http_1 = require("./http");
const const_1 = require("../milvus/const");
/**
 * HttpBaseClient is a base class for making HTTP requests to a Milvus server.
 * It provides basic functionality for making GET and POST requests, and handles
 * configuration, headers, and timeouts.
 *
 * The HttpClientConfig object should contain the following properties:
 * - endpoint: The URL of the Milvus server.
 * - username: (Optional) The username for authentication.
 * - password: (Optional) The password for authentication.
 * - token: (Optional) The token for authentication.
 * - fetch: (Optional) An alternative fetch API implementation, e.g., node-fetch for Node.js environments.
 * - baseURL: (Optional) The base URL for the API endpoints.
 * - version: (Optional) The version of the API endpoints.
 * - database: (Optional) The default database to use for requests.
 * - timeout: (Optional) The timeout for requests in milliseconds.
 *
 * Note: This is a base class and does not provide specific methods for interacting
 * with Milvus entities like collections or vectors. For that, use the HttpClient class
 * which extends this class and mixes in the Collection and Vector APIs.
 */
class HttpBaseClient {
    constructor(config) {
        // Assign the configuration object.
        this.config = config;
        // The fetch method used for requests can be customized by providing a fetch property in the configuration.
        // If no fetch method is provided, the global fetch method will be used if available.
        // If no global fetch method is available, an error will be thrown.
        if (!this.config.fetch && typeof fetch === 'undefined') {
            throw new Error('The Fetch API is not supported in this environment. Please provide an alternative, for example, node-fetch.');
        }
    }
    // baseURL
    get baseURL() {
        return (this.config.baseURL ||
            `${this.config.endpoint}/${const_1.DEFAULT_HTTP_ENDPOINT_VERSION}`);
    }
    // authorization
    get authorization() {
        let token = this.config.token || '';
        if (!token && this.config.username && this.config.password) {
            token = this.config.username + ':' + this.config.password;
        }
        return `Bearer ${token}`;
    }
    // database
    get database() {
        var _a;
        return (_a = this.config.database) !== null && _a !== void 0 ? _a : const_1.DEFAULT_DB;
    }
    // timeout
    get timeout() {
        var _a;
        return (_a = this.config.timeout) !== null && _a !== void 0 ? _a : const_1.DEFAULT_HTTP_TIMEOUT;
    }
    // headers
    get headers() {
        return {
            Authorization: this.authorization,
            Accept: 'application/json',
            ContentType: 'application/json',
            'Accept-Type-Allow-Int64': typeof this.config.acceptInt64 !== 'undefined'
                ? this.config.acceptInt64.toString()
                : 'false',
        };
    }
    // fetch
    get fetch() {
        var _a;
        return (_a = this.config.fetch) !== null && _a !== void 0 ? _a : fetch;
    }
    // POST API
    POST(url, data = {}, options) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // timeout controller
                const timeout = (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : this.timeout;
                const abortController = (_b = options === null || options === void 0 ? void 0 : options.abortController) !== null && _b !== void 0 ? _b : new AbortController();
                const id = setTimeout(() => abortController.abort(), timeout);
                // assign database
                if (data) {
                    data.dbName = (_c = data.dbName) !== null && _c !== void 0 ? _c : this.database;
                }
                const response = yield this.fetch(`${this.baseURL}${url}`, {
                    method: 'post',
                    headers: this.headers,
                    body: JSON.stringify(data),
                    signal: abortController.signal,
                });
                clearTimeout(id);
                return response.json();
            }
            catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`post ${url} request was timeout`);
                }
                return Promise.reject(error);
            }
        });
    }
    // GET API
    GET(url, params = {}, options) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // timeout controller
                const timeout = (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : this.timeout;
                const abortController = (_b = options === null || options === void 0 ? void 0 : options.abortController) !== null && _b !== void 0 ? _b : new AbortController();
                const id = setTimeout(() => abortController.abort(), timeout);
                // assign database
                if (params) {
                    params.dbName = (_c = params.dbName) !== null && _c !== void 0 ? _c : this.database;
                }
                const queryParams = new URLSearchParams(params);
                const response = yield this.fetch(`${this.baseURL}${url}?${queryParams}`, {
                    method: 'get',
                    headers: this.headers,
                    signal: abortController.signal,
                });
                clearTimeout(id);
                return response.json();
            }
            catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`milvus http client: request was timeout`);
                }
                return Promise.reject(error);
            }
        });
    }
}
exports.HttpBaseClient = HttpBaseClient;
/**
 * The HttpClient class extends the functionality
 * of the HttpBaseClient class by mixing in the
 * - Collection
 * - Vector
 * - Alias
 * - Partition
 * - MilvusIndex
 * - Import
 * - Role
 * - User APIs.
 */
class HttpClient extends (0, http_1.User)((0, http_1.Role)((0, http_1.MilvusIndex)((0, http_1.Import)((0, http_1.Alias)((0, http_1.Partition)((0, http_1.Collection)((0, http_1.Vector)(HttpBaseClient)))))))) {
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=HttpClient.js.map