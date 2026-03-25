"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mappersmith_1 = __importDefault(require("mappersmith"));
const v2_1 = __importDefault(require("mappersmith/middleware/retry/v2"));
const basic_auth_1 = __importDefault(require("mappersmith/middleware/basic-auth"));
const constants_1 = require("../constants");
const errorMiddleware_1 = __importDefault(require("./middleware/errorMiddleware"));
const confluentEncoderMiddleware_1 = __importDefault(require("./middleware/confluentEncoderMiddleware"));
const userAgent_1 = __importDefault(require("./middleware/userAgent"));
const DEFAULT_RETRY = {
    maxRetryTimeInSecs: 5,
    initialRetryTimeInSecs: 0.1,
    factor: 0.2, // randomization factor
    multiplier: 2, // exponential factor
    retries: 3, // max retries
};
exports.default = ({ auth, clientId: userClientId, host, retry = {}, agent, middlewares = [], }) => {
    const clientId = userClientId || constants_1.DEFAULT_API_CLIENT_ID;
    // FIXME: ResourcesType typings is not exposed by mappersmith
    const manifest = {
        clientId,
        ignoreGlobalMiddleware: true,
        host,
        middleware: [
            userAgent_1.default,
            confluentEncoderMiddleware_1.default,
            (0, v2_1.default)(Object.assign(DEFAULT_RETRY, retry)),
            errorMiddleware_1.default,
            ...(auth ? [(0, basic_auth_1.default)(auth)] : []),
            ...middlewares,
        ],
        resources: {
            Schema: {
                find: {
                    method: 'get',
                    path: '/schemas/ids/{id}',
                },
            },
            Subject: {
                all: {
                    method: 'get',
                    path: '/subjects',
                },
                latestVersion: {
                    method: 'get',
                    path: '/subjects/{subject}/versions/latest',
                },
                version: {
                    method: 'get',
                    path: '/subjects/{subject}/versions/{version}',
                },
                registered: {
                    method: 'post',
                    path: '/subjects/{subject}',
                },
                config: {
                    method: 'get',
                    path: '/config/{subject}',
                },
                updateConfig: {
                    method: 'put',
                    path: '/config/{subject}',
                },
                register: {
                    method: 'post',
                    path: '/subjects/{subject}/versions',
                },
                compatible: {
                    method: 'post',
                    path: '/compatibility/subjects/{subject}/versions/{version}',
                    params: { version: 'latest' },
                },
            },
        },
    };
    // if an agent was provided, bind the agent to the mappersmith configs
    if (agent) {
        // gatewayConfigs is not listed as a type on manifest object in mappersmith
        ;
        manifest.gatewayConfigs = {
            HTTP: {
                configure: () => ({ agent }),
            },
        };
    }
    return (0, mappersmith_1.default)(manifest);
};
//# sourceMappingURL=index.js.map