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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const fs_1 = require("fs");
const module_1 = __importDefault(require("module"));
const path_1 = require("path");
const bs_logger_1 = require("bs-logger");
const jest_util_1 = require("jest-util");
const json5_1 = __importDefault(require("json5"));
const constants_1 = require("../../constants");
const hoistJestTransformer = __importStar(require("../../transformers/hoist-jest"));
const utils_1 = require("../../utils");
const backports_1 = require("../../utils/backports");
const importer_1 = require("../../utils/importer");
const messages_1 = require("../../utils/messages");
const normalize_slashes_1 = require("../../utils/normalize-slashes");
const sha1_1 = require("../../utils/sha1");
const ts_error_1 = require("../../utils/ts-error");
/**
 * @internal
 */
exports.MY_DIGEST = (0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, '../../../.ts-jest-digest'), 'utf8');
/**
 * @internal
 */
exports.IGNORE_DIAGNOSTIC_CODES = [
    6059, // "'rootDir' is expected to contain all source files."
    18002, // "The 'files' list in config file is empty."
    18003, // "No inputs were found in config file."
];
/**
 * @internal
 */
exports.TS_JEST_OUT_DIR = '$$ts-jest$$';
const normalizeRegex = (pattern) => pattern ? (typeof pattern === 'string' ? pattern : pattern.source) : undefined;
const toDiagnosticCode = (code) => code ? parseInt(`${code}`.trim().replace(/^TS/, ''), 10) ?? undefined : undefined;
const toDiagnosticCodeList = (items, into = []) => {
    for (let item of items) {
        if (typeof item === 'string') {
            const children = item.trim().split(/\s*,\s*/g);
            if (children.length > 1) {
                toDiagnosticCodeList(children, into);
                continue;
            }
            item = children[0];
        }
        if (!item)
            continue;
        const code = toDiagnosticCode(item);
        if (code && !into.includes(code))
            into.push(code);
    }
    return into;
};
const requireFromString = (code, fileName) => {
    // @ts-expect-error `_nodeModulePaths` is not exposed in typing
    const paths = module_1.default._nodeModulePaths((0, path_1.dirname)(fileName));
    const parent = module.parent;
    const m = new module_1.default(fileName, parent);
    m.filename = fileName;
    m.paths = [].concat(paths);
    // @ts-expect-error `_compile` is not exposed in typing
    m._compile(code, fileName);
    const exports = m.exports;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    parent && parent.children && parent.children.splice(parent.children.indexOf(m), 1);
    return exports;
};
class ConfigSet {
    parentLogger;
    /**
     * Use by e2e, don't mark as internal
     */
    tsJestDigest = exports.MY_DIGEST;
    logger;
    compilerModule;
    isolatedModules;
    cwd;
    rootDir;
    cacheSuffix;
    tsCacheDir;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsedTsConfig;
    resolvedTransformers = {
        before: [],
        after: [],
        afterDeclarations: [],
    };
    useESM = false;
    /**
     * @internal
     */
    babelConfig;
    /**
     * @internal
     */
    babelJestTransformer;
    /**
     * @internal
     */
    _jestCfg;
    /**
     * @internal
     */
    _diagnostics;
    /**
     * @internal
     */
    _stringifyContentRegExp;
    /**
     * @internal
     */
    _matchablePatterns;
    /**
     * @internal
     */
    _matchTestFilePath;
    /**
     * @internal
     */
    _shouldIgnoreDiagnosticsForFile;
    /**
     * @internal
     */
    _overriddenCompilerOptions = {
        inlineSourceMap: false,
        declaration: false, // we don't want to create declaration files
        isolatedDeclarations: false, // we don't want to create declaration files
        noEmit: false, // set to true will make compiler API not emit any compiled results.
        // else istanbul related will be dropped
        removeComments: false,
        // to clear out else it's buggy
        out: undefined,
        outFile: undefined,
        composite: undefined, // see https://github.com/TypeStrong/ts-node/pull/657/files
        declarationDir: undefined,
        declarationMap: undefined,
        emitDeclarationOnly: undefined,
        sourceRoot: undefined,
        tsBuildInfoFile: undefined,
        rewriteRelativeImportExtensions: false,
    };
    /**
     * @internal
     */
    tsconfigFilePath;
    constructor(jestConfig, parentLogger) {
        this.parentLogger = parentLogger;
        this.logger = this.parentLogger
            ? this.parentLogger.child({ [bs_logger_1.LogContexts.namespace]: 'config' })
            : utils_1.rootLogger.child({ namespace: 'config' });
        this._backportJestCfg(jestConfig ?? Object.create(null));
        this.cwd = (0, path_1.normalize)(this._jestCfg.cwd ?? process.cwd());
        this.rootDir = (0, path_1.normalize)(this._jestCfg.rootDir ?? this.cwd);
        const tsJestCfg = this._jestCfg.globals && this._jestCfg.globals['ts-jest'];
        const options = tsJestCfg ?? Object.create(null);
        // compiler module
        this.compilerModule = importer_1.importer.typescript("Using \"ts-jest\" requires this package to be installed." /* ImportReasons.TsJest */, options.compiler ?? 'typescript');
        this.logger.debug({ compilerModule: this.compilerModule }, 'normalized compiler module config via ts-jest option');
        this._setupConfigSet(options);
        this._matchablePatterns = [...this._jestCfg.testMatch, ...this._jestCfg.testRegex].filter((pattern) => 
        /**
         * jest config testRegex doesn't always deliver the correct RegExp object
         * See https://github.com/facebook/jest/issues/9778
         */
        pattern instanceof RegExp || typeof pattern === 'string');
        if (!this._matchablePatterns.length) {
            this._matchablePatterns.push(...constants_1.DEFAULT_JEST_TEST_MATCH);
        }
        this._matchTestFilePath = (0, jest_util_1.globsToMatcher)(this._matchablePatterns.filter((pattern) => typeof pattern === 'string'));
        // isolatedModules
        if (options.isolatedModules) {
            this.parsedTsConfig.options.isolatedModules = true;
            if (this.tsconfigFilePath) {
                this.logger.warn((0, messages_1.interpolate)("\n    The \"ts-jest\" config option \"isolatedModules\" is deprecated and will be removed in v30.0.0. Please use \"isolatedModules: true\" in {{tsconfigFilePath}} instead, see https://www.typescriptlang.org/tsconfig/#isolatedModules\n  " /* Deprecations.IsolatedModulesWithTsconfigPath */, {
                    tsconfigFilePath: this.tsconfigFilePath,
                }));
            }
            else {
                this.logger.warn("\n    The \"ts-jest\" config option \"isolatedModules\" is deprecated and will be removed in v30.0.0. Please use \"isolatedModules: true\", see https://www.typescriptlang.org/tsconfig/#isolatedModules\n  " /* Deprecations.IsolatedModulesWithoutTsconfigPath */);
            }
        }
        this.isolatedModules = this.parsedTsConfig.options.isolatedModules ?? false;
        this._resolveTsCacheDir();
    }
    /**
     * @internal
     */
    _backportJestCfg(jestCfg) {
        const config = (0, backports_1.backportJestConfig)(this.logger, jestCfg);
        this.logger.debug({ jestConfig: config }, 'normalized jest config');
        this._jestCfg = {
            ...config,
            testMatch: config.testMatch ?? constants_1.DEFAULT_JEST_TEST_MATCH,
            testRegex: config.testRegex ?? [],
        };
    }
    /**
     * @internal
     */
    _setupConfigSet(options) {
        // useESM
        this.useESM = options.useESM ?? false;
        // babel config (for babel-jest) default is undefined so we don't need to have fallback like tsConfig
        if (!options.babelConfig) {
            this.logger.debug('babel is disabled');
        }
        else {
            const baseBabelCfg = { cwd: this.cwd };
            if (typeof options.babelConfig === 'string') {
                const babelCfgPath = this.resolvePath(options.babelConfig);
                const babelFileExtName = (0, path_1.extname)(options.babelConfig);
                if (babelFileExtName === '.js' || babelFileExtName === '.cjs') {
                    this.babelConfig = {
                        ...baseBabelCfg,
                        ...require(babelCfgPath),
                    };
                }
                else {
                    this.babelConfig = {
                        ...baseBabelCfg,
                        ...json5_1.default.parse((0, fs_1.readFileSync)(babelCfgPath, 'utf-8')),
                    };
                }
            }
            else if (typeof options.babelConfig === 'object') {
                this.babelConfig = {
                    ...baseBabelCfg,
                    ...options.babelConfig,
                };
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
        const diagnosticsOpt = options.diagnostics ?? true;
        const ignoreList = [...exports.IGNORE_DIAGNOSTIC_CODES];
        if (typeof diagnosticsOpt === 'object') {
            const { ignoreCodes } = diagnosticsOpt;
            if (ignoreCodes) {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                Array.isArray(ignoreCodes) ? ignoreList.push(...ignoreCodes) : ignoreList.push(ignoreCodes);
            }
            this._diagnostics = {
                pretty: diagnosticsOpt.pretty ?? true,
                exclude: diagnosticsOpt.exclude ?? [],
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
                : () => false;
        }
        else {
            this._shouldIgnoreDiagnosticsForFile = () => true;
        }
        this.logger.debug({ diagnostics: this._diagnostics }, 'normalized diagnostics config via ts-jest option');
        // tsconfig
        const tsconfigOpt = options.tsconfig;
        const configFilePath = typeof tsconfigOpt === 'string' ? this.resolvePath(tsconfigOpt) : undefined;
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
        const { astTransformers } = options;
        if (astTransformers) {
            const resolveTransformerFunc = (transformerPath) => {
                let transformerFunc;
                if ((0, path_1.extname)(transformerPath) === '.ts') {
                    const compiledTransformer = importer_1.importer
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
                    this.logger.warn("The AST transformer {{file}} must have an `export const version = <your_transformer_version>`" /* Errors.MissingTransformerVersion */, { file: transformerPath });
                }
                if (!transformerFunc.name) {
                    this.logger.warn("The AST transformer {{file}} must have an `export const name = <your_transformer_name>`" /* Errors.MissingTransformerName */, { file: transformerPath });
                }
                return transformerFunc;
            };
            const resolveTransformers = (transformers) => transformers.map((transformer) => {
                if (typeof transformer === 'string') {
                    return resolveTransformerFunc(this.resolvePath(transformer, { nodeResolve: true }));
                }
                else {
                    return {
                        ...resolveTransformerFunc(this.resolvePath(transformer.path, { nodeResolve: true })),
                        options: transformer.options,
                    };
                }
            });
            if (astTransformers.before) {
                /* istanbul ignore next (already covered in unit test) */
                this.resolvedTransformers.before?.push(...resolveTransformers(astTransformers.before));
            }
            if (astTransformers.after) {
                this.resolvedTransformers = {
                    ...this.resolvedTransformers,
                    after: resolveTransformers(astTransformers.after),
                };
            }
            if (astTransformers.afterDeclarations) {
                this.resolvedTransformers = {
                    ...this.resolvedTransformers,
                    afterDeclarations: resolveTransformers(astTransformers.afterDeclarations),
                };
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
    }
    /**
     * @internal
     */
    _resolveTsCacheDir() {
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
                .reduce((prevVal, currentVal) => [...prevVal, currentVal])
                .map((transformer) => `${transformer.name}-${transformer.version}`),
        }));
        if (!this._jestCfg.cache) {
            this.logger.debug('file caching disabled');
        }
        else {
            const res = (0, path_1.join)(this._jestCfg.cacheDirectory, 'ts-jest', this.cacheSuffix.substr(0, 2), this.cacheSuffix.substr(2));
            this.logger.debug({ cacheDirectory: res }, 'will use file caching');
            this.tsCacheDir = res;
        }
    }
    /**
     * @internal
     */
    _getAndResolveTsConfig(compilerOptions, resolvedConfigFile) {
        const result = this._resolveTsConfig(compilerOptions, resolvedConfigFile);
        const { _overriddenCompilerOptions: forcedOptions } = this;
        const finalOptions = result.options;
        // Target ES2015 output by default (instead of ES3).
        if (finalOptions.target === undefined) {
            finalOptions.target = this.compilerModule.ScriptTarget.ES2015;
        }
        // check the module interoperability
        const target = finalOptions.target;
        // compute the default if not set
        const defaultModule = [this.compilerModule.ScriptTarget.ES3, this.compilerModule.ScriptTarget.ES5].includes(target)
            ? this.compilerModule.ModuleKind.CommonJS
            : this.compilerModule.ModuleKind.ESNext;
        const moduleValue = finalOptions.module ?? defaultModule;
        const warningModulesForEsmInterop = [
            this.compilerModule.ModuleKind.CommonJS,
            this.compilerModule.ModuleKind.Node16,
            this.compilerModule.ModuleKind.NodeNext,
        ];
        if (!this.babelConfig &&
            !warningModulesForEsmInterop.includes(moduleValue) &&
            !(finalOptions.esModuleInterop || finalOptions.allowSyntheticDefaultImports)) {
            result.errors.push({
                code: utils_1.TsJestDiagnosticCodes.ConfigModuleOption,
                messageText: "If you have issues related to imports, you should consider setting `esModuleInterop` to `true` in your TypeScript configuration file (usually `tsconfig.json`). See https://blogs.msdn.microsoft.com/typescript/2018/01/31/announcing-typescript-2-7/#easier-ecmascript-module-interoperability for more information." /* Errors.ConfigNoModuleInterop */,
                category: this.compilerModule.DiagnosticCategory.Message,
                file: undefined,
                start: undefined,
                length: undefined,
            });
        }
        // Make sure when allowJs is enabled, outDir is required to have when using allowJs: true
        if (finalOptions.allowJs && !finalOptions.outDir) {
            finalOptions.outDir = exports.TS_JEST_OUT_DIR;
        }
        // ensure undefined are removed and other values are overridden
        for (const key of Object.keys(forcedOptions)) {
            const val = forcedOptions[key];
            if (val === undefined) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete finalOptions[key];
            }
            else {
                finalOptions[key] = val;
            }
        }
        /**
         * See https://github.com/microsoft/TypeScript/wiki/Node-Target-Mapping
         * Every time this page is updated, we also need to update here. Here we only show warning message for Node LTS versions
         */
        const nodeJsVer = process.version;
        const compilationTarget = result.options.target;
        const TARGET_TO_VERSION_MAPPING = {
            [this.compilerModule.ScriptTarget.ES2018]: 'es2018',
            [this.compilerModule.ScriptTarget.ES2019]: 'es2019',
            [this.compilerModule.ScriptTarget.ES2020]: 'es2020',
            [this.compilerModule.ScriptTarget.ESNext]: 'ESNext',
        };
        /* istanbul ignore next (cover by e2e) */
        if (compilationTarget &&
            !this.babelConfig &&
            nodeJsVer.startsWith('v12') &&
            compilationTarget > this.compilerModule.ScriptTarget.ES2019) {
            const message = (0, messages_1.interpolate)("There is a mismatch between your NodeJs version {{nodeJsVer}} and your TypeScript target {{compilationTarget}}. This might lead to some unexpected errors when running tests with `ts-jest`. To fix this, you can check https://github.com/microsoft/TypeScript/wiki/Node-Target-Mapping" /* Errors.MismatchNodeTargetMapping */, {
                nodeJsVer: process.version,
                compilationTarget: TARGET_TO_VERSION_MAPPING[compilationTarget],
            });
            this.logger.warn(message);
        }
        const resultOptions = result.options;
        const sourceMap = resultOptions.sourceMap ?? true;
        return {
            ...result,
            options: {
                ...resultOptions,
                sourceMap,
                inlineSources: sourceMap,
                module: resultOptions.module ?? this.compilerModule.ModuleKind.CommonJS,
            },
        };
    }
    _resolveTsConfig(compilerOptions, resolvedConfigFile) {
        let config = { compilerOptions: Object.create(null) };
        let basePath = (0, normalize_slashes_1.normalizeSlashes)(this.rootDir);
        const ts = this.compilerModule;
        // Read project configuration when available.
        this.tsconfigFilePath = resolvedConfigFile
            ? (0, normalize_slashes_1.normalizeSlashes)(resolvedConfigFile)
            : ts.findConfigFile((0, normalize_slashes_1.normalizeSlashes)(this.rootDir), ts.sys.fileExists);
        if (this.tsconfigFilePath) {
            this.logger.debug({ tsConfigFileName: this.tsconfigFilePath }, 'readTsConfig(): reading', this.tsconfigFilePath);
            const result = ts.readConfigFile(this.tsconfigFilePath, ts.sys.readFile);
            // Return diagnostics.
            if (result.error) {
                return { errors: [result.error], fileNames: [], options: {} };
            }
            config = result.config;
            basePath = (0, normalize_slashes_1.normalizeSlashes)((0, path_1.dirname)(this.tsconfigFilePath));
        }
        // Override default configuration options `ts-jest` requires.
        config.compilerOptions = {
            ...config.compilerOptions,
            ...compilerOptions,
        };
        // parse json, merge config extending others, ...
        return ts.parseJsonConfigFileContent(config, ts.sys, basePath, undefined, this.tsconfigFilePath);
    }
    isTestFile(fileName) {
        return this._matchablePatterns.some((pattern) => typeof pattern === 'string' ? this._matchTestFilePath(fileName) : pattern.test(fileName));
    }
    shouldStringifyContent(filePath) {
        return this._stringifyContentRegExp ? this._stringifyContentRegExp.test(filePath) : false;
    }
    raiseDiagnostics(diagnostics, filePath, logger = this.logger) {
        const { ignoreCodes } = this._diagnostics;
        const { DiagnosticCategory } = this.compilerModule;
        const filteredDiagnostics = filePath && !this.shouldReportDiagnostics(filePath)
            ? []
            : diagnostics.filter((diagnostic) => {
                if (diagnostic.file?.fileName && !this.shouldReportDiagnostics(diagnostic.file.fileName)) {
                    return false;
                }
                return !ignoreCodes.includes(diagnostic.code);
            });
        if (!filteredDiagnostics.length)
            return;
        const error = this.createTsError(filteredDiagnostics);
        // only throw if `warnOnly` and it is a warning or error
        const importantCategories = [DiagnosticCategory.Warning, DiagnosticCategory.Error];
        if (this._diagnostics.throws && filteredDiagnostics.some((d) => importantCategories.includes(d.category))) {
            throw error;
        }
        logger.warn({ error }, error.message);
    }
    shouldReportDiagnostics(filePath) {
        const fileExtension = (0, path_1.extname)(filePath);
        return constants_1.JS_JSX_EXTENSIONS.includes(fileExtension)
            ? this.parsedTsConfig.options.checkJs && !this._shouldIgnoreDiagnosticsForFile(filePath)
            : !this._shouldIgnoreDiagnosticsForFile(filePath);
    }
    /**
     * @internal
     */
    createTsError(diagnostics) {
        const formatDiagnostics = this._diagnostics.pretty
            ? this.compilerModule.formatDiagnosticsWithColorAndContext
            : this.compilerModule.formatDiagnostics;
        /* istanbul ignore next (not possible to cover) */
        const diagnosticHost = {
            getNewLine: () => '\n',
            getCurrentDirectory: () => this.cwd,
            getCanonicalFileName: (path) => path,
        };
        const diagnosticText = formatDiagnostics(diagnostics, diagnosticHost);
        const diagnosticCodes = diagnostics.map((x) => x.code);
        return new ts_error_1.TSError(diagnosticText, diagnosticCodes);
    }
    resolvePath(inputPath, { throwIfMissing = true, nodeResolve = false } = {}) {
        let path = inputPath;
        let nodeResolved = false;
        if (path.startsWith('<rootDir>')) {
            path = (0, path_1.resolve)((0, path_1.join)(this.rootDir, path.substr(9)));
        }
        else if (!(0, path_1.isAbsolute)(path)) {
            if (!path.startsWith('.') && nodeResolve) {
                try {
                    path = require.resolve(path);
                    nodeResolved = true;
                }
                catch {
                    this.logger.debug({ path }, 'failed to resolve path', path);
                }
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
            catch {
                this.logger.debug({ path }, 'failed to resolve path', path);
            }
        }
        if (throwIfMissing && !(0, fs_1.existsSync)(path)) {
            throw new Error((0, messages_1.interpolate)("File not found: {{inputPath}} (resolved as: {{resolvedPath}})" /* Errors.FileNotFound */, { inputPath, resolvedPath: path }));
        }
        this.logger.debug({ fromPath: inputPath, toPath: path }, 'resolved path from', inputPath, 'to', path);
        return path;
    }
}
exports.ConfigSet = ConfigSet;
