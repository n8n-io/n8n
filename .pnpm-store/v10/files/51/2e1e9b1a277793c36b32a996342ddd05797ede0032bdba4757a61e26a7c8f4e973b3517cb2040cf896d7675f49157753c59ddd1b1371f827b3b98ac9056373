"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTsConfigDefaults = exports.ComputeAsCommonRootOfFiles = exports.loadCompiler = exports.resolveAndLoadCompiler = exports.readConfig = exports.findAndReadConfig = void 0;
const path_1 = require("path");
const index_1 = require("./index");
const ts_internals_1 = require("./ts-internals");
const tsconfigs_1 = require("./tsconfigs");
const util_1 = require("./util");
/**
 * TypeScript compiler option values required by `ts-node` which cannot be overridden.
 */
const TS_NODE_COMPILER_OPTIONS = {
    sourceMap: true,
    inlineSourceMap: false,
    inlineSources: true,
    declaration: false,
    noEmit: false,
    outDir: '.ts-node',
};
/*
 * Do post-processing on config options to support `ts-node`.
 */
function fixConfig(ts, config) {
    // Delete options that *should not* be passed through.
    delete config.options.out;
    delete config.options.outFile;
    delete config.options.composite;
    delete config.options.declarationDir;
    delete config.options.declarationMap;
    delete config.options.emitDeclarationOnly;
    // Target ES5 output by default (instead of ES3).
    if (config.options.target === undefined) {
        config.options.target = ts.ScriptTarget.ES5;
    }
    // Target CommonJS modules by default (instead of magically switching to ES6 when the target is ES6).
    if (config.options.module === undefined) {
        config.options.module = ts.ModuleKind.CommonJS;
    }
    return config;
}
/** @internal */
function findAndReadConfig(rawOptions) {
    var _a, _b, _c, _d, _e;
    const cwd = (0, path_1.resolve)((_c = (_b = (_a = rawOptions.cwd) !== null && _a !== void 0 ? _a : rawOptions.dir) !== null && _b !== void 0 ? _b : index_1.DEFAULTS.cwd) !== null && _c !== void 0 ? _c : process.cwd());
    const compilerName = (_d = rawOptions.compiler) !== null && _d !== void 0 ? _d : index_1.DEFAULTS.compiler;
    // Compute minimum options to read the config file.
    let projectLocalResolveDir = (0, util_1.getBasePathForProjectLocalDependencyResolution)(undefined, rawOptions.projectSearchDir, rawOptions.project, cwd);
    let { compiler, ts } = resolveAndLoadCompiler(compilerName, projectLocalResolveDir);
    // Read config file and merge new options between env and CLI options.
    const { configFilePath, config, tsNodeOptionsFromTsconfig, optionBasePaths } = readConfig(cwd, ts, rawOptions);
    const options = (0, util_1.assign)({}, index_1.DEFAULTS, tsNodeOptionsFromTsconfig || {}, { optionBasePaths }, rawOptions);
    options.require = [
        ...(tsNodeOptionsFromTsconfig.require || []),
        ...(rawOptions.require || []),
    ];
    // Re-resolve the compiler in case it has changed.
    // Compiler is loaded relative to tsconfig.json, so tsconfig discovery may cause us to load a
    // different compiler than we did above, even if the name has not changed.
    if (configFilePath) {
        projectLocalResolveDir = (0, util_1.getBasePathForProjectLocalDependencyResolution)(configFilePath, rawOptions.projectSearchDir, rawOptions.project, cwd);
        ({ compiler } = resolveCompiler(options.compiler, (_e = optionBasePaths.compiler) !== null && _e !== void 0 ? _e : projectLocalResolveDir));
    }
    return {
        options,
        config,
        projectLocalResolveDir,
        optionBasePaths,
        configFilePath,
        cwd,
        compiler,
    };
}
exports.findAndReadConfig = findAndReadConfig;
/**
 * Load TypeScript configuration. Returns the parsed TypeScript config and
 * any `ts-node` options specified in the config file.
 *
 * Even when a tsconfig.json is not loaded, this function still handles merging
 * compilerOptions from various sources: API, environment variables, etc.
 *
 * @internal
 */
