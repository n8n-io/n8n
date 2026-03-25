"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Raw = exports.GraphQLGetter = exports.FusionType = exports.Explorer = exports.Aggregator = void 0;
const aggregator_js_1 = __importDefault(require("./aggregator.js"));
const explorer_js_1 = __importDefault(require("./explorer.js"));
const getter_js_1 = __importDefault(require("./getter.js"));
const raw_js_1 = __importDefault(require("./raw.js"));
const graphql = (client) => {
    return {
        get: () => new getter_js_1.default(client),
        aggregate: () => new aggregator_js_1.default(client),
        explore: () => new explorer_js_1.default(client),
        raw: () => new raw_js_1.default(client),
    };
};
exports.default = graphql;
var aggregator_js_2 = require("./aggregator.js");
Object.defineProperty(exports, "Aggregator", { enumerable: true, get: function () { return __importDefault(aggregator_js_2).default; } });
var explorer_js_2 = require("./explorer.js");
Object.defineProperty(exports, "Explorer", { enumerable: true, get: function () { return __importDefault(explorer_js_2).default; } });
var getter_js_2 = require("./getter.js");
Object.defineProperty(exports, "FusionType", { enumerable: true, get: function () { return getter_js_2.FusionType; } });
Object.defineProperty(exports, "GraphQLGetter", { enumerable: true, get: function () { return __importDefault(getter_js_2).default; } });
var raw_js_2 = require("./raw.js");
Object.defineProperty(exports, "Raw", { enumerable: true, get: function () { return __importDefault(raw_js_2).default; } });
