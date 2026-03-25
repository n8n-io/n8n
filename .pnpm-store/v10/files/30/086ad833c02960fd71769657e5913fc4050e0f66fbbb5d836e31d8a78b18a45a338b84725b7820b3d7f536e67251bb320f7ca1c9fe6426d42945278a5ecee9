"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionCreator = exports.ConceptsGetter = void 0;
const conceptsGetter_js_1 = __importDefault(require("./conceptsGetter.js"));
const extensionCreator_js_1 = __importDefault(require("./extensionCreator.js"));
const c11y = (client) => {
    return {
        conceptsGetter: () => new conceptsGetter_js_1.default(client),
        extensionCreator: () => new extensionCreator_js_1.default(client),
    };
};
exports.default = c11y;
var conceptsGetter_js_2 = require("./conceptsGetter.js");
Object.defineProperty(exports, "ConceptsGetter", { enumerable: true, get: function () { return __importDefault(conceptsGetter_js_2).default; } });
var extensionCreator_js_2 = require("./extensionCreator.js");
Object.defineProperty(exports, "ExtensionCreator", { enumerable: true, get: function () { return __importDefault(extensionCreator_js_2).default; } });
