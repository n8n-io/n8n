"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEsmHooks = exports.createFromPreloadedConfig = exports.create = exports.register = exports.TSError = exports.DEFAULTS = exports.VERSION = exports.debug = exports.INSPECT_CUSTOM = exports.env = exports.REGISTER_INSTANCE = exports.createRepl = void 0;
const path_1 = require("path");
const module_1 = require("module");
const util = require("util");
const url_1 = require("url");
const make_error_1 = require("make-error");
const util_1 = require("./util");
const configuration_1 = require("./configuration");
const module_type_classifier_1 = require("./module-type-classifier");
const resolver_functions_1 = require("./resolver-functions");
const cjs_resolve_hooks_1 = require("./cjs-resolve-hooks");
const node_module_type_classifier_1 = require("./node-module-type-classifier");
const file_extensions_1 = require("./file-extensions");
const ts_transpile_module_1 = require("./ts-transpile-module");
var repl_1 = require("./repl");
Object.defineProperty(exports, "createRepl", { enumerable: true, get: function () { return repl_1.createRepl; } });
/**
 * Does this version of node obey the package.json "type" field
 * and throw ERR_REQUIRE_ESM when attempting to require() an ESM modules.
 */
const engineSupportsPackageTypeField = parseInt(process.versions.node.split('.')[0], 10) >= 12;
/**
 * Assert that script can be loaded as CommonJS when we attempt to require it.
 * If it should be loaded as ESM, throw ERR_REQUIRE_ESM like node does.
 *
 * Loaded conditionally so we don't need to support older node versions
 */
let assertScriptCanLoadAsCJS = engineSupportsPackageTypeField
    ? require('../dist-raw/node-internal-modules-cjs-loader').assertScriptCanLoadAsCJSImpl
    : () => {
        /* noop */
    };
/**
 * Registered `ts-node` instance information.
 */
exports.REGISTER_INSTANCE = Symbol.for('ts-node.register.instance');
/** @internal */
exports.env = process.env;
/**
 * @internal
 */
exports.INSPECT_CUSTOM = util.inspect.custom || 'inspect';
/**
 * Debugging `ts-node`.
 */
const shouldDebug = (0, util_1.yn)(exports.env.TS_NODE_DEBUG);
/** @internal */
exports.debug = shouldDebug
    ? (...args) => console.log(`[ts-node ${new Date().toISOString()}]`, ...args)
    : () => undefined;
const debugFn = shouldDebug
    ? (key, fn) => {
        let i = 0;
        return (x) => {
            (0, exports.debug)(key, x, ++i);
            return fn(x);
        };
    }
    : (_, fn) => fn;
/**
 * Export the current version.
 */
exports.VERSION = require('../package.json').version;
/**
 * Default register options, including values specified via environment
 * variables.
 * @internal
 */
exports.DEFAULTS = {
    cwd: (_a = exports.env.TS_NODE_CWD) !== null && _a !== void 0 ? _a : exports.env.TS_NODE_DIR,
    emit: (0, util_1.yn)(exports.env.TS_NODE_EMIT),
    scope: (0, util_1.yn)(exports.env.TS_NODE_SCOPE),
    scopeDir: exports.env.TS_NODE_SCOPE_DIR,
    files: (0, util_1.yn)(exports.env.TS_NODE_FILES),
    pretty: (0, util_1.yn)(exports.env.TS_NODE_PRETTY),
    compiler: exports.env.TS_NODE_COMPILER,
    compilerOptions: (0, util_1.parse)(exports.env.TS_NODE_COMPILER_OPTIONS),
    ignore: (0, util_1.split)(exports.env.TS_NODE_IGNORE),
    project: exports.env.TS_NODE_PROJECT,
    skipProject: (0, util_1.yn)(exports.env.TS_NODE_SKIP_PROJECT),
    skipIgnore: (0, util_1.yn)(exports.env.TS_NODE_SKIP_IGNORE),
    preferTsExts: (0, util_1.yn)(exports.env.TS_NODE_PREFER_TS_EXTS),
    ignoreDiagnostics: (0, util_1.split)(exports.env.TS_NODE_IGNORE_DIAGNOSTICS),
    transpileOnly: (0, util_1.yn)(exports.env.TS_NODE_TRANSPILE_ONLY),
    typeCheck: (0, util_1.yn)(exports.env.TS_NODE_TYPE_CHECK),
    compilerHost: (0, util_1.yn)(exports.env.TS_NODE_COMPILER_HOST),
    logError: (0, util_1.yn)(exports.env.TS_NODE_LOG_ERROR),
    experimentalReplAwait: (_b = (0, util_1.yn)(exports.env.TS_NODE_EXPERIMENTAL_REPL_AWAIT)) !== null && _b !== void 0 ? _b : undefined,
    tsTrace: console.log.bind(console),
};
/**
 * TypeScript diagnostics error.
 */
