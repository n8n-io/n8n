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
exports.bundleArazzo = bundleArazzo;
const colorette_1 = require("colorette");
const openapi_core_1 = require("@redocly/openapi-core");
const path = __importStar(require("node:path"));
const node_fs_1 = require("node:fs");
const cli_outputs_1 = require("../../utils/cli-outputs");
const package_json_1 = require("../../../package.json");
const file_1 = require("../../utils/file");
const yaml_1 = require("../../utils/yaml");
async function bundleArazzo(filePath, collectSpecData) {
    const fileName = path.basename(filePath);
    if (!fileName) {
        throw new Error('Invalid file name');
    }
    if (!(0, node_fs_1.existsSync)(filePath)) {
        const relativePath = path.relative(process.cwd(), filePath);
        throw new Error(`Could not find source description file '${fileName}' at path '${relativePath}'`);
    }
    const fileContent = await (0, yaml_1.readYaml)(filePath);
    if (!(0, file_1.isTestFile)(fileName, fileContent)) {
        throw new Error(`No test files found. File ${fileName} does not follows naming pattern "*.[yaml | yml | json]" or have not valid "Arazzo" description.`);
    }
    const config = await (0, openapi_core_1.createConfig)({
        extends: ['recommended-strict'],
        arazzo1Rules: {
            'no-criteria-xpath': 'error',
            'respect-supported-versions': 'warn',
        },
    });
    const lintProblems = await (0, openapi_core_1.lint)({
        ref: filePath,
        config,
    });
    if (lintProblems.length) {
        const fileTotals = (0, openapi_core_1.getTotals)(lintProblems);
        (0, openapi_core_1.formatProblems)(lintProblems, {
            totals: fileTotals,
            version: package_json_1.version,
        });
        (0, cli_outputs_1.printConfigLintTotals)(fileTotals);
    }
    const bundledDocument = await (0, openapi_core_1.bundle)({
        ref: filePath,
        config,
        dereference: true,
    });
    collectSpecData?.(bundledDocument.bundle.parsed || {});
    const errorLintProblems = lintProblems.filter((problem) => problem.severity === 'error');
    if (errorLintProblems.length) {
        throw new Error(`${(0, colorette_1.red)('Found errors in Arazzo description')} ${(0, colorette_1.bold)(fileName)}`);
    }
    return (bundledDocument.bundle.parsed || {});
}
//# sourceMappingURL=get-test-description-from-file.js.map