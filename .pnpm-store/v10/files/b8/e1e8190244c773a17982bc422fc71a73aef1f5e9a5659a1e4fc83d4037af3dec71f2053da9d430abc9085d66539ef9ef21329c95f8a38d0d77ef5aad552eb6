"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsJestTransformer = exports.CACHE_KEY_EL_SEPARATOR = void 0;
var fs_1 = require("fs");
var path_1 = __importDefault(require("path"));
var constants_1 = require("../constants");
var utils_1 = require("../utils");
var importer_1 = require("../utils/importer");
var messages_1 = require("../utils/messages");
var sha1_1 = require("../utils/sha1");
var version_checkers_1 = require("../utils/version-checkers");
var compiler_1 = require("./compiler");
var config_set_1 = require("./config/config-set");
/**
 * @internal
 */
exports.CACHE_KEY_EL_SEPARATOR = '\x00';
var TsJestTransformer = exports.TsJestTransformer = /** @class */ (function () {
    function TsJestTransformer(tsJestConfig) {
        this.tsJestConfig = tsJestConfig;
        this._depGraphs = new Map();
        this._watchMode = false;
        this._logger = utils_1.rootLogger.child({ namespace: 'ts-jest-transformer' });
        version_checkers_1.VersionCheckers.jest.warn();
        /**
         * For some unknown reasons, `this` is undefined in `getCacheKey` and `process`
         * when running Jest in ESM mode
         */
        this.getCacheKey = this.getCacheKey.bind(this);
        this.getCacheKeyAsync = this.getCacheKeyAsync.bind(this);
        this.process = this.process.bind(this);
        this.processAsync = this.processAsync.bind(this);
        this._logger.debug('created new transformer');
        process.env.TS_JEST = '1';
    }
    TsJestTransformer.prototype._configsFor = function (transformOptions) {
        var _a, _b, _c;
        var config = transformOptions.config, cacheFS = transformOptions.cacheFS;
        var ccs = TsJestTransformer._cachedConfigSets.find(function (cs) { return cs.jestConfig.value === config; });
        var configSet;
        if (ccs) {
            this._transformCfgStr = ccs.transformerCfgStr;
            this._compiler = ccs.compiler;
            this._depGraphs = ccs.depGraphs;
            this._tsResolvedModulesCachePath = ccs.tsResolvedModulesCachePath;
            this._watchMode = ccs.watchMode;
            configSet = ccs.configSet;
        }
        else {
            // try to look-it up by stringified version
            var serializedJestCfg_1 = (0, utils_1.stringify)(config);
            var serializedCcs = TsJestTransformer._cachedConfigSets.find(function (cs) { return cs.jestConfig.serialized === serializedJestCfg_1; });
            if (serializedCcs) {
                // update the object so that we can find it later
                // this happens because jest first calls getCacheKey with stringified version of
                // the config, and then it calls the transformer with the proper object
                serializedCcs.jestConfig.value = config;
                this._transformCfgStr = serializedCcs.transformerCfgStr;
                this._compiler = serializedCcs.compiler;
                this._depGraphs = serializedCcs.depGraphs;
                this._tsResolvedModulesCachePath = serializedCcs.tsResolvedModulesCachePath;
                this._watchMode = serializedCcs.watchMode;
                configSet = serializedCcs.configSet;
            }
            else {
                // create the new record in the index
                this._logger.info('no matching config-set found, creating a new one');
                if ((_a = config.globals) === null || _a === void 0 ? void 0 : _a['ts-jest']) {
                    this._logger.warn("Define `ts-jest` config under `globals` is deprecated. Please do\ntransform: {\n    <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],\n}," /* Deprecations.GlobalsTsJestConfigOption */);
                }
                var jestGlobalsConfig = (_b = config.globals) !== null && _b !== void 0 ? _b : {};
                var tsJestGlobalsConfig = (_c = jestGlobalsConfig['ts-jest']) !== null && _c !== void 0 ? _c : {};
                var migratedConfig = this.tsJestConfig
                    ? __assign(__assign({}, config), { globals: __assign(__assign({}, jestGlobalsConfig), { 'ts-jest': __assign(__assign({}, tsJestGlobalsConfig), this.tsJestConfig) }) }) : config;
                configSet = this._createConfigSet(migratedConfig);
                var jest_1 = __assign({}, migratedConfig);
                // we need to remove some stuff from jest config
                // this which does not depend on config
                jest_1.cacheDirectory = undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
                this._transformCfgStr = "".concat(new utils_1.JsonableValue(jest_1).serialized).concat(configSet.cacheSuffix);
                this._createCompiler(configSet, cacheFS);
                this._getFsCachedResolvedModules(configSet);
                this._watchMode = process.argv.includes('--watch');
                TsJestTransformer._cachedConfigSets.push({
                    jestConfig: new utils_1.JsonableValue(config),
                    configSet: configSet,
                    transformerCfgStr: this._transformCfgStr,
                    compiler: this._compiler,
                    depGraphs: this._depGraphs,
                    tsResolvedModulesCachePath: this._tsResolvedModulesCachePath,
                    watchMode: this._watchMode,
                });
            }
        }
        return configSet;
    };
    // eslint-disable-next-line class-methods-use-this
    TsJestTransformer.prototype._createConfigSet = function (config) {
        return new config_set_1.ConfigSet(config);
    };
    TsJestTransformer.prototype._createCompiler = function (configSet, cacheFS) {
        this._compiler = new compiler_1.TsJestCompiler(configSet, cacheFS);
    };
    /**
     * @public
     */
    TsJestTransformer.prototype.process = function (sourceText, sourcePath, transformOptions) {
        this._logger.debug({ fileName: sourcePath, transformOptions: transformOptions }, 'processing', sourcePath);
        var configs = this._configsFor(transformOptions);
        var shouldStringifyContent = configs.shouldStringifyContent(sourcePath);
        var babelJest = shouldStringifyContent ? undefined : configs.babelJestTransformer;
        var result = {
            code: this.processWithTs(sourceText, sourcePath, transformOptions).code,
        };
        if (babelJest) {
            this._logger.debug({ fileName: sourcePath }, 'calling babel-jest processor');
            // do not instrument here, jest will do it anyway afterwards
            result = babelJest.process(result.code, sourcePath, __assign(__assign({}, transformOptions), { instrument: false }));
        }
        result = this.runTsJestHook(sourcePath, sourceText, transformOptions, result);
        return result;
    };
    TsJestTransformer.prototype.processAsync = function (sourceText, sourcePath, transformOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this._logger.debug({ fileName: sourcePath, transformOptions: transformOptions }, 'processing', sourcePath);
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var configs, shouldStringifyContent, babelJest, result, processWithTsResult;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    configs = this._configsFor(transformOptions);
                                    shouldStringifyContent = configs.shouldStringifyContent(sourcePath);
                                    babelJest = shouldStringifyContent ? undefined : configs.babelJestTransformer;
                                    processWithTsResult = this.processWithTs(sourceText, sourcePath, transformOptions);
                                    result = {
                                        code: processWithTsResult.code,
                                    };
                                    if ((_a = processWithTsResult.diagnostics) === null || _a === void 0 ? void 0 : _a.length) {
                                        reject(configs.createTsError(processWithTsResult.diagnostics));
                                    }
                                    if (!babelJest) return [3 /*break*/, 2];
                                    this._logger.debug({ fileName: sourcePath }, 'calling babel-jest processor');
                                    return [4 /*yield*/, babelJest.processAsync(result.code, sourcePath, __assign(__assign({}, transformOptions), { instrument: false }))];
                                case 1:
                                    // do not instrument here, jest will do it anyway afterwards
                                    result = _b.sent();
                                    _b.label = 2;
                                case 2:
                                    result = this.runTsJestHook(sourcePath, sourceText, transformOptions, result);
                                    resolve(result);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    TsJestTransformer.prototype.processWithTs = function (sourceText, sourcePath, transformOptions) {
        var result;
        var configs = this._configsFor(transformOptions);
        var shouldStringifyContent = configs.shouldStringifyContent(sourcePath);
        var babelJest = shouldStringifyContent ? undefined : configs.babelJestTransformer;
        var isDefinitionFile = sourcePath.endsWith(constants_1.DECLARATION_TYPE_EXT);
        var isJsFile = constants_1.JS_JSX_REGEX.test(sourcePath);
        var isTsFile = !isDefinitionFile && constants_1.TS_TSX_REGEX.test(sourcePath);
        if (shouldStringifyContent) {
            // handles here what we should simply stringify
            result = {
                code: "module.exports=".concat((0, utils_1.stringify)(sourceText)),
            };
        }
        else if (isDefinitionFile) {
            // do not try to compile declaration files
            result = {
                code: '',
            };
        }
        else if (!configs.parsedTsConfig.options.allowJs && isJsFile) {
            // we've got a '.js' but the compiler option `allowJs` is not set or set to false
            this._logger.warn({ fileName: sourcePath }, (0, messages_1.interpolate)("Got a `.js` file to compile while `allowJs` option is not set to `true` (file: {{path}}). To fix this:\n  - if you want TypeScript to process JS files, set `allowJs` to `true` in your TypeScript config (usually tsconfig.json)\n  - if you do not want TypeScript to process your `.js` files, in your Jest config change the `transform` key which value is `ts-jest` so that it does not match `.js` files anymore" /* Errors.GotJsFileButAllowJsFalse */, { path: sourcePath }));
            result = {
                code: sourceText,
            };
        }
        else if (isJsFile || isTsFile) {
            // transpile TS code (source maps are included)
            result = this._compiler.getCompiledOutput(sourceText, sourcePath, {
                depGraphs: this._depGraphs,
                supportsStaticESM: transformOptions.supportsStaticESM,
                watchMode: this._watchMode,
            });
        }
        else {
            // we should not get called for files with other extension than js[x], ts[x] and d.ts,
            // TypeScript will bail if we try to compile, and if it was to call babel, users can
            // define the transform value with `babel-jest` for this extension instead
            var message = babelJest ? "Got a unknown file type to compile (file: {{path}}). To fix this, in your Jest config change the `transform` key which value is `ts-jest` so that it does not match this kind of files anymore. If you still want Babel to process it, add another entry to the `transform` option with value `babel-jest` which key matches this type of files." /* Errors.GotUnknownFileTypeWithBabel */ : "Got a unknown file type to compile (file: {{path}}). To fix this, in your Jest config change the `transform` key which value is `ts-jest` so that it does not match this kind of files anymore." /* Errors.GotUnknownFileTypeWithoutBabel */;
            this._logger.warn({ fileName: sourcePath }, (0, messages_1.interpolate)(message, { path: sourcePath }));
            result = {
                code: sourceText,
            };
        }
        return result;
    };
    TsJestTransformer.prototype.runTsJestHook = function (sourcePath, sourceText, transformOptions, compiledOutput) {
        var hooksFile = process.env.TS_JEST_HOOKS;
        var hooks;
        /* istanbul ignore next (cover by e2e) */
        if (hooksFile) {
            hooksFile = path_1.default.resolve(this._configsFor(transformOptions).cwd, hooksFile);
            hooks = importer_1.importer.tryTheseOr(hooksFile, {});
        }
        // This is not supposed to be a public API but we keep it as some people use it
        if (hooks === null || hooks === void 0 ? void 0 : hooks.afterProcess) {
            this._logger.debug({ fileName: sourcePath, hookName: 'afterProcess' }, 'calling afterProcess hook');
            var newResult = hooks.afterProcess([sourceText, sourcePath, transformOptions.config, transformOptions], compiledOutput);
            if (newResult) {
                return newResult;
            }
        }
        return compiledOutput;
    };
    /**
     * Jest uses this to cache the compiled version of a file
     *
     * @see https://github.com/facebook/jest/blob/v23.5.0/packages/jest-runtime/src/script_transformer.js#L61-L90
     *
     * @public
     */
    TsJestTransformer.prototype.getCacheKey = function (fileContent, filePath, transformOptions) {
        var _a;
        var _b;
        var configs = this._configsFor(transformOptions);
        this._logger.debug({ fileName: filePath, transformOptions: transformOptions }, 'computing cache key for', filePath);
        // we do not instrument, ensure it is false all the time
        var instrument = (_a = transformOptions.instrument, _a === void 0 ? false : _a);
        var constructingCacheKeyElements = [
            this._transformCfgStr,
            exports.CACHE_KEY_EL_SEPARATOR,
            configs.rootDir,
            exports.CACHE_KEY_EL_SEPARATOR,
            "instrument:".concat(instrument ? 'on' : 'off'),
            exports.CACHE_KEY_EL_SEPARATOR,
            fileContent,
            exports.CACHE_KEY_EL_SEPARATOR,
            filePath,
        ];
        if (!configs.isolatedModules && this._tsResolvedModulesCachePath) {
            var resolvedModuleNames = void 0;
            if (((_b = this._depGraphs.get(filePath)) === null || _b === void 0 ? void 0 : _b.fileContent) === fileContent) {
                this._logger.debug({ fileName: filePath, transformOptions: transformOptions }, 'getting resolved modules from disk caching or memory caching for', filePath);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                resolvedModuleNames = this._depGraphs
                    .get(filePath)
                    .resolvedModuleNames.filter(function (moduleName) { return (0, fs_1.existsSync)(moduleName); });
            }
            else {
                this._logger.debug({ fileName: filePath, transformOptions: transformOptions }, 'getting resolved modules from TypeScript API for', filePath);
                resolvedModuleNames = this._compiler.getResolvedModules(fileContent, filePath, transformOptions.cacheFS);
                this._depGraphs.set(filePath, {
                    fileContent: fileContent,
                    resolvedModuleNames: resolvedModuleNames,
                });
                (0, fs_1.writeFileSync)(this._tsResolvedModulesCachePath, (0, utils_1.stringify)(__spreadArray([], __read(this._depGraphs), false)));
            }
            resolvedModuleNames.forEach(function (moduleName) {
                constructingCacheKeyElements.push(exports.CACHE_KEY_EL_SEPARATOR, moduleName, exports.CACHE_KEY_EL_SEPARATOR, (0, fs_1.statSync)(moduleName).mtimeMs.toString());
            });
        }
        return sha1_1.sha1.apply(void 0, __spreadArray([], __read(constructingCacheKeyElements), false));
    };
    TsJestTransformer.prototype.getCacheKeyAsync = function (sourceText, sourcePath, transformOptions) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.resolve(this.getCacheKey(sourceText, sourcePath, transformOptions))];
            });
        });
    };
    /**
     * Subclasses extends `TsJestTransformer` can call this method to get resolved module disk cache
     */
    TsJestTransformer.prototype._getFsCachedResolvedModules = function (configSet) {
        var cacheDir = configSet.tsCacheDir;
        if (!configSet.isolatedModules && cacheDir) {
            // Make sure the cache directory exists before continuing.
            (0, fs_1.mkdirSync)(cacheDir, { recursive: true });
            this._tsResolvedModulesCachePath = path_1.default.join(cacheDir, (0, sha1_1.sha1)('ts-jest-resolved-modules', exports.CACHE_KEY_EL_SEPARATOR));
            try {
                var cachedTSResolvedModules = (0, fs_1.readFileSync)(this._tsResolvedModulesCachePath, 'utf-8');
                this._depGraphs = new Map((0, utils_1.parse)(cachedTSResolvedModules));
            }
            catch (e) { }
        }
    };
    /**
     * cache ConfigSet between test runs
     *
     * @internal
     */
    TsJestTransformer._cachedConfigSets = [];
    return TsJestTransformer;
}());
