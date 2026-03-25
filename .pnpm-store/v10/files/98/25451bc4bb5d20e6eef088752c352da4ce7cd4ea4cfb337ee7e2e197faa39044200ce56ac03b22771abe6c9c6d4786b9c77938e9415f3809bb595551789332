"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = exports.name = void 0;
exports.measureAsync = measureAsync;
const fs_1 = require("fs");
const path_1 = require("path");
const lint_1 = require("../../lint");
const config_1 = require("../../config");
const resolve_1 = require("../../resolve");
const utils_1 = require("../utils");
exports.name = 'Validate with recommended rules';
exports.count = 10;
const rebillyDefinitionRef = (0, path_1.resolve)((0, path_1.join)(__dirname, 'rebilly.yaml'));
const rebillyDocument = (0, utils_1.parseYamlToDocument)((0, fs_1.readFileSync)(rebillyDefinitionRef, 'utf-8'), rebillyDefinitionRef);
function measureAsync() {
    return (0, lint_1.lintDocument)({
        externalRefResolver: new resolve_1.BaseResolver(),
        document: rebillyDocument,
        config: new config_1.StyleguideConfig((0, config_1.resolvePreset)('recommended', [config_1.defaultPlugin])),
    });
}
