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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestDataFromJsonSchema = generateTestDataFromJsonSchema;
const Sampler = __importStar(require("openapi-sampler"));
const colorette_1 = require("colorette");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
function generateTestDataFromJsonSchema(schema) {
    if (!schema)
        return;
    try {
        return Sampler.sample(schema, { skipReadOnly: true, skipNonRequired: false, quiet: true });
    }
    catch (e) {
        logger.error((0, colorette_1.bgRed)(` Error while generating test data from JSON Schema `) + '\n' + e);
        return;
    }
}
//# sourceMappingURL=generate-test-data-from-json-schema.js.map