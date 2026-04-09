"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsJestTransformer = exports.CACHE_KEY_EL_SEPARATOR = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const importer_1 = require("../utils/importer");
const messages_1 = require("../utils/messages");
const sha1_1 = require("../utils/sha1");
const compiler_1 = require("./compiler");
const compiler_utils_1 = require("./compiler/compiler-utils");
const config_set_1 = require("./config/config-set");
const isNodeModule = (filePath) => {
    return path_1.default.normalize(filePath).split(path_1.default.sep).includes('node_modules');
};
/**
 * @internal
 */
exports.CACHE_KEY_EL_SEPARATOR = '\x00';
class TsJestTransformer {
    transformerOptions;
    /**
     * cache ConfigSet between test runs
     *
     * @internal
     */
    static _cachedConfigSets = [];
    _logger;
    _compiler;
    _transformCfgStr;
    _depGraphs = new Map();
    _watchMode = false;
    constructor(transformerOptions) {
        this.transformerOptions = transformerOptions;
        this._logger = utils_1.rootLogger.child({ namespace: 'ts-jest-transformer' });
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
    _configsFor(transformOptions) {
        const { config, cacheFS } = transformOptions;
        const ccs = TsJestTransformer._cachedConfigSets.find((cs) => cs.jestConfig.value === config);
        let configSet;
        if (ccs) {
            this._transformCfgStr = ccs.transformerCfgStr;
            this._compiler = ccs.compiler;
            this._depGraphs = ccs.depGraphs;
            this._watchMode = ccs.watchMode;
            configSet = ccs.configSet;
        }
        else {
            // try to look-it up by stringified version
            const serializedJestCfg = (0, utils_1.stringify)(config);
            const serializedCcs = TsJestTransformer._cachedConfigSets.find((cs) => cs.jestConfig.serialized === serializedJestCfg);
            if (serializedCcs) {
                // update the object so that we can find it later
                // this happens because jest first calls getCacheKey with stringified version of
                // the config, and then it calls the transformer with the proper object
                serializedCcs.jestConfig.value = config;
                this._transformCfgStr = serializedCcs.transformerCfgStr;
                this._compiler = serializedCcs.compiler;
                this._depGraphs = serializedCcs.depGraphs;
                this._watchMode = serializedCcs.watchMode;
                configSet = serializedCcs.configSet;
            }
            else {
                // create the new record in the index
                this._logger.info('no matching config-set found, creating a new one');
                if (config.globals?.['ts-jest']) {
                    this._logger.warn("Define `ts-jest` config under `globals` is deprecated. Please do\ntransform: {\n    <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],\n},\nSee more at https://kulshekhar.github.io/ts-jest/docs/getting-started/presets#advanced" /* Deprecations.GlobalsTsJestConfigOption */);
                }
                const jestGlobalsConfig = config.globals ?? {};
                const tsJestGlobalsConfig = jestGlobalsConfig['ts-jest'] ?? {};
                const migratedConfig = this.transformerOptions
                    ? {
                        ...config,
                        globals: {
                            ...jestGlobalsConfig,
                            'ts-jest': {
                                ...tsJestGlobalsConfig,
                                ...this.transformerOptions,
                            },
                        },
                    }
                    : config;
                configSet = this._createConfigSet(migratedConfig);
                const jest = { ...migratedConfig };
                // we need to remove some stuff from jest config
                // this which does not depend on config
                jest.cacheDirectory = undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
                this._transformCfgStr = `${new utils_1.JsonableValue(jest).serialized}${configSet.cacheSuffix}`;
                this._createCompiler(configSet, cacheFS);
                this._watchMode = process.argv.includes('--watch');
                TsJestTransformer._cachedConfigSets.push({
                    jestConfig: new utils_1.JsonableValue(config),
                    configSet,
                    transformerCfgStr: this._transformCfgStr,
                    compiler: this._compiler,
                    depGraphs: this._depGraphs,
                    watchMode: this._watchMode,
                });
            }
        }
        return configSet;
    }
    _createConfigSet(config) {
        return new config_set_1.ConfigSet(config);
    }
    _createCompiler(configSet, cacheFS) {
        this._compiler = new compiler_1.TsJestCompiler(configSet, cacheFS);
    }
    process(sourceText, sourcePath, transformOptions) {
        this._logger.debug({ fileName: sourcePath, transformOptions }, 'processing', sourcePath);
        const configs = this._configsFor(transformOptions);
        const shouldStringifyContent = configs.shouldStringifyContent(sourcePath);
        const babelJest = shouldStringifyContent ? undefined : configs.babelJestTransformer;
        let result = {
            code: this.processWithTs(sourceText, sourcePath, transformOptions).code,
        };
        if (babelJest) {
            this._logger.debug({ fileName: sourcePath }, 'calling babel-jest processor');
            // do not instrument here, jest will do it anyway afterwards
            result = babelJest.process(result.code, sourcePath, {
                ...transformOptions,
                instrument: false,
            });
        }
        result = this.runTsJestHook(sourcePath, sourceText, transformOptions, result);
        return result;
    }
    async processAsync(sourceText, sourcePath, transformOptions) {
        this._logger.debug({ fileName: sourcePath, transformOptions }, 'processing', sourcePath);
        const configs = this._configsFor(transformOptions);
        const shouldStringifyContent = configs.shouldStringifyContent(sourcePath);
        const babelJest = shouldStringifyContent ? undefined : configs.babelJestTransformer;
        let result;
        const processWithTsResult = this.processWithTs(sourceText, sourcePath, transformOptions);
        result = {
            code: processWithTsResult.code,
        };
        if (processWithTsResult.diagnostics?.length) {
            throw configs.createTsError(processWithTsResult.diagnostics);
        }
        if (babelJest) {
            this._logger.debug({ fileName: sourcePath }, 'calling babel-jest processor');
            // do not instrument here, jest will do it anyway afterwards
            result = await babelJest.processAsync(result.code, sourcePath, {
                ...transformOptions,
                instrument: false,
            });
        }
        result = this.runTsJestHook(sourcePath, sourceText, transformOptions, result);
        return result;
    }
    processWithTs(sourceText, sourcePath, transformOptions) {
        let result;
        const configs = this._configsFor(transformOptions);
        const shouldStringifyContent = configs.shouldStringifyContent(sourcePath);
        const babelJest = shouldStringifyContent ? undefined : configs.babelJestTransformer;
        const isDefinitionFile = sourcePath.endsWith(constants_1.DECLARATION_TYPE_EXT);
        const isJsFile = constants_1.JS_JSX_REGEX.test(sourcePath);
        const isTsFile = !isDefinitionFile && constants_1.TS_TSX_REGEX.test(sourcePath);
        if (shouldStringifyContent) {
            // handles here what we should simply stringify
            result = {
                code: `module.exports=${(0, utils_1.stringify)(sourceText)}`,
            };
        }
        else if (isDefinitionFile) {
            // do not try to compile declaration files
            result = {
                code: '',
            };
        }
        else if (isJsFile || isTsFile) {
            if (isJsFile && isNodeModule(sourcePath)) {
                const transpiledResult = typescript_1.default.transpileModule(sourceText, {
                    compilerOptions: {
                        ...configs.parsedTsConfig.options,
                        module: transformOptions.supportsStaticESM && transformOptions.transformerConfig.useESM
                            ? typescript_1.default.ModuleKind.ESNext
                            : typescript_1.default.ModuleKind.CommonJS,
                    },
                    fileName: sourcePath,
                });
                result = {
                    code: (0, compiler_utils_1.updateOutput)(transpiledResult.outputText, sourcePath, transpiledResult.sourceMapText),
                };
            }
            else {
                // transpile TS code (source maps are included)
                result = this._compiler.getCompiledOutput(sourceText, sourcePath, {
                    depGraphs: this._depGraphs,
                    supportsStaticESM: transformOptions.supportsStaticESM,
                    watchMode: this._watchMode,
                });
            }
        }
        else {
            // we should not get called for files with other extension than js[x], ts[x] and d.ts,
            // TypeScript will bail if we try to compile, and if it was to call babel, users can
            // define the transform value with `babel-jest` for this extension instead
            const message = babelJest ? "Got a unknown file type to compile (file: {{path}}). To fix this, in your Jest config change the `transform` key which value is `ts-jest` so that it does not match this kind of files anymore. If you still want Babel to process it, add another entry to the `transform` option with value `babel-jest` which key matches this type of files." /* Errors.GotUnknownFileTypeWithBabel */ : "Got a unknown file type to compile (file: {{path}}). To fix this, in your Jest config change the `transform` key which value is `ts-jest` so that it does not match this kind of files anymore." /* Errors.GotUnknownFileTypeWithoutBabel */;
            this._logger.warn({ fileName: sourcePath }, (0, messages_1.interpolate)(message, { path: sourcePath }));
            result = {
                code: sourceText,
            };
        }
        return result;
    }
    runTsJestHook(sourcePath, sourceText, transformOptions, compiledOutput) {
        let hooksFile = process.env.TS_JEST_HOOKS;
        let hooks;
        /* istanbul ignore next (cover by e2e) */
        if (hooksFile) {
            hooksFile = path_1.default.resolve(this._configsFor(transformOptions).cwd, hooksFile);
            hooks = importer_1.importer.tryTheseOr(hooksFile, {});
        }
        // This is not supposed to be a public API but we keep it as some people use it
        if (hooks?.afterProcess) {
            this._logger.debug({ fileName: sourcePath, hookName: 'afterProcess' }, 'calling afterProcess hook');
            const newResult = hooks.afterProcess([sourceText, sourcePath, transformOptions.config, transformOptions], compiledOutput);
            if (newResult) {
                return newResult;
            }
        }
        return compiledOutput;
    }
    /**
     * Jest uses this to cache the compiled version of a file
     *
     * @see https://github.com/facebook/jest/blob/v23.5.0/packages/jest-runtime/src/script_transformer.js#L61-L90
     *
     * @public
     */
    getCacheKey(fileContent, filePath, transformOptions) {
        const configs = this._configsFor(transformOptions);
        this._logger.debug({ fileName: filePath, transformOptions }, 'computing cache key for', filePath);
        // we do not instrument, ensure it is false all the time
        const { supportsStaticESM, instrument = false } = transformOptions;
        const constructingCacheKeyElements = [
            this._transformCfgStr,
            exports.CACHE_KEY_EL_SEPARATOR,
            configs.rootDir,
            exports.CACHE_KEY_EL_SEPARATOR,
            `instrument:${instrument ? 'on' : 'off'}`,
            exports.CACHE_KEY_EL_SEPARATOR,
            `supportsStaticESM:${supportsStaticESM ? 'on' : 'off'}`,
            exports.CACHE_KEY_EL_SEPARATOR,
            fileContent,
            exports.CACHE_KEY_EL_SEPARATOR,
            filePath,
        ];
        if (!configs.isolatedModules && configs.tsCacheDir) {
            let resolvedModuleNames;
            if (this._depGraphs.get(filePath)?.fileContent === fileContent) {
                this._logger.debug({ fileName: filePath, transformOptions }, 'getting resolved modules from disk caching or memory caching for', filePath);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                resolvedModuleNames = this._depGraphs
                    .get(filePath)
                    .resolvedModuleNames.filter((moduleName) => (0, fs_1.existsSync)(moduleName));
            }
            else {
                this._logger.debug({ fileName: filePath, transformOptions }, 'getting resolved modules from TypeScript API for', filePath);
                resolvedModuleNames = this._compiler.getResolvedModules(fileContent, filePath, transformOptions.cacheFS);
                this._depGraphs.set(filePath, {
                    fileContent,
                    resolvedModuleNames,
                });
            }
            resolvedModuleNames.forEach((moduleName) => {
                constructingCacheKeyElements.push(exports.CACHE_KEY_EL_SEPARATOR, moduleName, exports.CACHE_KEY_EL_SEPARATOR, (0, fs_1.statSync)(moduleName).mtimeMs.toString());
            });
        }
        return (0, sha1_1.sha1)(...constructingCacheKeyElements);
    }
    async getCacheKeyAsync(sourceText, sourcePath, transformOptions) {
        return Promise.resolve(this.getCacheKey(sourceText, sourcePath, transformOptions));
    }
}
exports.TsJestTransformer = TsJestTransformer;