class TSError extends make_error_1.BaseError {
    constructor(diagnosticText, diagnosticCodes, diagnostics = []) {
        super(`⨯ Unable to compile TypeScript:\n${diagnosticText}`);
        this.diagnosticCodes = diagnosticCodes;
        this.name = 'TSError';
        Object.defineProperty(this, 'diagnosticText', {
            configurable: true,
            writable: true,
            value: diagnosticText,
        });
        Object.defineProperty(this, 'diagnostics', {
            configurable: true,
            writable: true,
            value: diagnostics,
        });
    }
    /**
     * @internal
     */
    [exports.INSPECT_CUSTOM]() {
        return this.diagnosticText;
    }
}
exports.TSError = TSError;
const TS_NODE_SERVICE_BRAND = Symbol('TS_NODE_SERVICE_BRAND');
function register(serviceOrOpts) {
    // Is this a Service or a RegisterOptions?
    let service = serviceOrOpts;
    if (!(serviceOrOpts === null || serviceOrOpts === void 0 ? void 0 : serviceOrOpts[TS_NODE_SERVICE_BRAND])) {
        // Not a service; is options
        service = create((serviceOrOpts !== null && serviceOrOpts !== void 0 ? serviceOrOpts : {}));
    }
    const originalJsHandler = require.extensions['.js'];
    // Expose registered instance globally.
    process[exports.REGISTER_INSTANCE] = service;
    // Register the extensions.
    registerExtensions(service.options.preferTsExts, service.extensions.compiled, service, originalJsHandler);
    (0, cjs_resolve_hooks_1.installCommonjsResolveHooksIfNecessary)(service);
    // Require specified modules before start-up.
    module_1.Module._preloadModules(service.options.require);
    return service;
}
exports.register = register;
/**
 * Create TypeScript compiler instance.
 *
 * @category Basic
 */
