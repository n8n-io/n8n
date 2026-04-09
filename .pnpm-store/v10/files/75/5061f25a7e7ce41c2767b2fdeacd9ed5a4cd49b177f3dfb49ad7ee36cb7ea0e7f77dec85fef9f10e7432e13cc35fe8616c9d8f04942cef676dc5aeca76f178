"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsJestCompiler = void 0;
const ts_compiler_1 = require("./ts-compiler");
class TsJestCompiler {
    _compilerInstance;
    constructor(configSet, runtimeCacheFS) {
        // Later we can add swc/esbuild or other typescript compiler instance here
        this._compilerInstance = new ts_compiler_1.TsCompiler(configSet, runtimeCacheFS);
    }
    getResolvedModules(fileContent, fileName, runtimeCacheFS) {
        return this._compilerInstance.getResolvedModules(fileContent, fileName, runtimeCacheFS);
    }
    getCompiledOutput(fileContent, fileName, options) {
        return this._compilerInstance.getCompiledOutput(fileContent, fileName, options);
    }
}
exports.TsJestCompiler = TsJestCompiler;
