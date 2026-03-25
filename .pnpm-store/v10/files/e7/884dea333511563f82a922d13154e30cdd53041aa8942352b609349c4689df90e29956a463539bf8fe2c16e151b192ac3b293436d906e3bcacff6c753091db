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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
exports.ConfigSet = exports.TS_JEST_OUT_DIR = exports.IGNORE_DIAGNOSTIC_CODES = exports.MY_DIGEST = void 0;
/**
 * This is the core of settings and so ts-jest.
 * Since configuration are used to create a good cache key, everything
 * depending on it is here. Fast jest relies on correct cache keys
 * depending on all settings that could affect the generated output.
 *
 * The big issue is that jest calls first `getCacheKey()` with stringified
 * version of the `jest.ProjectConfig`, and then later it calls `process()`
 * with the complete, object version of it.
 */
var fs_1 = require("fs");
var module_1 = __importDefault(require("module"));
var path_1 = require("path");
var bs_logger_1 = require("bs-logger");
var jest_util_1 = require("jest-util");
var json5_1 = __importDefault(require("json5"));
var constants_1 = require("../../constants");
var hoistJestTransformer = __importStar(require("../../transformers/hoist-jest"));
var utils_1 = require("../../utils");
var backports_1 = require("../../utils/backports");
var importer_1 = require("../../utils/importer");
var messages_1 = require("../../utils/messages");
var normalize_slashes_1 = require("../../utils/normalize-slashes");
var sha1_1 = require("../../utils/sha1");
var ts_error_1 = require("../../utils/ts-error");
/**
 * @internal
 */
exports.MY_DIGEST = (0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, '../../../.ts-jest-digest'), 'utf8');
/**
 * @internal
 */
exports.IGNORE_DIAGNOSTIC_CODES = [
    6059,
    18002,
    18003, // "No inputs were found in config file."
];
/**
 * @internal
 */