function create(rawOptions = {}) {
    const foundConfigResult = (0, configuration_1.findAndReadConfig)(rawOptions);
    return createFromPreloadedConfig(foundConfigResult);
}
exports.create = create;
/** @internal */
function createFromPreloadedConfig(foundConfigResult) {
    var _a, _b, _c, _d;
    const { configFilePath, cwd, options, config, compiler, projectLocalResolveDir, optionBasePaths, } = foundConfigResult;
    const projectLocalResolveHelper = (0, util_1.createProjectLocalResolveHelper)(projectLocalResolveDir);
    const ts = (0, configuration_1.loadCompiler)(compiler);
    // Experimental REPL await is not compatible targets lower than ES2018
    const targetSupportsTla = config.options.target >= ts.ScriptTarget.ES2018;
    if (options.experimentalReplAwait === true && !targetSupportsTla) {
        throw new Error('Experimental REPL await is not compatible with targets lower than ES2018');
    }
    // Top-level await was added in TS 3.8
    const tsVersionSupportsTla = (0, util_1.versionGteLt)(ts.version, '3.8.0');
    if (options.experimentalReplAwait === true && !tsVersionSupportsTla) {
        throw new Error('Experimental REPL await is not compatible with TypeScript versions older than 3.8');
    }
    const shouldReplAwait = options.experimentalReplAwait !== false &&
        tsVersionSupportsTla &&
        targetSupportsTla;
    // swc implies two other options
    // typeCheck option was implemented specifically to allow overriding tsconfig transpileOnly from the command-line
    // So we should allow using typeCheck to override swc
    if (options.swc && !options.typeCheck) {
        if (options.transpileOnly === false) {
            throw new Error("Cannot enable 'swc' option with 'transpileOnly: false'.  'swc' implies 'transpileOnly'.");
        }
        if (options.transpiler) {
            throw new Error("Cannot specify both 'swc' and 'transpiler' options.  'swc' uses the built-in swc transpiler.");
        }
    }
    const readFile = options.readFile || ts.sys.readFile;
    const fileExists = options.fileExists || ts.sys.fileExists;
    // typeCheck can override transpileOnly, useful for CLI flag to override config file
    const transpileOnly = (options.transpileOnly === true || options.swc === true) &&
        options.typeCheck !== true;
    let transpiler = undefined;
    let transpilerBasePath = undefined;
    if (options.transpiler) {
        transpiler = options.transpiler;
        transpilerBasePath = optionBasePaths.transpiler;
    }
    else if (options.swc) {
        transpiler = require.resolve('./transpilers/swc.js');
        transpilerBasePath = optionBasePaths.swc;
    }
    const transformers = options.transformers || undefined;
    const diagnosticFilters = [
        {
            appliesToAllFiles: true,
            filenamesAbsolute: [],
            diagnosticsIgnored: [
                6059,
                18002,
                18003,
                ...(options.experimentalTsImportSpecifiers
                    ? [
                        2691, // "An import path cannot end with a '.ts' extension. Consider importing '<specifier without ext>' instead."
                    ]
                    : []),
                ...(options.ignoreDiagnostics || []),
            ].map(Number),
        },
    ];
    const configDiagnosticList = filterDiagnostics(config.errors, diagnosticFilters);
    const outputCache = new Map();
    const configFileDirname = configFilePath ? (0, path_1.dirname)(configFilePath) : null;
    const scopeDir = (_c = (_b = (_a = options.scopeDir) !== null && _a !== void 0 ? _a : config.options.rootDir) !== null && _b !== void 0 ? _b : configFileDirname) !== null && _c !== void 0 ? _c : cwd;
    const ignoreBaseDir = configFileDirname !== null && configFileDirname !== void 0 ? configFileDirname : cwd;
    const isScoped = options.scope
        ? (fileName) => (0, path_1.relative)(scopeDir, fileName).charAt(0) !== '.'
        : () => true;
    const shouldIgnore = createIgnore(ignoreBaseDir, options.skipIgnore
        ? []
        : (options.ignore || ['(?:^|/)node_modules/']).map((str) => new RegExp(str)));
    const diagnosticHost = {
        getNewLine: () => ts.sys.newLine,
        getCurrentDirectory: () => cwd,
        // TODO switch to getCanonicalFileName we already create later in scope
        getCanonicalFileName: ts.sys.useCaseSensitiveFileNames
            ? (x) => x
            : (x) => x.toLowerCase(),
    };
    if (options.transpileOnly && typeof transformers === 'function') {
        throw new TypeError('Transformers function is unavailable in "--transpile-only"');
    }
    let createTranspiler = initializeTranspilerFactory();
    function initializeTranspilerFactory() {
        var _a;
        if (transpiler) {
            if (!transpileOnly)
                throw new Error('Custom transpiler can only be used when transpileOnly is enabled.');
            const transpilerName = typeof transpiler === 'string' ? transpiler : transpiler[0];
            const transpilerOptions = typeof transpiler === 'string' ? {} : (_a = transpiler[1]) !== null && _a !== void 0 ? _a : {};
            const transpilerConfigLocalResolveHelper = transpilerBasePath
                ? (0, util_1.createProjectLocalResolveHelper)(transpilerBasePath)
                : projectLocalResolveHelper;
            const transpilerPath = transpilerConfigLocalResolveHelper(transpilerName, true);
            const transpilerFactory = require(transpilerPath)
                .create;
            return createTranspiler;
            function createTranspiler(compilerOptions, nodeModuleEmitKind) {
                return transpilerFactory === null || transpilerFactory === void 0 ? void 0 : transpilerFactory({
                    service: {
                        options,
                        config: {
                            ...config,
                            options: compilerOptions,
                        },
                        projectLocalResolveHelper,
                    },
                    transpilerConfigLocalResolveHelper,
                    nodeModuleEmitKind,
                    ...transpilerOptions,
                });
            }
        }
    }
    /**
     * True if require() hooks should interop with experimental ESM loader.
     * Enabled explicitly via a flag since it is a breaking change.
     */
    let experimentalEsmLoader = false;
    function enableExperimentalEsmLoaderInterop() {
        experimentalEsmLoader = true;
    }
    // Install source map support and read from memory cache.
    installSourceMapSupport();
    function installSourceMapSupport() {
        const sourceMapSupport = require('@cspotcode/source-map-support');
        sourceMapSupport.install({
            environment: 'node',
            retrieveFile(pathOrUrl) {
                var _a;
                let path = pathOrUrl;
                // If it's a file URL, convert to local path
                // Note: fileURLToPath does not exist on early node v10
                // I could not find a way to handle non-URLs except to swallow an error
                if (experimentalEsmLoader && path.startsWith('file://')) {
                    try {
                        path = (0, url_1.fileURLToPath)(path);
                    }
                    catch (e) {
                        /* swallow error */
                    }
                }
                path = (0, util_1.normalizeSlashes)(path);
                return ((_a = outputCache.get(path)) === null || _a === void 0 ? void 0 : _a.content) || '';
            },
            redirectConflictingLibrary: true,
            onConflictingLibraryRedirect(request, parent, isMain, options, redirectedRequest) {
                (0, exports.debug)(`Redirected an attempt to require source-map-support to instead receive @cspotcode/source-map-support.  "${parent.filename}" attempted to require or resolve "${request}" and was redirected to "${redirectedRequest}".`);
            },
        });
    }
    const shouldHavePrettyErrors = options.pretty === undefined ? process.stdout.isTTY : options.pretty;
    const formatDiagnostics = shouldHavePrettyErrors
        ? ts.formatDiagnosticsWithColorAndContext || ts.formatDiagnostics
        : ts.formatDiagnostics;
    function createTSError(diagnostics) {
        const diagnosticText = formatDiagnostics(diagnostics, diagnosticHost);
        const diagnosticCodes = diagnostics.map((x) => x.code);
        return new TSError(diagnosticText, diagnosticCodes, diagnostics);
    }
    function reportTSError(configDiagnosticList) {
        const error = createTSError(configDiagnosticList);
        if (options.logError) {
            // Print error in red color and continue execution.
            console.error('\x1b[31m%s\x1b[0m', error);
        }
        else {
            // Throw error and exit the script.
            throw error;
        }
    }
    // Render the configuration errors.
    if (configDiagnosticList.length)
        reportTSError(configDiagnosticList);
    const jsxEmitPreserve = config.options.jsx === ts.JsxEmit.Preserve;
    /**
     * Get the extension for a transpiled file.
     * [MUST_UPDATE_FOR_NEW_FILE_EXTENSIONS]
     */
    function getEmitExtension(path) {
        const lastDotIndex = path.lastIndexOf('.');
        if (lastDotIndex >= 0) {
            const ext = path.slice(lastDotIndex);
            switch (ext) {
                case '.js':
                case '.ts':
                    return '.js';
                case '.jsx':
                case '.tsx':
                    return jsxEmitPreserve ? '.jsx' : '.js';
                case '.mjs':
                case '.mts':
                    return '.mjs';
                case '.cjs':
                case '.cts':
                    return '.cjs';
            }
        }
        return '.js';
    }
    /**
     * Get output from TS compiler w/typechecking.  `undefined` in `transpileOnly`
     * mode.
     */
    let getOutput;
    let getTypeInfo;
    const getCanonicalFileName = ts.createGetCanonicalFileName(ts.sys.useCaseSensitiveFileNames);
    const moduleTypeClassifier = (0, module_type_classifier_1.createModuleTypeClassifier)({
        basePath: (_d = options.optionBasePaths) === null || _d === void 0 ? void 0 : _d.moduleTypes,
        patterns: options.moduleTypes,
    });
    const extensions = (0, file_extensions_1.getExtensions)(config, options, ts.version);
    // Use full language services when the fast option is disabled.
    if (!transpileOnly) {
        const fileContents = new Map();
        const rootFileNames = new Set(config.fileNames);
        const cachedReadFile = (0, util_1.cachedLookup)(debugFn('readFile', readFile));
        // Use language services by default
        if (!options.compilerHost) {
            let projectVersion = 1;
            const fileVersions = new Map(Array.from(rootFileNames).map((fileName) => [fileName, 0]));
            const getCustomTransformers = () => {
                if (typeof transformers === 'function') {
                    const program = service.getProgram();
                    return program ? transformers(program) : undefined;
                }
                return transformers;
            };
            // Create the compiler host for type checking.
            const serviceHost = {
                getProjectVersion: () => String(projectVersion),
                getScriptFileNames: () => Array.from(rootFileNames),
                getScriptVersion: (fileName) => {
                    const version = fileVersions.get(fileName);
                    return version ? version.toString() : '';
                },
                getScriptSnapshot(fileName) {
                    // TODO ordering of this with getScriptVersion?  Should they sync up?
                    let contents = fileContents.get(fileName);
                    // Read contents into TypeScript memory cache.
                    if (contents === undefined) {
                        contents = cachedReadFile(fileName);
                        if (contents === undefined)
                            return;
                        fileVersions.set(fileName, 1);
                        fileContents.set(fileName, contents);
                        projectVersion++;
                    }
                    return ts.ScriptSnapshot.fromString(contents);
                },
                readFile: cachedReadFile,
                readDirectory: ts.sys.readDirectory,
                getDirectories: (0, util_1.cachedLookup)(debugFn('getDirectories', ts.sys.getDirectories)),
                fileExists: (0, util_1.cachedLookup)(debugFn('fileExists', fileExists)),
                directoryExists: (0, util_1.cachedLookup)(debugFn('directoryExists', ts.sys.directoryExists)),
                realpath: ts.sys.realpath
                    ? (0, util_1.cachedLookup)(debugFn('realpath', ts.sys.realpath))
                    : undefined,
                getNewLine: () => ts.sys.newLine,
                useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
                getCurrentDirectory: () => cwd,
                getCompilationSettings: () => config.options,
                getDefaultLibFileName: () => ts.getDefaultLibFilePath(config.options),
                getCustomTransformers: getCustomTransformers,
                trace: options.tsTrace,
            };
            const { resolveModuleNames, getResolvedModuleWithFailedLookupLocationsFromCache, resolveTypeReferenceDirectives, isFileKnownToBeInternal, markBucketOfFilenameInternal, } = (0, resolver_functions_1.createResolverFunctions)({
                host: serviceHost,
                getCanonicalFileName,
                ts,
                cwd,
                config,
                projectLocalResolveHelper,
                options,
                extensions,
            });
            serviceHost.resolveModuleNames = resolveModuleNames;
            serviceHost.getResolvedModuleWithFailedLookupLocationsFromCache =
                getResolvedModuleWithFailedLookupLocationsFromCache;
            serviceHost.resolveTypeReferenceDirectives =
                resolveTypeReferenceDirectives;
            const registry = ts.createDocumentRegistry(ts.sys.useCaseSensitiveFileNames, cwd);
            const service = ts.createLanguageService(serviceHost, registry);
            const updateMemoryCache = (contents, fileName) => {
                // Add to `rootFiles` as necessary, either to make TS include a file it has not seen,
                // or to trigger a re-classification of files from external to internal.
                if (!rootFileNames.has(fileName) &&
                    !isFileKnownToBeInternal(fileName)) {
                    markBucketOfFilenameInternal(fileName);
                    rootFileNames.add(fileName);
                    // Increment project version for every change to rootFileNames.
                    projectVersion++;
                }
                const previousVersion = fileVersions.get(fileName) || 0;
                const previousContents = fileContents.get(fileName);
                // Avoid incrementing cache when nothing has changed.
                if (contents !== previousContents) {
                    fileVersions.set(fileName, previousVersion + 1);
                    fileContents.set(fileName, contents);
                    // Increment project version for every file change.
                    projectVersion++;
                }
            };
            let previousProgram = undefined;
            getOutput = (code, fileName) => {
                updateMemoryCache(code, fileName);
                const programBefore = service.getProgram();
                if (programBefore !== previousProgram) {
                    (0, exports.debug)(`compiler rebuilt Program instance when getting output for ${fileName}`);
                }
                const output = service.getEmitOutput(fileName);
                // Get the relevant diagnostics - this is 3x faster than `getPreEmitDiagnostics`.
                const diagnostics = service
                    .getSemanticDiagnostics(fileName)
                    .concat(service.getSyntacticDiagnostics(fileName));
                const programAfter = service.getProgram();
                (0, exports.debug)('invariant: Is service.getProject() identical before and after getting emit output and diagnostics? (should always be true) ', programBefore === programAfter);
                previousProgram = programAfter;
                const diagnosticList = filterDiagnostics(diagnostics, diagnosticFilters);
                if (diagnosticList.length)
                    reportTSError(diagnosticList);
                if (output.emitSkipped) {
                    return [undefined, undefined, true];
                }
                // Throw an error when requiring `.d.ts` files.
                if (output.outputFiles.length === 0) {
                    throw new TypeError(`Unable to require file: ${(0, path_1.relative)(cwd, fileName)}\n` +
                        'This is usually the result of a faulty configuration or import. ' +
                        'Make sure there is a `.js`, `.json` or other executable extension with ' +
                        'loader attached before `ts-node` available.');
                }
                return [output.outputFiles[1].text, output.outputFiles[0].text, false];
            };
            getTypeInfo = (code, fileName, position) => {
                const normalizedFileName = (0, util_1.normalizeSlashes)(fileName);
                updateMemoryCache(code, normalizedFileName);
                const info = service.getQuickInfoAtPosition(normalizedFileName, position);
                const name = ts.displayPartsToString(info ? info.displayParts : []);
                const comment = ts.displayPartsToString(info ? info.documentation : []);
                return { name, comment };
            };
        }
        else {
            const sys = {
                ...ts.sys,
                ...diagnosticHost,
                readFile: (fileName) => {
                    const cacheContents = fileContents.get(fileName);
                    if (cacheContents !== undefined)
                        return cacheContents;
                    const contents = cachedReadFile(fileName);
                    if (contents)
                        fileContents.set(fileName, contents);
                    return contents;
                },
                readDirectory: ts.sys.readDirectory,
                getDirectories: (0, util_1.cachedLookup)(debugFn('getDirectories', ts.sys.getDirectories)),
                fileExists: (0, util_1.cachedLookup)(debugFn('fileExists', fileExists)),
                directoryExists: (0, util_1.cachedLookup)(debugFn('directoryExists', ts.sys.directoryExists)),
                resolvePath: (0, util_1.cachedLookup)(debugFn('resolvePath', ts.sys.resolvePath)),
                realpath: ts.sys.realpath
                    ? (0, util_1.cachedLookup)(debugFn('realpath', ts.sys.realpath))
                    : undefined,
            };
            const host = ts.createIncrementalCompilerHost
                ? ts.createIncrementalCompilerHost(config.options, sys)
                : {
                    ...sys,
                    getSourceFile: (fileName, languageVersion) => {
                        const contents = sys.readFile(fileName);
                        if (contents === undefined)
                            return;
                        return ts.createSourceFile(fileName, contents, languageVersion);
                    },
                    getDefaultLibLocation: () => (0, util_1.normalizeSlashes)((0, path_1.dirname)(compiler)),
                    getDefaultLibFileName: () => (0, util_1.normalizeSlashes)((0, path_1.join)((0, path_1.dirname)(compiler), ts.getDefaultLibFileName(config.options))),
                    useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames,
                };
            host.trace = options.tsTrace;
            const { resolveModuleNames, resolveTypeReferenceDirectives, isFileKnownToBeInternal, markBucketOfFilenameInternal, } = (0, resolver_functions_1.createResolverFunctions)({
                host,
                cwd,
                config,
                ts,
                getCanonicalFileName,
                projectLocalResolveHelper,
                options,
                extensions,
            });
            host.resolveModuleNames = resolveModuleNames;
            host.resolveTypeReferenceDirectives = resolveTypeReferenceDirectives;
            // Fallback for older TypeScript releases without incremental API.
            let builderProgram = ts.createIncrementalProgram
                ? ts.createIncrementalProgram({
                    rootNames: Array.from(rootFileNames),
                    options: config.options,
                    host,
                    configFileParsingDiagnostics: config.errors,
                    projectReferences: config.projectReferences,
                })
                : ts.createEmitAndSemanticDiagnosticsBuilderProgram(Array.from(rootFileNames), config.options, host, undefined, config.errors, config.projectReferences);
            // Read and cache custom transformers.
            const customTransformers = typeof transformers === 'function'
                ? transformers(builderProgram.getProgram())
                : transformers;
            // Set the file contents into cache manually.
            const updateMemoryCache = (contents, fileName) => {
                const previousContents = fileContents.get(fileName);
                const contentsChanged = previousContents !== contents;
                if (contentsChanged) {
                    fileContents.set(fileName, contents);
                }
                // Add to `rootFiles` when discovered by compiler for the first time.
                let addedToRootFileNames = false;
                if (!rootFileNames.has(fileName) &&
                    !isFileKnownToBeInternal(fileName)) {
                    markBucketOfFilenameInternal(fileName);
                    rootFileNames.add(fileName);
                    addedToRootFileNames = true;
                }
                // Update program when file changes.
                if (addedToRootFileNames || contentsChanged) {
                    builderProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(Array.from(rootFileNames), config.options, host, builderProgram, config.errors, config.projectReferences);
                }
            };
            getOutput = (code, fileName) => {
                let outText = '';
                let outMap = '';
                updateMemoryCache(code, fileName);
                const sourceFile = builderProgram.getSourceFile(fileName);
                if (!sourceFile)
                    throw new TypeError(`Unable to read file: ${fileName}`);
                const program = builderProgram.getProgram();
                const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
                const diagnosticList = filterDiagnostics(diagnostics, diagnosticFilters);
                if (diagnosticList.length)
                    reportTSError(diagnosticList);
                const result = builderProgram.emit(sourceFile, (path, file, writeByteOrderMark) => {
                    if (path.endsWith('.map')) {
                        outMap = file;
                    }
                    else {
                        outText = file;
                    }
                    if (options.emit)
                        sys.writeFile(path, file, writeByteOrderMark);
                }, undefined, undefined, customTransformers);
                if (result.emitSkipped) {
                    return [undefined, undefined, true];
                }
                // Throw an error when requiring files that cannot be compiled.
                if (outText === '') {
                    if (program.isSourceFileFromExternalLibrary(sourceFile)) {
                        throw new TypeError(`Unable to compile file from external library: ${(0, path_1.relative)(cwd, fileName)}`);
                    }
                    throw new TypeError(`Unable to require file: ${(0, path_1.relative)(cwd, fileName)}\n` +
                        'This is usually the result of a faulty configuration or import. ' +
                        'Make sure there is a `.js`, `.json` or other executable extension with ' +
                        'loader attached before `ts-node` available.');
                }
                return [outText, outMap, false];
            };
            getTypeInfo = (code, fileName, position) => {
                const normalizedFileName = (0, util_1.normalizeSlashes)(fileName);
                updateMemoryCache(code, normalizedFileName);
                const sourceFile = builderProgram.getSourceFile(normalizedFileName);
                if (!sourceFile)
                    throw new TypeError(`Unable to read file: ${fileName}`);
                const node = getTokenAtPosition(ts, sourceFile, position);
                const checker = builderProgram.getProgram().getTypeChecker();
                const symbol = checker.getSymbolAtLocation(node);
                if (!symbol)
                    return { name: '', comment: '' };
                const type = checker.getTypeOfSymbolAtLocation(symbol, node);
                const signatures = [
                    ...type.getConstructSignatures(),
                    ...type.getCallSignatures(),
                ];
                return {
                    name: signatures.length
                        ? signatures.map((x) => checker.signatureToString(x)).join('\n')
                        : checker.typeToString(type),
                    comment: ts.displayPartsToString(symbol ? symbol.getDocumentationComment(checker) : []),
                };
            };
            // Write `.tsbuildinfo` when `--build` is enabled.
            if (options.emit && config.options.incremental) {
                process.on('exit', () => {
                    // Emits `.tsbuildinfo` to filesystem.
                    builderProgram.getProgram().emitBuildInfo();
                });
            }
        }
    }
    else {
        getTypeInfo = () => {
            throw new TypeError('Type information is unavailable in "--transpile-only"');
        };
    }
    function createTranspileOnlyGetOutputFunction(overrideModuleType, nodeModuleEmitKind) {
        const compilerOptions = { ...config.options };
        if (overrideModuleType !== undefined)
            compilerOptions.module = overrideModuleType;
        let customTranspiler = createTranspiler === null || createTranspiler === void 0 ? void 0 : createTranspiler(compilerOptions, nodeModuleEmitKind);
        let tsTranspileModule = (0, util_1.versionGteLt)(ts.version, '4.7.0')
            ? (0, ts_transpile_module_1.createTsTranspileModule)(ts, {
                compilerOptions,
                reportDiagnostics: true,
                transformers: transformers,
            })
            : undefined;
        return (code, fileName) => {
            let result;
            if (customTranspiler) {
                result = customTranspiler.transpile(code, {
                    fileName,
                });
            }
            else if (tsTranspileModule) {
                result = tsTranspileModule(code, {
                    fileName,
                }, nodeModuleEmitKind === 'nodeesm' ? 'module' : 'commonjs');
            }
            else {
                result = ts.transpileModule(code, {
                    fileName,
                    compilerOptions,
                    reportDiagnostics: true,
                    transformers: transformers,
                });
            }
            const diagnosticList = filterDiagnostics(result.diagnostics || [], diagnosticFilters);
            if (diagnosticList.length)
                reportTSError(diagnosticList);
            return [result.outputText, result.sourceMapText, false];
        };
    }
    // When true, these mean that a `moduleType` override will cause a different emit
    // than the TypeScript compiler, so we *must* overwrite the emit.
    const shouldOverwriteEmitWhenForcingCommonJS = config.options.module !== ts.ModuleKind.CommonJS;
    // [MUST_UPDATE_FOR_NEW_MODULEKIND]
    const shouldOverwriteEmitWhenForcingEsm = !(config.options.module === ts.ModuleKind.ES2015 ||
        (ts.ModuleKind.ES2020 && config.options.module === ts.ModuleKind.ES2020) ||
        (ts.ModuleKind.ES2022 && config.options.module === ts.ModuleKind.ES2022) ||
        config.options.module === ts.ModuleKind.ESNext);
    /**
     * node16 or nodenext
     * [MUST_UPDATE_FOR_NEW_MODULEKIND]
     */
    const isNodeModuleType = (ts.ModuleKind.Node16 && config.options.module === ts.ModuleKind.Node16) ||
        (ts.ModuleKind.NodeNext &&
            config.options.module === ts.ModuleKind.NodeNext);
    const getOutputForceCommonJS = createTranspileOnlyGetOutputFunction(ts.ModuleKind.CommonJS);
    const getOutputForceNodeCommonJS = createTranspileOnlyGetOutputFunction(ts.ModuleKind.NodeNext, 'nodecjs');
    const getOutputForceNodeESM = createTranspileOnlyGetOutputFunction(ts.ModuleKind.NodeNext, 'nodeesm');
    // [MUST_UPDATE_FOR_NEW_MODULEKIND]
    const getOutputForceESM = createTranspileOnlyGetOutputFunction(ts.ModuleKind.ES2022 || ts.ModuleKind.ES2020 || ts.ModuleKind.ES2015);
    const getOutputTranspileOnly = createTranspileOnlyGetOutputFunction();
    // Create a simple TypeScript compiler proxy.
    function compile(code, fileName, lineOffset = 0) {
        const normalizedFileName = (0, util_1.normalizeSlashes)(fileName);
        const classification = moduleTypeClassifier.classifyModuleByModuleTypeOverrides(normalizedFileName);
        let value = '';
        let sourceMap = '';
        let emitSkipped = true;
        if (getOutput) {
            // Must always call normal getOutput to throw typechecking errors
            [value, sourceMap, emitSkipped] = getOutput(code, normalizedFileName);
        }
        // If module classification contradicts the above, call the relevant transpiler
        if (classification.moduleType === 'cjs' &&
            (shouldOverwriteEmitWhenForcingCommonJS || emitSkipped)) {
            [value, sourceMap] = getOutputForceCommonJS(code, normalizedFileName);
        }
        else if (classification.moduleType === 'esm' &&
            (shouldOverwriteEmitWhenForcingEsm || emitSkipped)) {
            [value, sourceMap] = getOutputForceESM(code, normalizedFileName);
        }
        else if (emitSkipped) {
            // Happens when ts compiler skips emit or in transpileOnly mode
            const classification = (0, node_module_type_classifier_1.classifyModule)(fileName, isNodeModuleType);
            [value, sourceMap] =
                classification === 'nodecjs'
                    ? getOutputForceNodeCommonJS(code, normalizedFileName)
                    : classification === 'nodeesm'
                        ? getOutputForceNodeESM(code, normalizedFileName)
                        : classification === 'cjs'
                            ? getOutputForceCommonJS(code, normalizedFileName)
                            : classification === 'esm'
                                ? getOutputForceESM(code, normalizedFileName)
                                : getOutputTranspileOnly(code, normalizedFileName);
        }
        const output = updateOutput(value, normalizedFileName, sourceMap, getEmitExtension);
        outputCache.set(normalizedFileName, { content: output });
        return output;
    }
    let active = true;
    const enabled = (enabled) => enabled === undefined ? active : (active = !!enabled);
    const ignored = (fileName) => {
        if (!active)
            return true;
        const ext = (0, path_1.extname)(fileName);
        if (extensions.compiled.includes(ext)) {
            return !isScoped(fileName) || shouldIgnore(fileName);
        }
        return true;
    };
    function addDiagnosticFilter(filter) {
        diagnosticFilters.push({
            ...filter,
            filenamesAbsolute: filter.filenamesAbsolute.map((f) => (0, util_1.normalizeSlashes)(f)),
        });
    }
    const getNodeEsmResolver = (0, util_1.once)(() => require('../dist-raw/node-internal-modules-esm-resolve').createResolve({
        extensions,
        preferTsExts: options.preferTsExts,
        tsNodeExperimentalSpecifierResolution: options.experimentalSpecifierResolution,
    }));
    const getNodeEsmGetFormat = (0, util_1.once)(() => require('../dist-raw/node-internal-modules-esm-get_format').createGetFormat(options.experimentalSpecifierResolution, getNodeEsmResolver()));
    const getNodeCjsLoader = (0, util_1.once)(() => require('../dist-raw/node-internal-modules-cjs-loader').createCjsLoader({
        extensions,
        preferTsExts: options.preferTsExts,
        nodeEsmResolver: getNodeEsmResolver(),
    }));
    return {
        [TS_NODE_SERVICE_BRAND]: true,
        ts,
        compilerPath: compiler,
        config,
        compile,
        getTypeInfo,
        ignored,
        enabled,
        options,
        configFilePath,
        moduleTypeClassifier,
        shouldReplAwait,
        addDiagnosticFilter,
        installSourceMapSupport,
        enableExperimentalEsmLoaderInterop,
        transpileOnly,
        projectLocalResolveHelper,
        getNodeEsmResolver,
        getNodeEsmGetFormat,
        getNodeCjsLoader,
        extensions,
    };
}
exports.createFromPreloadedConfig = createFromPreloadedConfig;
/**
 * Check if the filename should be ignored.
 */