function readConfig(cwd, ts, rawApiOptions) {
    var _a, _b, _c;
    // Ordered [a, b, c] where config a extends b extends c
    const configChain = [];
    let config = { compilerOptions: {} };
    let basePath = cwd;
    let configFilePath = undefined;
    const projectSearchDir = (0, path_1.resolve)(cwd, (_a = rawApiOptions.projectSearchDir) !== null && _a !== void 0 ? _a : cwd);
    const { fileExists = ts.sys.fileExists, readFile = ts.sys.readFile, skipProject = index_1.DEFAULTS.skipProject, project = index_1.DEFAULTS.project, tsTrace = index_1.DEFAULTS.tsTrace, } = rawApiOptions;
    // Read project configuration when available.
    if (!skipProject) {
        if (project) {
            const resolved = (0, path_1.resolve)(cwd, project);
            const nested = (0, path_1.join)(resolved, 'tsconfig.json');
            configFilePath = fileExists(nested) ? nested : resolved;
        }
        else {
            configFilePath = ts.findConfigFile(projectSearchDir, fileExists);
        }
        if (configFilePath) {
            let pathToNextConfigInChain = configFilePath;
            const tsInternals = (0, ts_internals_1.createTsInternals)(ts);
            const errors = [];
            // Follow chain of "extends"
            while (true) {
                const result = ts.readConfigFile(pathToNextConfigInChain, readFile);
                // Return diagnostics.
                if (result.error) {
                    return {
                        configFilePath,
                        config: { errors: [result.error], fileNames: [], options: {} },
                        tsNodeOptionsFromTsconfig: {},
                        optionBasePaths: {},
                    };
                }
                const c = result.config;
                const bp = (0, path_1.dirname)(pathToNextConfigInChain);
                configChain.push({
                    config: c,
                    basePath: bp,
                    configPath: pathToNextConfigInChain,
                });
                if (c.extends == null)
                    break;
                const resolvedExtendedConfigPath = tsInternals.getExtendsConfigPath(c.extends, {
                    fileExists,
                    readDirectory: ts.sys.readDirectory,
                    readFile,
                    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
                    trace: tsTrace,
                }, bp, errors, ts.createCompilerDiagnostic);
                if (errors.length) {
                    return {
                        configFilePath,
                        config: { errors, fileNames: [], options: {} },
                        tsNodeOptionsFromTsconfig: {},
                        optionBasePaths: {},
                    };
                }
                if (resolvedExtendedConfigPath == null)
                    break;
                pathToNextConfigInChain = resolvedExtendedConfigPath;
            }
            ({ config, basePath } = configChain[0]);
        }
    }
    // Merge and fix ts-node options that come from tsconfig.json(s)
    const tsNodeOptionsFromTsconfig = {};
    const optionBasePaths = {};
    for (let i = configChain.length - 1; i >= 0; i--) {
        const { config, basePath, configPath } = configChain[i];
        const options = filterRecognizedTsConfigTsNodeOptions(config['ts-node']).recognized;
        // Some options are relative to the config file, so must be converted to absolute paths here
        if (options.require) {
            // Modules are found relative to the tsconfig file, not the `dir` option
            const tsconfigRelativeResolver = (0, util_1.createProjectLocalResolveHelper)((0, path_1.dirname)(configPath));
            options.require = options.require.map((path) => tsconfigRelativeResolver(path, false));
        }
        if (options.scopeDir) {
            options.scopeDir = (0, path_1.resolve)(basePath, options.scopeDir);
        }
        // Downstream code uses the basePath; we do not do that here.
        if (options.moduleTypes) {
            optionBasePaths.moduleTypes = basePath;
        }
        if (options.transpiler != null) {
            optionBasePaths.transpiler = basePath;
        }
        if (options.compiler != null) {
            optionBasePaths.compiler = basePath;
        }
        if (options.swc != null) {
            optionBasePaths.swc = basePath;
        }
        (0, util_1.assign)(tsNodeOptionsFromTsconfig, options);
    }
    // Remove resolution of "files".
    const files = (_c = (_b = rawApiOptions.files) !== null && _b !== void 0 ? _b : tsNodeOptionsFromTsconfig.files) !== null && _c !== void 0 ? _c : index_1.DEFAULTS.files;
    // Only if a config file is *not* loaded, load an implicit configuration from @tsconfig/bases
    const skipDefaultCompilerOptions = configFilePath != null;
    const defaultCompilerOptionsForNodeVersion = skipDefaultCompilerOptions
        ? undefined
        : {
            ...(0, tsconfigs_1.getDefaultTsconfigJsonForNodeVersion)(ts).compilerOptions,
            types: ['node'],
        };
    // Merge compilerOptions from all sources
    config.compilerOptions = Object.assign({}, 
    // automatically-applied options from @tsconfig/bases
    defaultCompilerOptionsForNodeVersion, 
    // tsconfig.json "compilerOptions"
    config.compilerOptions, 
    // from env var
    index_1.DEFAULTS.compilerOptions, 
    // tsconfig.json "ts-node": "compilerOptions"
    tsNodeOptionsFromTsconfig.compilerOptions, 
    // passed programmatically
    rawApiOptions.compilerOptions, 
    // overrides required by ts-node, cannot be changed
    TS_NODE_COMPILER_OPTIONS);
    const fixedConfig = fixConfig(ts, ts.parseJsonConfigFileContent(config, {
        fileExists,
        readFile,
        // Only used for globbing "files", "include", "exclude"
        // When `files` option disabled, we want to avoid the fs calls
        readDirectory: files ? ts.sys.readDirectory : () => [],
        useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    }, basePath, undefined, configFilePath));
    return {
        configFilePath,
        config: fixedConfig,
        tsNodeOptionsFromTsconfig,
        optionBasePaths,
    };
}
exports.readConfig = readConfig;
/**
 * Load the typescript compiler. It is required to load the tsconfig but might
 * be changed by the tsconfig, so we have to do this twice.
 * @internal
 */
