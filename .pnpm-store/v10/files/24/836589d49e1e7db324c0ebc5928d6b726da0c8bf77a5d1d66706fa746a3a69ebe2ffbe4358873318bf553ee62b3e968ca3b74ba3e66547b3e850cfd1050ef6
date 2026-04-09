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
Object.defineProperty(exports, "__esModule", { value: true });
exports.openHttp = exports.openWs = exports.WsStream = exports.WsClient = exports.HttpStream = exports.HttpClient = exports.Stream = exports.Stmt = exports.Sql = exports.parseLibsqlUrl = exports.BatchCond = exports.BatchStep = exports.Batch = exports.Client = exports.Headers = exports.Request = exports.fetch = exports.WebSocket = void 0;
const isomorphic_ws_1 = require("@libsql/isomorphic-ws");
const client_js_1 = require("./ws/client.js");
const errors_js_1 = require("./errors.js");
const client_js_2 = require("./http/client.js");
const client_js_3 = require("./ws/client.js");
var isomorphic_ws_2 = require("@libsql/isomorphic-ws");
Object.defineProperty(exports, "WebSocket", { enumerable: true, get: function () { return isomorphic_ws_2.WebSocket; } });
var cross_fetch_1 = require("cross-fetch");
Object.defineProperty(exports, "fetch", { enumerable: true, get: function () { return cross_fetch_1.fetch; } });
Object.defineProperty(exports, "Request", { enumerable: true, get: function () { return cross_fetch_1.Request; } });
Object.defineProperty(exports, "Headers", { enumerable: true, get: function () { return cross_fetch_1.Headers; } });
var client_js_4 = require("./client.js");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_js_4.Client; } });
__exportStar(require("./errors.js"), exports);
var batch_js_1 = require("./batch.js");
Object.defineProperty(exports, "Batch", { enumerable: true, get: function () { return batch_js_1.Batch; } });
Object.defineProperty(exports, "BatchStep", { enumerable: true, get: function () { return batch_js_1.BatchStep; } });
Object.defineProperty(exports, "BatchCond", { enumerable: true, get: function () { return batch_js_1.BatchCond; } });
var libsql_url_js_1 = require("./libsql_url.js");
Object.defineProperty(exports, "parseLibsqlUrl", { enumerable: true, get: function () { return libsql_url_js_1.parseLibsqlUrl; } });
var sql_js_1 = require("./sql.js");
Object.defineProperty(exports, "Sql", { enumerable: true, get: function () { return sql_js_1.Sql; } });
var stmt_js_1 = require("./stmt.js");
Object.defineProperty(exports, "Stmt", { enumerable: true, get: function () { return stmt_js_1.Stmt; } });
var stream_js_1 = require("./stream.js");
Object.defineProperty(exports, "Stream", { enumerable: true, get: function () { return stream_js_1.Stream; } });
var client_js_5 = require("./http/client.js");
Object.defineProperty(exports, "HttpClient", { enumerable: true, get: function () { return client_js_5.HttpClient; } });
var stream_js_2 = require("./http/stream.js");
Object.defineProperty(exports, "HttpStream", { enumerable: true, get: function () { return stream_js_2.HttpStream; } });
var client_js_6 = require("./ws/client.js");
Object.defineProperty(exports, "WsClient", { enumerable: true, get: function () { return client_js_6.WsClient; } });
var stream_js_3 = require("./ws/stream.js");
Object.defineProperty(exports, "WsStream", { enumerable: true, get: function () { return stream_js_3.WsStream; } });
/** Open a Hrana client over WebSocket connected to the given `url`. */
function openWs(url, jwt, protocolVersion = 2) {
    if (typeof isomorphic_ws_1.WebSocket === "undefined") {
        throw new errors_js_1.WebSocketUnsupportedError("WebSockets are not supported in this environment");
    }
    var subprotocols = undefined;
    if (protocolVersion == 3) {
        subprotocols = Array.from(client_js_1.subprotocolsV3.keys());
    }
    else {
        subprotocols = Array.from(client_js_1.subprotocolsV2.keys());
    }
    const socket = new isomorphic_ws_1.WebSocket(url, subprotocols);
    return new client_js_3.WsClient(socket, jwt);
}
exports.openWs = openWs;
/** Open a Hrana client over HTTP connected to the given `url`.
 *
 * If the `customFetch` argument is passed and not `undefined`, it is used in place of the `fetch` function
 * from `cross-fetch`. This function is always called with a `Request` object from
 * `cross-fetch`.
 */
function openHttp(url, jwt, customFetch, remoteEncryptionKey, protocolVersion = 2) {
    return new client_js_2.HttpClient(url instanceof URL ? url : new URL(url), jwt, customFetch, remoteEncryptionKey, protocolVersion);
}
exports.openHttp = openHttp;
