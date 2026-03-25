"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadyChecker = exports.OpenidConfigurationGetter = exports.MetaGetter = exports.LiveChecker = void 0;
const liveChecker_js_1 = __importDefault(require("./liveChecker.js"));
const metaGetter_js_1 = __importDefault(require("./metaGetter.js"));
const openidConfigurationGetter_js_1 = __importDefault(require("./openidConfigurationGetter.js"));
const readyChecker_js_1 = __importDefault(require("./readyChecker.js"));
const misc = (client, dbVersionProvider) => {
    return {
        liveChecker: () => new liveChecker_js_1.default(client, dbVersionProvider),
        readyChecker: () => new readyChecker_js_1.default(client, dbVersionProvider),
        metaGetter: () => new metaGetter_js_1.default(client),
        openidConfigurationGetter: () => new openidConfigurationGetter_js_1.default(client.http),
    };
};
exports.default = misc;
var liveChecker_js_2 = require("./liveChecker.js");
Object.defineProperty(exports, "LiveChecker", { enumerable: true, get: function () { return __importDefault(liveChecker_js_2).default; } });
var metaGetter_js_2 = require("./metaGetter.js");
Object.defineProperty(exports, "MetaGetter", { enumerable: true, get: function () { return __importDefault(metaGetter_js_2).default; } });
var openidConfigurationGetter_js_2 = require("./openidConfigurationGetter.js");
Object.defineProperty(exports, "OpenidConfigurationGetter", { enumerable: true, get: function () { return __importDefault(openidConfigurationGetter_js_2).default; } });
var readyChecker_js_2 = require("./readyChecker.js");
Object.defineProperty(exports, "ReadyChecker", { enumerable: true, get: function () { return __importDefault(readyChecker_js_2).default; } });
