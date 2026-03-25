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
exports.createCluster = exports.createClient = void 0;
const client_1 = require("@redis/client");
const bloom_1 = require("@redis/bloom");
const graph_1 = require("@redis/graph");
const json_1 = require("@redis/json");
const search_1 = require("@redis/search");
const time_series_1 = require("@redis/time-series");
__exportStar(require("@redis/client"), exports);
__exportStar(require("@redis/bloom"), exports);
__exportStar(require("@redis/graph"), exports);
__exportStar(require("@redis/json"), exports);
__exportStar(require("@redis/search"), exports);
__exportStar(require("@redis/time-series"), exports);
const modules = {
    ...bloom_1.default,
    graph: graph_1.default,
    json: json_1.default,
    ft: search_1.default,
    ts: time_series_1.default
};
function createClient(options) {
    return (0, client_1.createClient)({
        ...options,
        modules: {
            ...modules,
            ...options?.modules
        }
    });
}
exports.createClient = createClient;
function createCluster(options) {
    return (0, client_1.createCluster)({
        ...options,
        modules: {
            ...modules,
            ...options?.modules
        }
    });
}
exports.createCluster = createCluster;
