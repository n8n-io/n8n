"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAVSC = readAVSC;
exports.readAVSCAsync = readAVSCAsync;
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const errors_1 = require("../errors");
const readFileAsync = (0, util_1.promisify)(fs_1.default.readFile);
const ENCODING = 'utf-8';
function isValidSchema(rawSchema) {
    return ('name' in rawSchema &&
        'type' in rawSchema &&
        rawSchema.type === 'record' &&
        'fields' in rawSchema);
}
function validatedSchema(path, rawSchema) {
    if (!isValidSchema(rawSchema)) {
        throw new errors_1.ConfluentSchemaRegistryInvalidSchemaError(`${path} is not recognized as a valid AVSC file (expecting valid top-level name, type and fields attributes)`);
    }
    return rawSchema;
}
function readAVSC(path) {
    const rawSchema = JSON.parse(fs_1.default.readFileSync(path, ENCODING));
    return validatedSchema(path, rawSchema);
}
async function readAVSCAsync(path) {
    const rawSchema = JSON.parse(await readFileAsync(path, ENCODING));
    return validatedSchema(path, rawSchema);
}
//# sourceMappingURL=readAVSC.js.map