function resolveAndLoadCompiler(name, relativeToPath) {
    const { compiler } = resolveCompiler(name, relativeToPath);
    const ts = loadCompiler(compiler);
    return { compiler, ts };
}
exports.resolveAndLoadCompiler = resolveAndLoadCompiler;
function resolveCompiler(name, relativeToPath) {
    const projectLocalResolveHelper = (0, util_1.createProjectLocalResolveHelper)(relativeToPath);
    const compiler = projectLocalResolveHelper(name || 'typescript', true);
    return { compiler };
}
/** @internal */
function loadCompiler(compiler) {
    return (0, util_1.attemptRequireWithV8CompileCache)(require, compiler);
}
exports.loadCompiler = loadCompiler;
/**
 * Given the raw "ts-node" sub-object from a tsconfig, return an object with only the properties
 * recognized by "ts-node"
 */
function filterRecognizedTsConfigTsNodeOptions(jsonObject) {
    if (jsonObject == null)
        return { recognized: {}, unrecognized: {} };
    const { compiler, compilerHost, compilerOptions, emit, files, ignore, ignoreDiagnostics, logError, preferTsExts, pretty, require, skipIgnore, transpileOnly, typeCheck, transpiler, scope, scopeDir, moduleTypes, experimentalReplAwait, swc, experimentalResolver, esm, experimentalSpecifierResolution, experimentalTsImportSpecifiers, ...unrecognized } = jsonObject;
    const filteredTsConfigOptions = {
        compiler,
        compilerHost,
        compilerOptions,
        emit,
        experimentalReplAwait,
        files,
        ignore,
        ignoreDiagnostics,
        logError,
        preferTsExts,
        pretty,
        require,
        skipIgnore,
        transpileOnly,
        typeCheck,
        transpiler,
        scope,
        scopeDir,
        moduleTypes,
        swc,
        experimentalResolver,
        esm,
        experimentalSpecifierResolution,
        experimentalTsImportSpecifiers,
    };
    // Use the typechecker to make sure this implementation has the correct set of properties
    const catchExtraneousProps = null;
    const catchMissingProps = null;
    return { recognized: filteredTsConfigOptions, unrecognized };
}
/** @internal */
exports.ComputeAsCommonRootOfFiles = Symbol();
/**
 * Some TS compiler options have defaults which are not provided by TS's config parsing functions.
 * This function centralizes the logic for computing those defaults.
 * @internal
 */
function getTsConfigDefaults(config, basePath, _files, _include, _exclude) {
    const { composite = false } = config.options;
    let rootDir = config.options.rootDir;
    if (rootDir == null) {
        if (composite)
            rootDir = basePath;
        // Return this symbol to avoid computing from `files`, which would require fs calls
        else
            rootDir = exports.ComputeAsCommonRootOfFiles;
    }
    const { outDir = rootDir } = config.options;
    // Docs are wrong: https://www.typescriptlang.org/tsconfig#include
    // Docs say **, but it's actually **/*; compiler throws error for **
    const include = _files ? [] : ['**/*'];
    const files = _files !== null && _files !== void 0 ? _files : [];
    // Docs are misleading: https://www.typescriptlang.org/tsconfig#exclude
    // Docs say it excludes node_modules, bower_components, jspm_packages, but actually those are excluded via behavior of "include"
    const exclude = _exclude !== null && _exclude !== void 0 ? _exclude : [outDir]; // TODO technically, outDir is absolute path, but exclude should be relative glob pattern?
    // TODO compute baseUrl
    return { rootDir, outDir, include, files, exclude, composite };
}
exports.getTsConfigDefaults = getTsConfigDefaults;
//# sourceMappingURL=configuration.js.map