function createIgnore(ignoreBaseDir, ignore) {
    return (fileName) => {
        const relname = (0, path_1.relative)(ignoreBaseDir, fileName);
        const path = (0, util_1.normalizeSlashes)(relname);
        return ignore.some((x) => x.test(path));
    };
}
/**
 * Register the extensions to support when importing files.
 */
function registerExtensions(preferTsExts, extensions, service, originalJsHandler) {
    const exts = new Set(extensions);
    // Can't add these extensions cuz would allow omitting file extension; node requires ext for .cjs and .mjs
    // Unless they're already registered by something else (nyc does this):
    // then we *must* hook them or else our transformer will not be called.
    for (const cannotAdd of ['.mts', '.cts', '.mjs', '.cjs']) {
        if (exts.has(cannotAdd) && !(0, util_1.hasOwnProperty)(require.extensions, cannotAdd)) {
            // Unrecognized file exts can be transformed via the `.js` handler.
            exts.add('.js');
            exts.delete(cannotAdd);
        }
    }
    // Register new extensions.
    for (const ext of exts) {
        registerExtension(ext, service, originalJsHandler);
    }
    if (preferTsExts) {
        const preferredExtensions = new Set([
            ...exts,
            ...Object.keys(require.extensions),
        ]);
        // Re-sort iteration order of Object.keys()
        for (const ext of preferredExtensions) {
            const old = Object.getOwnPropertyDescriptor(require.extensions, ext);
            delete require.extensions[ext];
            Object.defineProperty(require.extensions, ext, old);
        }
    }
}
/**
 * Register the extension for node.
 */
