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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = __importDefault(require("../backup/index.js"));
const index_js_2 = __importDefault(require("../batch/index.js"));
const index_js_3 = __importDefault(require("../c11y/index.js"));
const index_js_4 = __importDefault(require("../classifications/index.js"));
const index_js_5 = __importDefault(require("../cluster/index.js"));
const auth_js_1 = require("../connection/auth.js");
const index_js_6 = require("../connection/index.js");
const index_js_7 = __importDefault(require("../data/index.js"));
const index_js_8 = __importDefault(require("../graphql/index.js"));
const index_js_9 = __importDefault(require("../misc/index.js"));
const metaGetter_js_1 = __importDefault(require("../misc/metaGetter.js"));
const index_js_10 = __importDefault(require("../schema/index.js"));
const dbVersion_js_1 = require("../utils/dbVersion.js");
const app = {
    client: function (params) {
        // check if the URL is set
        if (!params.host)
            throw new Error('Missing `host` parameter');
        // check if headers are set
        if (!params.headers)
            params.headers = {};
        const conn = new index_js_6.ConnectionGQL(params);
        const dbVersionProvider = initDbVersionProvider(conn);
        const dbVersionSupport = new dbVersion_js_1.DbVersionSupport(dbVersionProvider);
        const ifc = {
            graphql: (0, index_js_8.default)(conn),
            schema: (0, index_js_10.default)(conn),
            data: (0, index_js_7.default)(conn, dbVersionSupport),
            classifications: (0, index_js_4.default)(conn),
            batch: (0, index_js_2.default)(conn, dbVersionSupport),
            misc: (0, index_js_9.default)(conn, dbVersionProvider),
            c11y: (0, index_js_3.default)(conn),
            backup: (0, index_js_1.default)(conn),
            cluster: (0, index_js_5.default)(conn),
        };
        if (conn.oidcAuth)
            ifc.oidcAuth = conn.oidcAuth;
        return ifc;
    },
    ApiKey: auth_js_1.ApiKey,
    AuthUserPasswordCredentials: auth_js_1.AuthUserPasswordCredentials,
    AuthAccessTokenCredentials: auth_js_1.AuthAccessTokenCredentials,
    AuthClientCredentials: auth_js_1.AuthClientCredentials,
};
function initDbVersionProvider(conn) {
    const metaGetter = new metaGetter_js_1.default(conn);
    const versionGetter = () => {
        return metaGetter
            .do()
            .then((result) => result.version)
            .catch(() => Promise.resolve(''));
    };
    const dbVersionProvider = new dbVersion_js_1.DbVersionProvider(versionGetter);
    dbVersionProvider.refresh();
    return dbVersionProvider;
}
exports.default = app;
__exportStar(require("../backup/index.js"), exports);
__exportStar(require("../batch/index.js"), exports);
__exportStar(require("../c11y/index.js"), exports);
__exportStar(require("../classifications/index.js"), exports);
__exportStar(require("../cluster/index.js"), exports);
__exportStar(require("../connection/index.js"), exports);
__exportStar(require("../data/index.js"), exports);
__exportStar(require("../graphql/index.js"), exports);
__exportStar(require("../misc/index.js"), exports);
__exportStar(require("../openapi/types.js"), exports);
__exportStar(require("../schema/index.js"), exports);
__exportStar(require("../utils/base64.js"), exports);
__exportStar(require("../utils/uuid.js"), exports);
