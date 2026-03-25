"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginName = void 0;
exports.getTsconfigWithContext = getTsconfigWithContext;
const node_path_1 = __importDefault(require("node:path"));
const get_tsconfig_1 = require("get-tsconfig");
const stable_hash_x_1 = require("stable-hash-x");
exports.pluginName = 'import-x';
const tsconfigCache = new Map();
function getTsconfigWithContext(context) {
    var _a;
    const parserOptions = ((_a = context.languageOptions) === null || _a === void 0 ? void 0 : _a.parserOptions) || context.parserOptions;
    let tsconfigRootDir = parserOptions === null || parserOptions === void 0 ? void 0 : parserOptions.tsconfigRootDir;
    const project = parserOptions === null || parserOptions === void 0 ? void 0 : parserOptions.project;
    const cacheKey = (0, stable_hash_x_1.stableHash)([tsconfigRootDir, project]);
    let tsconfig;
    if (tsconfigCache.has(cacheKey)) {
        tsconfig = tsconfigCache.get(cacheKey);
    }
    else {
        tsconfigRootDir =
            tsconfigRootDir ||
                process.cwd();
        let tsconfigResult;
        if (project) {
            const projects = Array.isArray(project) ? project : [project];
            for (const project of projects) {
                tsconfigResult = (0, get_tsconfig_1.getTsconfig)(project === true
                    ? context.physicalFilename
                    : node_path_1.default.resolve(tsconfigRootDir, project));
                if (tsconfigResult) {
                    break;
                }
            }
        }
        else {
            tsconfigResult = (0, get_tsconfig_1.getTsconfig)(tsconfigRootDir);
        }
        tsconfig = tsconfigResult === null || tsconfigResult === void 0 ? void 0 : tsconfigResult.config;
        tsconfigCache.set(cacheKey, tsconfig);
    }
    return tsconfig;
}
//# sourceMappingURL=utils.js.map