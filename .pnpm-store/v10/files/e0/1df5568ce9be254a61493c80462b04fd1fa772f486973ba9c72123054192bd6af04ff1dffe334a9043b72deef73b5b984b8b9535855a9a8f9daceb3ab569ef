"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsJestCompiler = void 0;
var ts_compiler_1 = require("./ts-compiler");
var TsJestCompiler = /** @class */ (function () {
    function TsJestCompiler(configSet, runtimeCacheFS) {
        // Later we can add swc/esbuild or other typescript compiler instance here
        this._compilerInstance = new ts_compiler_1.TsCompiler(configSet, runtimeCacheFS);
    }
    TsJestCompiler.prototype.getResolvedModules = function (fileContent, fileName, runtimeCacheFS) {
        return this._compilerInstance.getResolvedModules(fileContent, fileName, runtimeCacheFS);
    };
    TsJestCompiler.prototype.getCompiledOutput = function (fileContent, fileName, options) {
        return this._compilerInstance.getCompiledOutput(fileContent, fileName, options);
    };
    return TsJestCompiler;
}());
exports.TsJestCompiler = TsJestCompiler;
