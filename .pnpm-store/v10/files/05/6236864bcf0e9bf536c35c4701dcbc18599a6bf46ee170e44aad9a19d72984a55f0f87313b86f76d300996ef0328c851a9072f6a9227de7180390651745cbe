"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRequestWithAuthInterceptor = void 0;
var axios_1 = __importDefault(require("axios"));
var createApiRequestWithAuthInterceptor = function (_a) {
    var baseURL = _a.baseURL, serviceToken = _a.serviceToken;
    var apiRequest = axios_1.default.create({
        baseURL: baseURL,
        headers: {
            'Content-Type': ' application/json',
            'User-Agent': "InfisicalNodeSDK"
        }
    });
    apiRequest.interceptors.request.use(function (config) {
        config.headers.Authorization = "Bearer ".concat(serviceToken);
        return config;
    });
    return apiRequest;
};
exports.createApiRequestWithAuthInterceptor = createApiRequestWithAuthInterceptor;
