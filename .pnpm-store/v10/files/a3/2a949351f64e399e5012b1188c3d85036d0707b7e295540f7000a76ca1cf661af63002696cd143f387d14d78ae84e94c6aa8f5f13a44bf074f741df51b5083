"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferencesBatcher = exports.ObjectsBatcher = exports.ObjectsBatchDeleter = void 0;
const beaconPath_js_1 = require("../utils/beaconPath.js");
const objectsBatchDeleter_js_1 = __importDefault(require("./objectsBatchDeleter.js"));
const objectsBatcher_js_1 = __importDefault(require("./objectsBatcher.js"));
const referencePayloadBuilder_js_1 = __importDefault(require("./referencePayloadBuilder.js"));
const referencesBatcher_js_1 = __importDefault(require("./referencesBatcher.js"));
const batch = (client, dbVersionSupport) => {
    const beaconPath = new beaconPath_js_1.BeaconPath(dbVersionSupport);
    return {
        objectsBatcher: () => new objectsBatcher_js_1.default(client),
        objectsBatchDeleter: () => new objectsBatchDeleter_js_1.default(client),
        referencesBatcher: () => new referencesBatcher_js_1.default(client, beaconPath),
        referencePayloadBuilder: () => new referencePayloadBuilder_js_1.default(client),
    };
};
exports.default = batch;
var objectsBatchDeleter_js_2 = require("./objectsBatchDeleter.js");
Object.defineProperty(exports, "ObjectsBatchDeleter", { enumerable: true, get: function () { return __importDefault(objectsBatchDeleter_js_2).default; } });
var objectsBatcher_js_2 = require("./objectsBatcher.js");
Object.defineProperty(exports, "ObjectsBatcher", { enumerable: true, get: function () { return __importDefault(objectsBatcher_js_2).default; } });
var referencesBatcher_js_2 = require("./referencesBatcher.js");
Object.defineProperty(exports, "ReferencesBatcher", { enumerable: true, get: function () { return __importDefault(referencesBatcher_js_2).default; } });
