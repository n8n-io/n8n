"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = exports.Updater = exports.ReferenceReplacer = exports.ReferencePayloadBuilder = exports.ReferenceDeleter = exports.ReferenceCreator = exports.Merger = exports.GetterById = exports.Getter = exports.Deleter = exports.Creator = exports.Checker = void 0;
const beaconPath_js_1 = require("../utils/beaconPath.js");
const checker_js_1 = __importDefault(require("./checker.js"));
const creator_js_1 = __importDefault(require("./creator.js"));
const deleter_js_1 = __importDefault(require("./deleter.js"));
const getter_js_1 = __importDefault(require("./getter.js"));
const getterById_js_1 = __importDefault(require("./getterById.js"));
const merger_js_1 = __importDefault(require("./merger.js"));
const path_js_1 = require("./path.js");
const referenceCreator_js_1 = __importDefault(require("./referenceCreator.js"));
const referenceDeleter_js_1 = __importDefault(require("./referenceDeleter.js"));
const referencePayloadBuilder_js_1 = __importDefault(require("./referencePayloadBuilder.js"));
const referenceReplacer_js_1 = __importDefault(require("./referenceReplacer.js"));
const updater_js_1 = __importDefault(require("./updater.js"));
const validator_js_1 = __importDefault(require("./validator.js"));
const data = (client, dbVersionSupport) => {
    const objectsPath = new path_js_1.ObjectsPath(dbVersionSupport);
    const referencesPath = new path_js_1.ReferencesPath(dbVersionSupport);
    const beaconPath = new beaconPath_js_1.BeaconPath(dbVersionSupport);
    return {
        creator: () => new creator_js_1.default(client, objectsPath),
        validator: () => new validator_js_1.default(client),
        updater: () => new updater_js_1.default(client, objectsPath),
        merger: () => new merger_js_1.default(client, objectsPath),
        getter: () => new getter_js_1.default(client, objectsPath),
        getterById: () => new getterById_js_1.default(client, objectsPath),
        deleter: () => new deleter_js_1.default(client, objectsPath),
        checker: () => new checker_js_1.default(client, objectsPath),
        referenceCreator: () => new referenceCreator_js_1.default(client, referencesPath, beaconPath),
        referenceReplacer: () => new referenceReplacer_js_1.default(client, referencesPath, beaconPath),
        referenceDeleter: () => new referenceDeleter_js_1.default(client, referencesPath, beaconPath),
        referencePayloadBuilder: () => new referencePayloadBuilder_js_1.default(client),
    };
};
exports.default = data;
var checker_js_2 = require("./checker.js");
Object.defineProperty(exports, "Checker", { enumerable: true, get: function () { return __importDefault(checker_js_2).default; } });
var creator_js_2 = require("./creator.js");
Object.defineProperty(exports, "Creator", { enumerable: true, get: function () { return __importDefault(creator_js_2).default; } });
var deleter_js_2 = require("./deleter.js");
Object.defineProperty(exports, "Deleter", { enumerable: true, get: function () { return __importDefault(deleter_js_2).default; } });
var getter_js_2 = require("./getter.js");
Object.defineProperty(exports, "Getter", { enumerable: true, get: function () { return __importDefault(getter_js_2).default; } });
var getterById_js_2 = require("./getterById.js");
Object.defineProperty(exports, "GetterById", { enumerable: true, get: function () { return __importDefault(getterById_js_2).default; } });
var merger_js_2 = require("./merger.js");
Object.defineProperty(exports, "Merger", { enumerable: true, get: function () { return __importDefault(merger_js_2).default; } });
var referenceCreator_js_2 = require("./referenceCreator.js");
Object.defineProperty(exports, "ReferenceCreator", { enumerable: true, get: function () { return __importDefault(referenceCreator_js_2).default; } });
var referenceDeleter_js_2 = require("./referenceDeleter.js");
Object.defineProperty(exports, "ReferenceDeleter", { enumerable: true, get: function () { return __importDefault(referenceDeleter_js_2).default; } });
var referencePayloadBuilder_js_2 = require("./referencePayloadBuilder.js");
Object.defineProperty(exports, "ReferencePayloadBuilder", { enumerable: true, get: function () { return __importDefault(referencePayloadBuilder_js_2).default; } });
var referenceReplacer_js_2 = require("./referenceReplacer.js");
Object.defineProperty(exports, "ReferenceReplacer", { enumerable: true, get: function () { return __importDefault(referenceReplacer_js_2).default; } });
var updater_js_2 = require("./updater.js");
Object.defineProperty(exports, "Updater", { enumerable: true, get: function () { return __importDefault(updater_js_2).default; } });
var validator_js_2 = require("./validator.js");
Object.defineProperty(exports, "Validator", { enumerable: true, get: function () { return __importDefault(validator_js_2).default; } });