exports.TS_JEST_OUT_DIR = '$$ts-jest$$';
var normalizeRegex = function (pattern) {
    return pattern ? (typeof pattern === 'string' ? pattern : pattern.source) : undefined;
};
var toDiagnosticCode = function (code) { var _a; return code ? (_a = parseInt("".concat(code).trim().replace(/^TS/, ''), 10)) !== null && _a !== void 0 ? _a : undefined : undefined; };
var toDiagnosticCodeList = function (items, into) {
    var e_1, _a;
    if (into === void 0) { into = []; }
    try {
        for (var items_1 = __values(items), items_1_1 = items_1.next(); !items_1_1.done; items_1_1 = items_1.next()) {
            var item = items_1_1.value;
            if (typeof item === 'string') {
                var children = item.trim().split(/\s*,\s*/g);
                if (children.length > 1) {
                    toDiagnosticCodeList(children, into);
                    continue;
                }
                item = children[0];
            }
            if (!item)
                continue;
            var code = toDiagnosticCode(item);
            if (code && !into.includes(code))
                into.push(code);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (items_1_1 && !items_1_1.done && (_a = items_1.return)) _a.call(items_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return into;
};
var requireFromString = function (code, fileName) {
    // @ts-expect-error `_nodeModulePaths` is not exposed in typing
    var paths = module_1.default._nodeModulePaths((0, path_1.dirname)(fileName));
    var parent = module.parent;
    var m = new module_1.default(fileName, parent);
    m.filename = fileName;
    m.paths = [].concat(paths);
    // @ts-expect-error `_compile` is not exposed in typing
    m._compile(code, fileName);
    var exports = m.exports;
    parent && parent.children && parent.children.splice(parent.children.indexOf(m), 1);
    return exports;
};
var ConfigSet = /** @class */ (function () {
    function ConfigSet(jestConfig, parentLogger) {
        var _a, _b;
        var _c, _d, _e, _f;
        this.parentLogger = parentLogger;
        /**
         * Use by e2e, don't mark as internal
         */
        this.tsJestDigest = exports.MY_DIGEST;
        this.resolvedTransformers = {
            before: [],
            after: [],
            afterDeclarations: [],
        };
        this.useESM = false;
        /**
         * @internal
         */
        this._overriddenCompilerOptions = {
            inlineSourceMap: false,
            // we don't want to create declaration files
            declaration: false,
            noEmit: false,
            // else istanbul related will be dropped
            removeComments: false,
            // to clear out else it's buggy
            out: undefined,
            outFile: undefined,
            composite: undefined,
            declarationDir: undefined,
            declarationMap: undefined,
            emitDeclarationOnly: undefined,
            sourceRoot: undefined,
            tsBuildInfoFile: undefined,
        };
        this.logger = this.parentLogger
            ? this.parentLogger.child((_a = {}, _a[bs_logger_1.LogContexts.namespace] = 'config', _a))
            : utils_1.rootLogger.child({ namespace: 'config' });
        this._backportJestCfg(jestConfig !== null && jestConfig !== void 0 ? jestConfig : Object.create(null));
        this.cwd = (0, path_1.normalize)((_c = this._jestCfg.cwd) !== null && _c !== void 0 ? _c : process.cwd());
        this.rootDir = (0, path_1.normalize)((_d = this._jestCfg.rootDir) !== null && _d !== void 0 ? _d : this.cwd);
        var tsJestCfg = this._jestCfg.globals && this._jestCfg.globals['ts-jest'];
        var options = tsJestCfg !== null && tsJestCfg !== void 0 ? tsJestCfg : Object.create(null);
        // compiler module
        this.compilerModule = importer_1.importer.typescript("Using \"ts-jest\" requires this package to be installed." /* ImportReasons.TsJest */, (_e = options.compiler) !== null && _e !== void 0 ? _e : 'typescript');
        // isolatedModules
        this.isolatedModules = (_f = options.isolatedModules) !== null && _f !== void 0 ? _f : false;
        this.logger.debug({ compilerModule: this.compilerModule }, 'normalized compiler module config via ts-jest option');
        this._setupConfigSet(options);
        this._resolveTsCacheDir();
        this._matchablePatterns = __spreadArray(__spreadArray([], __read(this._jestCfg.testMatch), false), __read(this._jestCfg.testRegex), false).filter(function (pattern) {
            /**
             * jest config testRegex doesn't always deliver the correct RegExp object
             * See https://github.com/facebook/jest/issues/9778
             */
            return pattern instanceof RegExp || typeof pattern === 'string';
        });
        if (!this._matchablePatterns.length) {
            (_b = this._matchablePatterns).push.apply(_b, __spreadArray([], __read(constants_1.DEFAULT_JEST_TEST_MATCH), false));
        }
        this._matchTestFilePath = (0, jest_util_1.globsToMatcher)(this._matchablePatterns.filter(function (pattern) { return typeof pattern === 'string'; }));
    }
    /**
     * @internal
     */
    ConfigSet.prototype._backportJestCfg = function (jestCfg) {
        var _a, _b;
        var config = (0, backports_1.backportJestConfig)(this.logger, jestCfg);
        this.logger.debug({ jestConfig: config }, 'normalized jest config');
        this._jestCfg = __assign(__assign({}, config), { testMatch: (_a = config.testMatch) !== null && _a !== void 0 ? _a : constants_1.DEFAULT_JEST_TEST_MATCH, testRegex: (_b = config.testRegex) !== null && _b !== void 0 ? _b : [] });
    };
    /**
     * @internal
     */
    ConfigSet.prototype._setupConfigSet = function (options) {
        var _this = this;
        var _a, _b, _c, _d, _e;
        // useESM
        this.useESM = (_a = options.useESM) !== null && _a !== void 0 ? _a : false;
        // babel config (for babel-jest) default is undefined so we don't need to have fallback like tsConfig
        if (!options.babelConfig) {
            this.logger.debug('babel is disabled');
        }
        else {
            var baseBabelCfg = { cwd: this.cwd };
            if (typeof options.babelConfig === 'string') {
                var babelCfgPath = this.resolvePath(options.babelConfig);
                var babelFileExtName = (0, path_1.extname)(options.babelConfig);
                if (babelFileExtName === '.js' || babelFileExtName === '.cjs') {
                    this.babelConfig = __assign(__assign({}, baseBabelCfg), require(babelCfgPath));
                }
                else {
                    this.babelConfig = __assign(__assign({}, baseBabelCfg), json5_1.default.parse((0, fs_1.readFileSync)(babelCfgPath, 'utf-8')));
                }
            }
            else if (typeof options.babelConfig === 'object') {
                this.babelConfig = __assign(__assign({}, baseBabelCfg), options.babelConfig);
            }
            else {
                this.babelConfig = baseBabelCfg;
            }
            this.logger.debug({ babelConfig: this.babelConfig }, 'normalized babel config via ts-jest option');
            this.babelJestTransformer = importer_1.importer
                .babelJest("Using \"babel-jest\" requires this package to be installed." /* ImportReasons.BabelJest */)
                .createTransformer(this.babelConfig);
            this.logger.debug('created babel-jest transformer');
        }
        // diagnostics
        var diagnosticsOpt = (_b = options.diagnostics) !== null && _b !== void 0 ? _b : true;
        var ignoreList = __spreadArray([], __read(exports.IGNORE_DIAGNOSTIC_CODES), false);
        if (typeof diagnosticsOpt === 'object') {
            var ignoreCodes = diagnosticsOpt.ignoreCodes;
            if (ignoreCodes) {
                Array.isArray(ignoreCodes) ? ignoreList.push.apply(ignoreList, __spreadArray([], __read(ignoreCodes), false)) : ignoreList.push(ignoreCodes);
            }
            this._diagnostics = {
                pretty: (_c = diagnosticsOpt.pretty) !== null && _c !== void 0 ? _c : true,
                exclude: (_d = diagnosticsOpt.exclude) !== null && _d !== void 0 ? _d : [],
                ignoreCodes: toDiagnosticCodeList(ignoreList),
                throws: !diagnosticsOpt.warnOnly,
            };
        }
        else {
            this._diagnostics = {
                ignoreCodes: diagnosticsOpt ? toDiagnosticCodeList(ignoreList) : [],
                exclude: [],
                pretty: true,
                throws: diagnosticsOpt,
            };
        }
        if (diagnosticsOpt) {
            this._shouldIgnoreDiagnosticsForFile = this._diagnostics.exclude.length
                ? (0, jest_util_1.globsToMatcher)(this._diagnostics.exclude)
                : function () { return false; };
        }
        else {
            this._shouldIgnoreDiagnosticsForFile = function () { return true; };
        }
        this.logger.debug({ diagnostics: this._diagnostics }, 'normalized diagnostics config via ts-jest option');
        // tsconfig
        var tsconfigOpt = options.tsconfig;
        var configFilePath = typeof tsconfigOpt === 'string' ? this.resolvePath(tsconfigOpt) : undefined;
        this.parsedTsConfig = this._getAndResolveTsConfig(typeof tsconfigOpt === 'object' ? tsconfigOpt : undefined, configFilePath);
        // throw errors if any matching wanted diagnostics
        this.raiseDiagnostics(this.parsedTsConfig.errors, configFilePath);
        this.logger.debug({ tsconfig: this.parsedTsConfig }, 'normalized typescript config via ts-jest option');
        // transformers
        this.resolvedTransformers.before = [
            {
                factory: hoistJestTransformer.factory,
                name: hoistJestTransformer.name,
                version: hoistJestTransformer.version,
            },
        ];
        var astTransformers = options.astTransformers;
        if (astTransformers) {
            var resolveTransformerFunc_1 = function (transformerPath) {
                var transformerFunc;
                if ((0, path_1.extname)(transformerPath) === '.ts') {
                    var compiledTransformer = importer_1.importer
                        .esBuild("Using \"esbuild\" requires this package to be installed." /* ImportReasons.EsBuild */)
                        .transformSync((0, fs_1.readFileSync)(transformerPath, 'utf-8'), {
                        loader: 'ts',
                        format: 'cjs',
                        target: 'es2015',
                    }).code;
                    transformerFunc = requireFromString(compiledTransformer, transformerPath.replace('.ts', '.js'));
                }
                else {
                    transformerFunc = require(transformerPath);
                }
                if (!transformerFunc.version) {
                    _this.logger.warn("The AST transformer {{file}} must have an `export const version = <your_transformer_version>`" /* Errors.MissingTransformerVersion */, { file: transformerPath });
                }
                if (!transformerFunc.name) {
                    _this.logger.warn("The AST transformer {{file}} must have an `export const name = <your_transformer_name>`" /* Errors.MissingTransformerName */, { file: transformerPath });
                }
                return transformerFunc;
            };
            var resolveTransformers = function (transformers) {
                return transformers.map(function (transformer) {
                    if (typeof transformer === 'string') {
                        return resolveTransformerFunc_1(_this.resolvePath(transformer, { nodeResolve: true }));
                    }
                    else {
                        return __assign(__assign({}, resolveTransformerFunc_1(_this.resolvePath(transformer.path, { nodeResolve: true }))), { options: transformer.options });
                    }
                });
            };
            if (astTransformers.before) {
                /* istanbul ignore next (already covered in unit test) */
                (_e = this.resolvedTransformers.before) === null || _e === void 0 ? void 0 : _e.push.apply(_e, __spreadArray([], __read(resolveTransformers(astTransformers.before)), false));
            }
            if (astTransformers.after) {
                this.resolvedTransformers = __assign(__assign({}, this.resolvedTransformers), { after: resolveTransformers(astTransformers.after) });
            }
            if (astTransformers.afterDeclarations) {
                this.resolvedTransformers = __assign(__assign({}, this.resolvedTransformers), { afterDeclarations: resolveTransformers(astTransformers.afterDeclarations) });
            }
        }
        this.logger.debug({ customTransformers: this.resolvedTransformers }, 'normalized custom AST transformers via ts-jest option');
        // stringifyContentPathRegex
        if (options.stringifyContentPathRegex) {
            this._stringifyContentRegExp =
                typeof options.stringifyContentPathRegex === 'string'
                    ? new RegExp(normalizeRegex(options.stringifyContentPathRegex)) // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    : options.stringifyContentPathRegex;
            this.logger.debug({ stringifyContentPathRegex: this._stringifyContentRegExp }, 'normalized stringifyContentPathRegex config via ts-jest option');
        }
    };
    /**
     * @internal
     */
    ConfigSet.prototype._resolveTsCacheDir = function () {
        this.cacheSuffix = (0, sha1_1.sha1)((0, utils_1.stringify)({
            version: this.compilerModule.version,
            digest: this.tsJestDigest,
            babelConfig: this.babelConfig,
            tsconfig: {
                options: this.parsedTsConfig.options,
                raw: this.parsedTsConfig.raw,
            },
            isolatedModules: this.isolatedModules,
            diagnostics: this._diagnostics,
            transformers: Object.values(this.resolvedTransformers)
                .reduce(function (prevVal, currentVal) { return __spreadArray(__spreadArray([], __read(prevVal), false), [currentVal], false); })
                .map(function (transformer) { return "".concat(transformer.name, "-").concat(transformer.version); }),
        }));
        if (!this._jestCfg.cache) {
            this.logger.debug('file caching disabled');
        }
        else {
            var res = (0, path_1.join)(this._jestCfg.cacheDirectory, 'ts-jest', this.cacheSuffix.substr(0, 2), this.cacheSuffix.substr(2));
            this.logger.debug({ cacheDirectory: res }, 'will use file caching');
            this.tsCacheDir = res;
        }
    };
    /**
     * @internal
     */
    ConfigSet.prototype._getAndResolveTsConfig = function (compilerOptions, resolvedConfigFile) {
        var e_2, _a, _b;
        var _c, _d, _e;
        var result = this._resolveTsConfig(compilerOptions, resolvedConfigFile);
        var forcedOptions = this._overriddenCompilerOptions;
        var finalOptions = result.options;
        // Target ES2015 output by default (instead of ES3).
        if (finalOptions.target === undefined) {
            finalOptions.target = this.compilerModule.ScriptTarget.ES2015;
        }
        // check the module interoperability
        var target = finalOptions.target;
        // compute the default if not set
        var defaultModule = [this.compilerModule.ScriptTarget.ES3, this.compilerModule.ScriptTarget.ES5].includes(target)
            ? this.compilerModule.ModuleKind.CommonJS
            : this.compilerModule.ModuleKind.ESNext;
        var moduleValue = (_c = finalOptions.module) !== null && _c !== void 0 ? _c : defaultModule;
        if (!this.babelConfig &&
            moduleValue !== this.compilerModule.ModuleKind.CommonJS &&
            !(finalOptions.esModuleInterop || finalOptions.allowSyntheticDefaultImports)) {
            result.errors.push({
                code: 151001 /* DiagnosticCodes.ConfigModuleOption */,
                messageText: "If you have issues related to imports, you should consider setting `esModuleInterop` to `true` in your TypeScript configuration file (usually `tsconfig.json`). See https://blogs.msdn.microsoft.com/typescript/2018/01/31/announcing-typescript-2-7/#easier-ecmascript-module-interoperability for more information." /* Errors.ConfigNoModuleInterop */,
                category: this.compilerModule.DiagnosticCategory.Message,
                file: undefined,
                start: undefined,
                length: undefined,
            });
            // at least enable synthetic default imports (except if it's set in the input config)
            /* istanbul ignore next (already covered in unit test) */
            if (!('allowSyntheticDefaultImports' in finalOptions)) {
                finalOptions.allowSyntheticDefaultImports = true;
            }
        }
        // Make sure when allowJs is enabled, outDir is required to have when using allowJs: true
        if (finalOptions.allowJs && !finalOptions.outDir) {
            finalOptions.outDir = exports.TS_JEST_OUT_DIR;
        }
        try {
            // ensure undefined are removed and other values are overridden
            for (var _f = __values(Object.keys(forcedOptions)), _g = _f.next(); !_g.done; _g = _f.next()) {
                var key = _g.value;
                var val = forcedOptions[key];
                if (val === undefined) {
                    delete finalOptions[key];
                }
                else {
                    finalOptions[key] = val;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
        /**
         * See https://github.com/microsoft/TypeScript/wiki/Node-Target-Mapping
         * Every time this page is updated, we also need to update here. Here we only show warning message for Node LTS versions
         */
        var nodeJsVer = process.version;
        var compilationTarget = result.options.target;
        var TARGET_TO_VERSION_MAPPING = (_b = {},
            _b[this.compilerModule.ScriptTarget.ES2018] = 'es2018',
            _b[this.compilerModule.ScriptTarget.ES2019] = 'es2019',
            _b[this.compilerModule.ScriptTarget.ES2020] = 'es2020',
            _b[this.compilerModule.ScriptTarget.ESNext] = 'ESNext',
            _b);
        /* istanbul ignore next (cover by e2e) */
        if (compilationTarget &&
            !this.babelConfig &&
            nodeJsVer.startsWith('v12') &&
            compilationTarget > this.compilerModule.ScriptTarget.ES2019) {
            var message = (0, messages_1.interpolate)("There is a mismatch between your NodeJs version {{nodeJsVer}} and your TypeScript target {{compilationTarget}}. This might lead to some unexpected errors when running tests with `ts-jest`. To fix this, you can check https://github.com/microsoft/TypeScript/wiki/Node-Target-Mapping" /* Errors.MismatchNodeTargetMapping */, {
                nodeJsVer: process.version,
                compilationTarget: TARGET_TO_VERSION_MAPPING[compilationTarget],
            });
            this.logger.warn(message);
        }
        var resultOptions = result.options;
        var sourceMap = (_d = resultOptions.sourceMap) !== null && _d !== void 0 ? _d : true;
        return __assign(__assign({}, result), { options: __assign(__assign({}, resultOptions), { sourceMap: sourceMap, inlineSources: sourceMap, module: (_e = resultOptions.module) !== null && _e !== void 0 ? _e : this.compilerModule.ModuleKind.CommonJS }) });
    };
    // eslint-disable-next-line no-dupe-class-members
    ConfigSet.prototype._resolveTsConfig = function (compilerOptions, resolvedConfigFile) {
        var config = { compilerOptions: Object.create(null) };
        var basePath = (0, normalize_slashes_1.normalizeSlashes)(this.rootDir);
        var ts = this.compilerModule;
        // Read project configuration when available.
        var configFileName = resolvedConfigFile
            ? (0, normalize_slashes_1.normalizeSlashes)(resolvedConfigFile)
            : ts.findConfigFile((0, normalize_slashes_1.normalizeSlashes)(this.rootDir), ts.sys.fileExists);
        if (configFileName) {
            this.logger.debug({ tsConfigFileName: configFileName }, 'readTsConfig(): reading', configFileName);
            var result = ts.readConfigFile(configFileName, ts.sys.readFile);
            // Return diagnostics.
            if (result.error) {
                return { errors: [result.error], fileNames: [], options: {} };
            }
            config = result.config;
            basePath = (0, normalize_slashes_1.normalizeSlashes)((0, path_1.dirname)(configFileName));
        }
        // Override default configuration options `ts-jest` requires.
        config.compilerOptions = __assign(__assign({}, config.compilerOptions), compilerOptions);
        // parse json, merge config extending others, ...
        return ts.parseJsonConfigFileContent(config, ts.sys, basePath, undefined, configFileName);
    };
    ConfigSet.prototype.isTestFile = function (fileName) {
        var _this = this;
        return this._matchablePatterns.some(function (pattern) {
            return typeof pattern === 'string' ? _this._matchTestFilePath(fileName) : pattern.test(fileName);
        });
    };
    ConfigSet.prototype.shouldStringifyContent = function (filePath) {
        return this._stringifyContentRegExp ? this._stringifyContentRegExp.test(filePath) : false;
    };
    ConfigSet.prototype.raiseDiagnostics = function (diagnostics, filePath, logger) {
        var _this = this;
        var ignoreCodes = this._diagnostics.ignoreCodes;
        var DiagnosticCategory = this.compilerModule.DiagnosticCategory;
        var filteredDiagnostics = filePath && !this.shouldReportDiagnostics(filePath)
            ? []
            : diagnostics.filter(function (diagnostic) {
                var _a;
                if (((_a = diagnostic.file) === null || _a === void 0 ? void 0 : _a.fileName) && !_this.shouldReportDiagnostics(diagnostic.file.fileName)) {
                    return false;
                }
                return !ignoreCodes.includes(diagnostic.code);
            });
        if (!filteredDiagnostics.length)
            return;
        var error = this.createTsError(filteredDiagnostics);
        // only throw if `warnOnly` and it is a warning or error
        var importantCategories = [DiagnosticCategory.Warning, DiagnosticCategory.Error];
        if (this._diagnostics.throws && filteredDiagnostics.some(function (d) { return importantCategories.includes(d.category); })) {
            throw error;
        }
        /* istanbul ignore next (already covered) */
        logger ? logger.warn({ error: error }, error.message) : this.logger.warn({ error: error }, error.message);
    };
    ConfigSet.prototype.shouldReportDiagnostics = function (filePath) {
        var fileExtension = (0, path_1.extname)(filePath);
        return constants_1.JS_JSX_EXTENSIONS.includes(fileExtension)
            ? this.parsedTsConfig.options.checkJs && !this._shouldIgnoreDiagnosticsForFile(filePath)
            : !this._shouldIgnoreDiagnosticsForFile(filePath);
    };
    /**
     * @internal
     */
    ConfigSet.prototype.createTsError = function (diagnostics) {
        var _this = this;
        var formatDiagnostics = this._diagnostics.pretty
            ? this.compilerModule.formatDiagnosticsWithColorAndContext
            : this.compilerModule.formatDiagnostics;
        /* istanbul ignore next (not possible to cover) */
        var diagnosticHost = {
            getNewLine: function () { return '\n'; },
            getCurrentDirectory: function () { return _this.cwd; },
            getCanonicalFileName: function (path) { return path; },
        };
        var diagnosticText = formatDiagnostics(diagnostics, diagnosticHost);
        var diagnosticCodes = diagnostics.map(function (x) { return x.code; });
        return new ts_error_1.TSError(diagnosticText, diagnosticCodes);
    };
    ConfigSet.prototype.resolvePath = function (inputPath, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.throwIfMissing, throwIfMissing = _c === void 0 ? true : _c, _d = _b.nodeResolve, nodeResolve = _d === void 0 ? false : _d;
        var path = inputPath;
        var nodeResolved = false;
        if (path.startsWith('<rootDir>')) {
            path = (0, path_1.resolve)((0, path_1.join)(this.rootDir, path.substr(9)));
        }
        else if (!(0, path_1.isAbsolute)(path)) {
            if (!path.startsWith('.') && nodeResolve) {
                try {
                    path = require.resolve(path);
                    nodeResolved = true;
                }
                catch (_) { }
            }
            if (!nodeResolved) {
                path = (0, path_1.resolve)(this.cwd, path);
            }
        }
        if (!nodeResolved && nodeResolve) {
            try {
                path = require.resolve(path);
                nodeResolved = true;
            }
            catch (_) { }
        }
        if (throwIfMissing && !(0, fs_1.existsSync)(path)) {
            throw new Error((0, messages_1.interpolate)("File not found: {{inputPath}} (resolved as: {{resolvedPath}})" /* Errors.FileNotFound */, { inputPath: inputPath, resolvedPath: path }));
        }
        this.logger.debug({ fromPath: inputPath, toPath: path }, 'resolved path from', inputPath, 'to', path);
        return path;
    };
    return ConfigSet;
}());
exports.ConfigSet = ConfigSet;