function registerExtension(ext, service, originalHandler) {
    const old = require.extensions[ext] || originalHandler;
    require.extensions[ext] = function (m, filename) {
        if (service.ignored(filename))
            return old(m, filename);
        assertScriptCanLoadAsCJS(service, m, filename);
        const _compile = m._compile;
        m._compile = function (code, fileName) {
            (0, exports.debug)('module._compile', fileName);
            const result = service.compile(code, fileName);
            return _compile.call(this, result, fileName);
        };
        return old(m, filename);
    };
}
/**
 * Update the output remapping the source map.
 */
function updateOutput(outputText, fileName, sourceMap, getEmitExtension) {
    const base64Map = Buffer.from(updateSourceMap(sourceMap, fileName), 'utf8').toString('base64');
    const sourceMapContent = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
    // Expected form: `//# sourceMappingURL=foo bar.js.map` or `//# sourceMappingURL=foo%20bar.js.map` for input file "foo bar.tsx"
    // Percent-encoding behavior added in TS 4.1.1: https://github.com/microsoft/TypeScript/issues/40951
    const prefix = '//# sourceMappingURL=';
    const prefixLength = prefix.length;
    const baseName = /*foo.tsx*/ (0, path_1.basename)(fileName);
    const extName = /*.tsx*/ (0, path_1.extname)(fileName);
    const extension = /*.js*/ getEmitExtension(fileName);
    const sourcemapFilename = baseName.slice(0, -extName.length) + extension + '.map';
    const sourceMapLengthWithoutPercentEncoding = prefixLength + sourcemapFilename.length;
    /*
     * Only rewrite if existing directive exists at the location we expect, to support:
     *   a) compilers that do not append a sourcemap directive
     *   b) situations where we did the math wrong
     *     Not ideal, but appending our sourcemap *after* a pre-existing sourcemap still overrides, so the end-user is happy.
     */
    if (outputText.substr(-sourceMapLengthWithoutPercentEncoding, prefixLength) ===
        prefix) {
        return (outputText.slice(0, -sourceMapLengthWithoutPercentEncoding) +
            sourceMapContent);
    }
    // If anyone asks why we're not using URL, the URL equivalent is: `u = new URL('http://d'); u.pathname = "/" + sourcemapFilename; return u.pathname.slice(1);
    const sourceMapLengthWithPercentEncoding = prefixLength + encodeURI(sourcemapFilename).length;
    if (outputText.substr(-sourceMapLengthWithPercentEncoding, prefixLength) ===
        prefix) {
        return (outputText.slice(0, -sourceMapLengthWithPercentEncoding) +
            sourceMapContent);
    }
    return `${outputText}\n${sourceMapContent}`;
}
/**
 * Update the source map contents for improved output.
 */
