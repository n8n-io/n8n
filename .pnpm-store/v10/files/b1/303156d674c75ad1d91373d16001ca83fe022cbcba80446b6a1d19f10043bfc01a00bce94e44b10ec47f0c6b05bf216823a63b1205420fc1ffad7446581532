"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsCompiler = void 0;
const path_1 = require("path");
const bs_logger_1 = require("bs-logger");
const lodash_memoize_1 = __importDefault(require("lodash.memoize"));
const typescript_1 = __importDefault(require("typescript"));
const constants_1 = require("../../constants");
const transpile_module_1 = require("../../transpilers/typescript/transpile-module");
const utils_1 = require("../../utils");
const messages_1 = require("../../utils/messages");
const compiler_utils_1 = require("./compiler-utils");
const assertCompilerOptionsWithJestTransformMode = (compilerOptions, isEsmMode, logger) => {
    if (isEsmMode && compilerOptions.module === typescript_1.default.ModuleKind.CommonJS) {
        logger.error("The current compiler option \"module\" value is not suitable for Jest ESM mode. Please either use ES module kinds or Node16/NodeNext module kinds with \"type: module\" in package.json" /* Errors.InvalidModuleKindForEsm */);
    }
};
class TsCompiler {
    configSet;
    runtimeCacheFS;
    _logger;
    _ts;
    _initialCompilerOptions;
    _compilerOptions;
    /**
     * @private
     */
    _runtimeCacheFS;
    /**
     * @private
     */
    _fileContentCache;
    /**
     * @internal
     */
    _parsedTsConfig;
    /**
     * @internal
     */
    _fileVersionCache;
    /**
     * @internal
     */
    _cachedReadFile;
    /**
     * @internal
     */
    _projectVersion = 1;
    /**
     * @internal
     */
    _languageService;
    /**
     * @internal
     */
    _moduleResolutionHost;
    /**
     * @internal
     */
    _moduleResolutionCache;
    program;
    constructor(configSet, runtimeCacheFS) {
        this.configSet = configSet;
        this.runtimeCacheFS = runtimeCacheFS;
        this._ts = configSet.compilerModule;
        this._logger = utils_1.rootLogger.child({ namespace: 'ts-compiler' });
        this._parsedTsConfig = this.configSet.parsedTsConfig;
        this._initialCompilerOptions = { ...this._parsedTsConfig.options };
        this._compilerOptions = { ...this._initialCompilerOptions };
        this._runtimeCacheFS = runtimeCacheFS;
        if (!this.configSet.isolatedModules) {
            this._fileContentCache = new Map();
            this._fileVersionCache = new Map();
            this._cachedReadFile = this._logger.wrap({
                namespace: 'ts:serviceHost',
                call: null,
                [bs_logger_1.LogContexts.logLevel]: bs_logger_1.LogLevels.trace,
            }, 'readFile', (0, lodash_memoize_1.default)(this._ts.sys.readFile));
            /* istanbul ignore next */
            this._moduleResolutionHost = {
                fileExists: (0, lodash_memoize_1.default)(this._ts.sys.fileExists),
                readFile: this._cachedReadFile,
                directoryExists: (0, lodash_memoize_1.default)(this._ts.sys.directoryExists),
                getCurrentDirectory: () => this.configSet.cwd,
                realpath: this._ts.sys.realpath && (0, lodash_memoize_1.default)(this._ts.sys.realpath),
                getDirectories: (0, lodash_memoize_1.default)(this._ts.sys.getDirectories),
                useCaseSensitiveFileNames: () => this._ts.sys.useCaseSensitiveFileNames,
            };
            this._moduleResolutionCache = this._ts.createModuleResolutionCache(this.configSet.cwd, this._ts.sys.useCaseSensitiveFileNames ? (x) => x : (x) => x.toLowerCase(), this._compilerOptions);
            this._createLanguageService();
        }
    }
    getResolvedModules(fileContent, fileName, runtimeCacheFS) {
        // In watch mode, it is possible that the initial cacheFS becomes empty
        if (!this.runtimeCacheFS.size) {
            this._runtimeCacheFS = runtimeCacheFS;
        }
        this._logger.debug({ fileName }, 'getResolvedModules(): resolve direct imported module paths');
        const importedModulePaths = Array.from(new Set(this._getImportedModulePaths(fileContent, fileName)));
        this._logger.debug({ fileName }, 'getResolvedModules(): resolve nested imported module paths from directed imported module paths');
        importedModulePaths.forEach((importedModulePath) => {
            const resolvedFileContent = this._getFileContentFromCache(importedModulePath);
            importedModulePaths.push(...this._getImportedModulePaths(resolvedFileContent, importedModulePath).filter((modulePath) => !importedModulePaths.includes(modulePath)));
        });
        return importedModulePaths;
    }
    fixupCompilerOptionsForModuleKind(compilerOptions, isEsm) {
        const moduleResolution = this._ts.ModuleResolutionKind.Node10 ?? this._ts.ModuleResolutionKind.NodeJs;
        if (!isEsm) {
            return {
                ...compilerOptions,
                module: this._ts.ModuleKind.CommonJS,
                moduleResolution,
                /**
                 * This option is only supported in `Node16`/`NodeNext` and `Bundler` module, see https://www.typescriptlang.org/tsconfig/#customConditions
                 */
                customConditions: undefined,
            };
        }
        let moduleKind = compilerOptions.module ?? this._ts.ModuleKind.ESNext;
        let esModuleInterop = compilerOptions.esModuleInterop;
        if ((0, transpile_module_1.isModernNodeModuleKind)(moduleKind)) {
            esModuleInterop = true;
            moduleKind = this._ts.ModuleKind.ESNext;
        }
        return {
            ...compilerOptions,
            module: moduleKind,
            esModuleInterop,
            moduleResolution,
            /**
             * This option is only supported in `Node16`/`NodeNext` and `Bundler` module, see https://www.typescriptlang.org/tsconfig/#customConditions
             */
            customConditions: undefined,
        };
    }
    getCompiledOutput(fileContent, fileName, options) {
        const isEsmMode = this.configSet.useESM && options.supportsStaticESM;
        this._compilerOptions = this.fixupCompilerOptionsForModuleKind(this._initialCompilerOptions, isEsmMode);
        const moduleKind = this._initialCompilerOptions.module;
        const currentModuleKind = this._compilerOptions.module;
        if (this._languageService) {
            if (constants_1.JS_JSX_REGEX.test(fileName) && !this._compilerOptions.allowJs) {
                this._logger.warn({ fileName: fileName }, (0, messages_1.interpolate)("Got a `.js` file to compile while `allowJs` option is not set to `true` (file: {{path}}). To fix this:\n  - if you want TypeScript to process JS files, set `allowJs` to `true` in your TypeScript config (usually tsconfig.json)\n  - if you do not want TypeScript to process your `.js` files, in your Jest config change the `transform` key which value is `ts-jest` so that it does not match `.js` files anymore" /* Errors.GotJsFileButAllowJsFalse */, { path: fileName }));
                return {
                    code: fileContent,
                };
            }
            this._logger.debug({ fileName }, 'getCompiledOutput(): compiling using language service');
            // Must set memory cache before attempting to compile
            this._updateMemoryCache(fileContent, fileName, currentModuleKind === moduleKind);
            const output = this._languageService.getEmitOutput(fileName);
            const diagnostics = this.getDiagnostics(fileName);
            if ((0, transpile_module_1.isModernNodeModuleKind)(this._initialCompilerOptions.module)) {
                this.configSet.raiseDiagnostics([
                    {
                        category: this._ts.DiagnosticCategory.Message,
                        code: utils_1.TsJestDiagnosticCodes.ModernNodeModule,
                        messageText: messages_1.Helps.UsingModernNodeResolution,
                        file: undefined,
                        start: undefined,
                        length: undefined,
                    },
                ]);
            }
            if (!isEsmMode && diagnostics.length) {
                this.configSet.raiseDiagnostics(diagnostics, fileName, this._logger);
                if (options.watchMode) {
                    this._logger.debug({ fileName }, '_doTypeChecking(): starting watch mode computing diagnostics');
                    for (const entry of options.depGraphs.entries()) {
                        const normalizedModuleNames = entry[1].resolvedModuleNames.map((moduleName) => (0, path_1.normalize)(moduleName));
                        const fileToReTypeCheck = entry[0];
                        if (normalizedModuleNames.includes(fileName) && this.configSet.shouldReportDiagnostics(fileToReTypeCheck)) {
                            this._logger.debug({ fileToReTypeCheck }, '_doTypeChecking(): computing diagnostics using language service');
                            this._updateMemoryCache(this._getFileContentFromCache(fileToReTypeCheck), fileToReTypeCheck);
                            const importedModulesDiagnostics = [
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                ...this._languageService.getSemanticDiagnostics(fileToReTypeCheck),
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                ...this._languageService.getSyntacticDiagnostics(fileToReTypeCheck),
                            ];
                            // will raise or just warn diagnostics depending on config
                            this.configSet.raiseDiagnostics(importedModulesDiagnostics, fileName, this._logger);
                        }
                    }
                }
            }
            if (output.emitSkipped) {
                if (constants_1.TS_TSX_REGEX.test(fileName)) {
                    throw new Error((0, messages_1.interpolate)("Unable to process '{{file}}', please make sure that `outDir` in your tsconfig is neither `''` or `'.'`. You can also configure Jest config option `transformIgnorePatterns` to inform `ts-jest` to transform {{file}}" /* Errors.CannotProcessFile */, { file: fileName }));
                }
                else {
                    this._logger.warn((0, messages_1.interpolate)("Unable to process '{{file}}', falling back to original file content. You can also configure Jest config option `transformIgnorePatterns` to ignore {{file}} from transformation or make sure that `outDir` in your tsconfig is neither `''` or `'.'`" /* Errors.CannotProcessFileReturnOriginal */, { file: fileName }));
                    return {
                        code: fileContent,
                    };
                }
            }
            // Throw an error when requiring `.d.ts` files.
            if (!output.outputFiles.length) {
                throw new TypeError((0, messages_1.interpolate)("Unable to require `.d.ts` file for file: {{file}}.\nThis is usually the result of a faulty configuration or import. Make sure there is a `.js`, `.json` or another executable extension available alongside `{{file}}`." /* Errors.UnableToRequireDefinitionFile */, {
                    file: (0, path_1.basename)(fileName),
                }));
            }
            const { outputFiles } = output;
            return this._compilerOptions.sourceMap
                ? {
                    code: (0, compiler_utils_1.updateOutput)(outputFiles[1].text, fileName, outputFiles[0].text),
                    diagnostics,
                }
                : {
                    code: (0, compiler_utils_1.updateOutput)(outputFiles[0].text, fileName),
                    diagnostics,
                };
        }
        else {
            this._logger.debug({ fileName }, 'getCompiledOutput(): compiling as isolated module');
            assertCompilerOptionsWithJestTransformMode(this._initialCompilerOptions, isEsmMode, this._logger);
            const result = this._transpileOutput(fileContent, fileName);
            if (result.diagnostics && this.configSet.shouldReportDiagnostics(fileName)) {
                this.configSet.raiseDiagnostics(result.diagnostics, fileName, this._logger);
            }
            return {
                code: (0, compiler_utils_1.updateOutput)(result.outputText, fileName, result.sourceMapText),
            };
        }
    }
    _transpileOutput(fileContent, fileName) {
        /**
         * @deprecated
         *
         * This code path should be removed in the next major version to benefit from checking on compiler options
         */
        if (!(0, transpile_module_1.isModernNodeModuleKind)(this._initialCompilerOptions.module)) {
            return this._ts.transpileModule(fileContent, {
                fileName,
                transformers: this._makeTransformers(this.configSet.resolvedTransformers),
                compilerOptions: this._compilerOptions,
                reportDiagnostics: this.configSet.shouldReportDiagnostics(fileName),
            });
        }
        return (0, transpile_module_1.tsTranspileModule)(fileContent, {
            fileName,
            transformers: (program) => {
                this.program = program;
                return this._makeTransformers(this.configSet.resolvedTransformers);
            },
            compilerOptions: this._initialCompilerOptions,
            reportDiagnostics: fileName ? this.configSet.shouldReportDiagnostics(fileName) : false,
        });
    }
    _makeTransformers(customTransformers) {
        return {
            before: customTransformers.before.map((beforeTransformer) => beforeTransformer.factory(this, beforeTransformer.options)),
            after: customTransformers.after.map((afterTransformer) => afterTransformer.factory(this, afterTransformer.options)),
            afterDeclarations: customTransformers.afterDeclarations.map((afterDeclarations) => afterDeclarations.factory(this, afterDeclarations.options)),
        };
    }
    /**
     * @internal
     */
    _createLanguageService() {
        // Initialize memory cache for typescript compiler
        this._parsedTsConfig.fileNames
            .filter((fileName) => constants_1.TS_TSX_REGEX.test(fileName) && !this.configSet.isTestFile(fileName))
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .forEach((fileName) => this._fileVersionCache.set(fileName, 0));
        /* istanbul ignore next */
        const serviceHost = {
            useCaseSensitiveFileNames: () => this._ts.sys.useCaseSensitiveFileNames,
            getProjectVersion: () => String(this._projectVersion),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            getScriptFileNames: () => [...this._fileVersionCache.keys()],
            getScriptVersion: (fileName) => {
                const normalizedFileName = (0, path_1.normalize)(fileName);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const version = this._fileVersionCache.get(normalizedFileName);
                // We need to return `undefined` and not a string here because TypeScript will use
                // `getScriptVersion` and compare against their own version - which can be `undefined`.
                // If we don't return `undefined` it results in `undefined === "undefined"` and run
                // `createProgram` again (which is very slow). Using a `string` assertion here to avoid
                // TypeScript errors from the function signature (expects `(x: string) => string`).
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return version === undefined ? undefined : String(version);
            },
            getScriptSnapshot: (fileName) => {
                const normalizedFileName = (0, path_1.normalize)(fileName);
                const hit = this._isFileInCache(normalizedFileName);
                this._logger.trace({ normalizedFileName, cacheHit: hit }, 'getScriptSnapshot():', 'cache', hit ? 'hit' : 'miss');
                // Read file content from either memory cache or Jest runtime cache or fallback to file system read
                if (!hit) {
                    const fileContent = 
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this._fileContentCache.get(normalizedFileName) ??
                        this._runtimeCacheFS.get(normalizedFileName) ??
                        this._cachedReadFile?.(normalizedFileName) ??
                        undefined;
                    if (fileContent !== undefined) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        this._fileContentCache.set(normalizedFileName, fileContent);
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        this._fileVersionCache.set(normalizedFileName, 1);
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const contents = this._fileContentCache.get(normalizedFileName);
                if (contents === undefined)
                    return;
                return this._ts.ScriptSnapshot.fromString(contents);
            },
            fileExists: (0, lodash_memoize_1.default)(this._ts.sys.fileExists),
            readFile: this._cachedReadFile ?? this._ts.sys.readFile,
            readDirectory: (0, lodash_memoize_1.default)(this._ts.sys.readDirectory),
            getDirectories: (0, lodash_memoize_1.default)(this._ts.sys.getDirectories),
            directoryExists: (0, lodash_memoize_1.default)(this._ts.sys.directoryExists),
            realpath: this._ts.sys.realpath && (0, lodash_memoize_1.default)(this._ts.sys.realpath),
            getNewLine: () => constants_1.LINE_FEED,
            getCurrentDirectory: () => this.configSet.cwd,
            getCompilationSettings: () => this._compilerOptions,
            getDefaultLibFileName: () => this._ts.getDefaultLibFilePath(this._compilerOptions),
            getCustomTransformers: () => this._makeTransformers(this.configSet.resolvedTransformers),
            resolveModuleNames: (moduleNames, containingFile) => moduleNames.map((moduleName) => this._resolveModuleName(moduleName, containingFile).resolvedModule),
        };
        this._logger.debug('created language service');
        this._languageService = this._ts.createLanguageService(serviceHost, this._ts.createDocumentRegistry(this._ts.sys.useCaseSensitiveFileNames, this.configSet.cwd));
        this.program = this._languageService.getProgram();
    }
    /**
     * @internal
     */
    _getFileContentFromCache(filePath) {
        const normalizedFilePath = (0, path_1.normalize)(filePath);
        let resolvedFileContent = this._runtimeCacheFS.get(normalizedFilePath);
        if (!resolvedFileContent) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            resolvedFileContent = this._moduleResolutionHost.readFile(normalizedFilePath);
            this._runtimeCacheFS.set(normalizedFilePath, resolvedFileContent);
        }
        return resolvedFileContent;
    }
    /**
     * @internal
     */
    _getImportedModulePaths(resolvedFileContent, containingFile) {
        return this._ts
            .preProcessFile(resolvedFileContent, true, true)
            .importedFiles.map((importedFile) => {
            const { resolvedModule } = this._resolveModuleName(importedFile.fileName, containingFile);
            /* istanbul ignore next already covered  */
            const resolvedFileName = resolvedModule?.resolvedFileName;
            /* istanbul ignore next already covered  */
            return resolvedFileName && !resolvedModule?.isExternalLibraryImport ? resolvedFileName : '';
        })
            .filter((resolveFileName) => !!resolveFileName);
    }
    /**
     * @internal
     */
    _resolveModuleName(moduleNameToResolve, containingFile) {
        return this._ts.resolveModuleName(moduleNameToResolve, containingFile, this._compilerOptions, 
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._moduleResolutionHost, 
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._moduleResolutionCache);
    }
    /**
     * @internal
     */
    _isFileInCache(fileName) {
        return (
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._fileContentCache.has(fileName) &&
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this._fileVersionCache.has(fileName) &&
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this._fileVersionCache.get(fileName) !== 0);
    }
    /**
     * @internal
     */
    _updateMemoryCache(contents, fileName, isModuleKindTheSame = true) {
        this._logger.debug({ fileName }, 'updateMemoryCache: update memory cache for language service');
        let shouldIncrementProjectVersion = false;
        const hit = this._isFileInCache(fileName);
        if (!hit) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this._fileVersionCache.set(fileName, 1);
            shouldIncrementProjectVersion = true;
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const prevVersion = this._fileVersionCache.get(fileName);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const previousContents = this._fileContentCache.get(fileName);
            // Avoid incrementing cache when nothing has changed.
            if (previousContents !== contents) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this._fileVersionCache.set(fileName, prevVersion + 1);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this._fileContentCache.set(fileName, contents);
                shouldIncrementProjectVersion = true;
            }
            /**
             * When a file is from node_modules or referenced to a referenced project and jest wants to transform it, we need
             * to make sure that the Program is updated with this information
             */
            if (!this._parsedTsConfig.fileNames.includes(fileName) || !isModuleKindTheSame) {
                shouldIncrementProjectVersion = true;
            }
        }
        if (shouldIncrementProjectVersion)
            this._projectVersion++;
    }
    /**
     * @internal
     */
    getDiagnostics(fileName) {
        const diagnostics = [];
        if (this.configSet.shouldReportDiagnostics(fileName)) {
            this._logger.debug({ fileName }, '_doTypeChecking(): computing diagnostics using language service');
            // Get the relevant diagnostics - this is 3x faster than `getPreEmitDiagnostics`.
            diagnostics.push(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...this._languageService.getSemanticDiagnostics(fileName), 
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...this._languageService.getSyntacticDiagnostics(fileName));
        }
        return diagnostics;
    }
}
exports.TsCompiler = TsCompiler;
