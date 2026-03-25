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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.HTTPClient = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
// eslint-disable-next-line @typescript-eslint/tslint/config
const axios_1 = __importDefault(require("axios"));
const metadata_1 = require("./metadata");
/**
 * The default Request Client used by the SDK if customer does not
 * provide their own client.
 */
class HTTPClient {
    constructor(conf) {
        this.defaultTimeout = 15000; // 15 seconds
        this.defaultHeaders = {
            "content-type": "application/json",
            "user-agent": `connect-sdk-js/${(0, metadata_1.getVersion)()}`,
        };
        this.axios = this.initAxios(conf);
    }
    request(method, url, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const requestCfg = {
                method,
                url,
                timeout: opts.timeout,
                data: opts.data,
                params: opts.params,
                headers: Object.assign({}, this.defaultHeaders, opts.headers, {
                    authorization: `Bearer ${opts.authToken}`,
                }),
                responseType: opts.responseType,
            };
            const response = yield this.axios.request(requestCfg);
            return { status: response.status, data: response.data };
        });
    }
    /**
     * Factory helper that sets up axios with settings relevant to the connector.
     *
     * @param {ClientConfig} conf
     */
    initAxios(conf) {
        conf = conf || {};
        const axiosConfig = {
            timeout: conf.timeout || this.defaultTimeout,
            headers: this.defaultHeaders,
        };
        if (conf.keepAlive) {
            axiosConfig.httpsAgent = new https.Agent({ keepAlive: true });
            axiosConfig.httpAgent = new http.Agent({ keepAlive: true });
        }
        const axiosInstance = axios_1.default.create(axiosConfig);
        axiosInstance.interceptors.response.use((response) => response, 
        // eslint-disable-next-line @typescript-eslint/promise-function-async,@typescript-eslint/tslint/config
        (error) => {
            maskAuthorizationHeader(error);
            if (error.response && error.response.data) {
                return Promise.reject(error.response.data);
            }
            else {
                return Promise.reject(error);
            }
        });
        return axiosInstance;
    }
}
exports.HTTPClient = HTTPClient;
function maskAuthorizationHeader(error) {
    var _a, _b, _c;
    // mask the authorization header in the error config
    const token = (_a = error === null || error === void 0 ? void 0 : error.config) === null || _a === void 0 ? void 0 : _a.headers["authorization"];
    if (token) {
        error.config.headers["authorization"] = "[REDACTED]";
    }
    // mask the authorization header in the request header
    if ((_c = (_b = error.request) === null || _b === void 0 ? void 0 : _b._currentRequest) === null || _c === void 0 ? void 0 : _c._header) {
        error.request._currentRequest._header =
            error.request._currentRequest._header.replaceAll(token, "[REDACTED]");
    }
}
//# sourceMappingURL=client.js.map