"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodesStatusGetter = void 0;
const nodesStatusGetter_js_1 = __importDefault(require("./nodesStatusGetter.js"));
const cluster = (client) => {
    return {
        nodesStatusGetter: () => new nodesStatusGetter_js_1.default(client),
    };
};
exports.default = cluster;
var nodesStatusGetter_js_2 = require("./nodesStatusGetter.js");
Object.defineProperty(exports, "NodesStatusGetter", { enumerable: true, get: function () { return __importDefault(nodesStatusGetter_js_2).default; } });
