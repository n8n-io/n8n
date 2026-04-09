"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseYaml = parseYaml;
exports.stringifyYaml = stringifyYaml;
exports.readYaml = readYaml;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore broken types for js-yaml
const js_yaml_1 = require("js-yaml");
const fs_1 = require("fs");
const DEFAULT_SCHEMA_WITHOUT_TIMESTAMP = js_yaml_1.JSON_SCHEMA.extend({
    implicit: [js_yaml_1.types.merge],
    explicit: [js_yaml_1.types.binary, js_yaml_1.types.omap, js_yaml_1.types.pairs, js_yaml_1.types.set],
});
function parseYaml(str, opts) {
    return (0, js_yaml_1.load)(str, { schema: DEFAULT_SCHEMA_WITHOUT_TIMESTAMP, ...opts });
}
function stringifyYaml(obj, opts) {
    return (0, js_yaml_1.dump)(obj, opts);
}
function readYaml(path) {
    return parseYaml((0, fs_1.readFileSync)(path, 'utf-8'));
}
//# sourceMappingURL=yaml.js.map