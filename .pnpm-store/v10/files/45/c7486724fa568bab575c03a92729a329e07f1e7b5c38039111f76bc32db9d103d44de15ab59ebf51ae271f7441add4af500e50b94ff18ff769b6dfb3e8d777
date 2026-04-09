"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTsConfigExtendsPath = exports.normalizeTsConfigExtendsOption = exports.loadConfig = exports.prepareConfig = void 0;
const fs_1 = require("fs");
const get_tsconfig_1 = require("get-tsconfig");
const mylas_1 = require("mylas");
const path_1 = require("path");
const utils_1 = require("../utils");
const replacers_1 = require("./replacers");
const normalizePath = require("normalize-path");
function prepareConfig(options) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const output = (_a = options.output) !== null && _a !== void 0 ? _a : new utils_1.Output(options.verbose, options.debug);
        const configFile = !options.configFile
            ? (0, path_1.resolve)(process.cwd(), 'tsconfig.json')
            : !(0, path_1.isAbsolute)(options.configFile)
                ? (0, path_1.resolve)(process.cwd(), options.configFile)
                : options.configFile;
        output.assert((0, fs_1.existsSync)(configFile), `Invalid file path => ${configFile}`);
        const { baseUrl = '', outDir, declarationDir, paths, replacers, resolveFullPaths, verbose, fileExtensions } = (0, exports.loadConfig)(configFile, output);
        if ((_b = options === null || options === void 0 ? void 0 : options.fileExtensions) === null || _b === void 0 ? void 0 : _b.inputGlob) {
            fileExtensions.inputGlob = options.fileExtensions.inputGlob;
        }
        if ((_c = options === null || options === void 0 ? void 0 : options.fileExtensions) === null || _c === void 0 ? void 0 : _c.outputCheck) {
            fileExtensions.outputCheck = options.fileExtensions.outputCheck;
        }
        output.verbose = verbose;
        if (options.resolveFullPaths || resolveFullPaths) {
            output.debug('resolveFullPaths is active');
            options.resolveFullPaths = true;
        }
        const _outDir = (_d = options.outDir) !== null && _d !== void 0 ? _d : outDir;
        if (declarationDir && _outDir !== declarationDir) {
            (_e = options.declarationDir) !== null && _e !== void 0 ? _e : (options.declarationDir = declarationDir);
        }
        output.assert(_outDir, 'compilerOptions.outDir is not set');
        const configDir = normalizePath((0, path_1.dirname)(configFile));
        const projectConfig = {
            configFile: configFile,
            baseUrl: baseUrl,
            outDir: _outDir,
            configDir: configDir,
            outPath: _outDir,
            confDirParentFolderName: (0, path_1.basename)(configDir),
            hasExtraModule: false,
            configDirInOutPath: null,
            relConfDirPathInOutPath: null,
            pathCache: new utils_1.PathCache(!options.watch, fileExtensions === null || fileExtensions === void 0 ? void 0 : fileExtensions.outputCheck),
            inputGlob: (fileExtensions === null || fileExtensions === void 0 ? void 0 : fileExtensions.inputGlob) || '{mjs,cjs,js,jsx,d.{mts,cts,ts,tsx}}'
        };
        output.debug('loaded project config:', projectConfig);
        const config = Object.assign(Object.assign({}, projectConfig), { output: output, aliasTrie: (_f = options.aliasTrie) !== null && _f !== void 0 ? _f : utils_1.TrieNode.buildAliasTrie(projectConfig, paths), replacers: [] });
        output.debug('loaded full config:', config);
        yield (0, replacers_1.importReplacers)(config, replacers, options.replacers);
        return config;
    });
}
exports.prepareConfig = prepareConfig;
function replaceConfigDirPlaceholder(path, configDir) {
    return path.replace(/\$\{configDir\}/g, configDir);
}
const loadConfig = (file, output, baseConfigDir = null) => {
    var _a, _b, _c, _d, _e;
    if (!(0, fs_1.existsSync)(file)) {
        output.error(`File ${file} not found`, true);
    }
    output.debug('Loading config file:', file);
    const tsConfig = (0, get_tsconfig_1.parseTsconfig)(file);
    const baseTsConfig = mylas_1.Json.loadS(file, true);
    const { compilerOptions: { baseUrl, outDir, declarationDir, paths } = {
        baseUrl: undefined,
        outDir: undefined,
        declarationDir: undefined,
        paths: undefined
    }, 'tsc-alias': tscAliasConfig } = tsConfig;
    const configDir = (0, path_1.dirname)(file);
    output.debug('configDir', configDir);
    const config = {};
    if (baseUrl) {
        if (baseConfigDir !== null) {
            config.baseUrl = replaceConfigDirPlaceholder(baseUrl, baseConfigDir);
        }
        else {
            config.baseUrl = baseUrl;
        }
    }
    if (outDir || ((_a = baseTsConfig === null || baseTsConfig === void 0 ? void 0 : baseTsConfig.compilerOptions) === null || _a === void 0 ? void 0 : _a.outDir)) {
        let replacedOutDir = outDir || ((_b = baseTsConfig === null || baseTsConfig === void 0 ? void 0 : baseTsConfig.compilerOptions) === null || _b === void 0 ? void 0 : _b.outDir);
        if (baseConfigDir !== null) {
            replacedOutDir = replaceConfigDirPlaceholder(outDir, baseConfigDir);
        }
        config.outDir = (0, path_1.isAbsolute)(replacedOutDir)
            ? replacedOutDir
            : (0, path_1.join)(configDir, replacedOutDir);
    }
    if (paths) {
        if (baseConfigDir !== null) {
            for (const key in paths) {
                paths[key] = paths[key].map((path) => replaceConfigDirPlaceholder(path, baseConfigDir));
            }
        }
        config.paths = paths;
    }
    if (declarationDir) {
        let replacedDeclarationDir = declarationDir;
        if (baseConfigDir !== null) {
            replacedDeclarationDir = replaceConfigDirPlaceholder(declarationDir, baseConfigDir);
        }
        config.declarationDir = (0, path_1.isAbsolute)(replacedDeclarationDir)
            ? replacedDeclarationDir
            : (0, path_1.join)(configDir, replacedDeclarationDir);
    }
    if (tscAliasConfig === null || tscAliasConfig === void 0 ? void 0 : tscAliasConfig.replacers) {
        config.replacers = tscAliasConfig.replacers;
    }
    if (tscAliasConfig === null || tscAliasConfig === void 0 ? void 0 : tscAliasConfig.resolveFullPaths) {
        config.resolveFullPaths = tscAliasConfig.resolveFullPaths;
    }
    if (tscAliasConfig === null || tscAliasConfig === void 0 ? void 0 : tscAliasConfig.verbose) {
        config.verbose = tscAliasConfig.verbose;
    }
    config.fileExtensions = (_c = tscAliasConfig === null || tscAliasConfig === void 0 ? void 0 : tscAliasConfig.fileExtensions) !== null && _c !== void 0 ? _c : {};
    const replacerFile = (_e = (_d = config.replacers) === null || _d === void 0 ? void 0 : _d.pathReplacer) === null || _e === void 0 ? void 0 : _e.file;
    if (replacerFile) {
        config.replacers.pathReplacer.file = (0, path_1.join)(configDir, replacerFile);
    }
    output.debug('loaded config (from file):', config);
    return config;
};
exports.loadConfig = loadConfig;
function normalizeTsConfigExtendsOption(ext, file) {
    if (!ext)
        return [];
    const configDir = (0, path_1.dirname)(file);
    const normExts = (Array.isArray(ext) ? ext : [ext]).map((e) => e.startsWith('.')
        ? (0, path_1.join)(configDir, e.endsWith('.json') ? e : `${e}.json`)
        : resolveTsConfigExtendsPath(e, file));
    return normExts;
}
exports.normalizeTsConfigExtendsOption = normalizeTsConfigExtendsOption;
function resolveTsConfigExtendsPath(ext, file) {
    const tsConfigDir = (0, path_1.dirname)(file);
    const node_modules = mylas_1.Dir.nodeModules({ cwd: tsConfigDir });
    const targetPaths = node_modules.map((v) => (0, path_1.join)(tsConfigDir, v, ext));
    for (const targetPath of targetPaths) {
        if (ext.endsWith('.json')) {
            if ((0, fs_1.existsSync)(targetPath)) {
                return targetPath;
            }
            else {
                continue;
            }
        }
        let isDirectory = false;
        try {
            const stats = (0, fs_1.lstatSync)(targetPath);
            isDirectory = stats.isDirectory() || stats.isSymbolicLink();
        }
        catch (err) { }
        if (isDirectory) {
            return (0, path_1.join)(targetPath, 'tsconfig.json');
        }
        else {
            if ((0, fs_1.existsSync)(`${targetPath}.json`)) {
                return `${targetPath}.json`;
            }
        }
    }
}
exports.resolveTsConfigExtendsPath = resolveTsConfigExtendsPath;
//# sourceMappingURL=config.js.map