function updateSourceMap(sourceMapText, fileName) {
    const sourceMap = JSON.parse(sourceMapText);
    sourceMap.file = fileName;
    sourceMap.sources = [fileName];
    delete sourceMap.sourceRoot;
    return JSON.stringify(sourceMap);
}
/**
 * Filter diagnostics.
 */
function filterDiagnostics(diagnostics, filters) {
    return diagnostics.filter((d) => filters.every((f) => {
        var _a;
        return (!f.appliesToAllFiles &&
            f.filenamesAbsolute.indexOf((_a = d.file) === null || _a === void 0 ? void 0 : _a.fileName) === -1) ||
            f.diagnosticsIgnored.indexOf(d.code) === -1;
    }));
}
/**
 * Get token at file position.
 *
 * Reference: https://github.com/microsoft/TypeScript/blob/fcd9334f57d85b73dd66ad2d21c02e84822f4841/src/services/utilities.ts#L705-L731
 */
function getTokenAtPosition(ts, sourceFile, position) {
    let current = sourceFile;
    outer: while (true) {
        for (const child of current.getChildren(sourceFile)) {
            const start = child.getFullStart();
            if (start > position)
                break;
            const end = child.getEnd();
            if (position <= end) {
                current = child;
                continue outer;
            }
        }
        return current;
    }
}
/**
 * Create an implementation of node's ESM loader hooks.
 *
 * This may be useful if you
 * want to wrap or compose the loader hooks to add additional functionality or
 * combine with another loader.
 *
 * Node changed the hooks API, so there are two possible APIs.  This function
 * detects your node version and returns the appropriate API.
 *
 * @category ESM Loader
 */
const createEsmHooks = (tsNodeService) => require('./esm').createEsmHooks(tsNodeService);
exports.createEsmHooks = createEsmHooks;
//# sourceMappingURL=index.js.map