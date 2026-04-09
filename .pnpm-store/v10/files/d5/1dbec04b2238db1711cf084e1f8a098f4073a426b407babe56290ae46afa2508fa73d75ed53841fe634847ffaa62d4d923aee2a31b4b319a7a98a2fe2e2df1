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
exports.createClient = void 0;
const config_1 = require("@libsql/core/config");
const sqlite3_js_1 = require("./sqlite3.js");
const ws_js_1 = require("./ws.js");
const http_js_1 = require("./http.js");
__exportStar(require("@libsql/core/api"), exports);
/** Creates a {@link Client} object.
 *
 * You must pass at least an `url` in the {@link Config} object.
 */
function createClient(config) {
    return _createClient((0, config_1.expandConfig)(config, true));
}
exports.createClient = createClient;
function _createClient(config) {
    if (config.scheme === "wss" || config.scheme === "ws") {
        return (0, ws_js_1._createClient)(config);
    }
    else if (config.scheme === "https" || config.scheme === "http") {
        return (0, http_js_1._createClient)(config);
    }
    else {
        return (0, sqlite3_js_1._createClient)(config);
    }
}
