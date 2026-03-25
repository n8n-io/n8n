"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = exports.name = void 0;
exports.measureAsync = measureAsync;
const path = require("path");
const fs_1 = require("fs");
const resolve_1 = require("../../resolve");
const utils_1 = require("../utils");
const oas3_1 = require("../../types/oas3");
const types_1 = require("../../types");
exports.name = 'Resolve with no external refs';
exports.count = 10;
const rebillyDefinitionRef = path.resolve(path.join(__dirname, 'rebilly.yaml'));
const rebillyDocument = (0, utils_1.parseYamlToDocument)((0, fs_1.readFileSync)(rebillyDefinitionRef, 'utf-8'), rebillyDefinitionRef);
const externalRefResolver = new resolve_1.BaseResolver();
function measureAsync() {
    return (0, resolve_1.resolveDocument)({
        rootDocument: rebillyDocument,
        externalRefResolver,
        rootType: (0, types_1.normalizeTypes)(oas3_1.Oas3Types).Root,
    });
}
