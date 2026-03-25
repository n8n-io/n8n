"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPathModule = exports.loadWithDataFromManifest = exports.loadWithData = exports.load = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const ts_path_1 = require("./config/ts-path");
const module_load_1 = require("./errors/errors/module-load");
const fs_1 = require("./util/fs");
const getPackageType = require('get-package-type');
/**
 * Defines file extension resolution when source files do not have an extension.
 */
const SUPPORTED_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs', '.mts', '.cts', '.tsx', '.jsx'];
const isPlugin = (config) => config.type !== undefined;
function handleError(error, isESM, path) {
    if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new module_load_1.ModuleLoadError(`${isESM ? 'import()' : 'require'} failed to load ${path}: ${error.message}`);
    }
    throw error;
}
/**
 * Loads and returns a module.
 *
 * Uses `getPackageType` to determine if `type` is set to 'module. If so loads '.js' files as ESM otherwise uses
 * a bare require to load as CJS. Also loads '.mjs' files as ESM.
 *
 * Uses dynamic import to load ESM source or require for CommonJS.
 *
 * A unique error, ModuleLoadError, combines both CJS and ESM loader module not found errors into a single error that
 * provides a consistent stack trace and info.
 *
 * @param {IConfig|IPlugin} config - Oclif config or plugin config.
 * @param {string} modulePath - NPM module name or file path to load.
 *
 * @returns {Promise<*>} The entire ESM module from dynamic import or CJS module by require.
 */
async function load(config, modulePath) {
    let filePath;
    let isESM;
    try {
        ;
        ({ filePath, isESM } = await resolvePath(config, modulePath));
        return (isESM ? await import((0, node_url_1.pathToFileURL)(filePath).href) : require(filePath));
    }
    catch (error) {
        handleError(error, isESM, filePath ?? modulePath);
    }
}
exports.load = load;
/**
 * Loads a module and returns an object with the module and data about the module.
 *
 * Uses `getPackageType` to determine if `type` is set to `module`. If so loads '.js' files as ESM otherwise uses
 * a bare require to load as CJS. Also loads '.mjs' files as ESM.
 *
 * Uses dynamic import to load ESM source or require for CommonJS.
 *
 * A unique error, ModuleLoadError, combines both CJS and ESM loader module not found errors into a single error that
 * provides a consistent stack trace and info.
 *
 * @param {IConfig|IPlugin} config - Oclif config or plugin config.
 * @param {string} modulePath - NPM module name or file path to load.
 *
 * @returns {Promise<{isESM: boolean, module: *, filePath: string}>} An object with the loaded module & data including
 *                                                                   file path and whether the module is ESM.
 */
async function loadWithData(config, modulePath) {
    let filePath;
    let isESM;
    try {
        ;
        ({ filePath, isESM } = await resolvePath(config, modulePath));
        const module = isESM ? await import((0, node_url_1.pathToFileURL)(filePath).href) : require(filePath);
        return { filePath, isESM, module };
    }
    catch (error) {
        handleError(error, isESM, filePath ?? modulePath);
    }
}
exports.loadWithData = loadWithData;
/**
 * Loads a module and returns an object with the module and data about the module.
 *
 * Uses cached `isESM` and `relativePath` in plugin manifest to determine if dynamic import (isESM = true)
 * or require (isESM = false | undefined) should be used.
 *
 * A unique error, ModuleLoadError, combines both CJS and ESM loader module not found errors into a single error that
 * provides a consistent stack trace and info.
 *
 * @param {Command.Cached} cached - Cached command data from plugin manifest.
 * @param {string} modulePath - NPM module name or file path to load.
 *
 * @returns {Promise<{isESM: boolean, module: *, filePath: string}>} An object with the loaded module & data including
 *                                                                   file path and whether the module is ESM.
 */
async function loadWithDataFromManifest(cached, modulePath) {
    const { id, isESM, relativePath } = cached;
    if (!relativePath) {
        throw new module_load_1.ModuleLoadError(`Cached command ${id} does not have a relative path`);
    }
    if (isESM === undefined) {
        throw new module_load_1.ModuleLoadError(`Cached command ${id} does not have the isESM property set`);
    }
    const filePath = (0, node_path_1.join)(modulePath, relativePath.join(node_path_1.sep));
    try {
        const module = isESM ? await import((0, node_url_1.pathToFileURL)(filePath).href) : require(filePath);
        return { filePath, isESM, module };
    }
    catch (error) {
        handleError(error, isESM, filePath ?? modulePath);
    }
}
exports.loadWithDataFromManifest = loadWithDataFromManifest;
/**
 * For `.js` files uses `getPackageType` to determine if `type` is set to `module` in associated `package.json`. If
 * the `modulePath` provided ends in `.mjs` it is assumed to be ESM.
 *
 * @param {string} filePath - File path to test.
 *
 * @returns {boolean} The modulePath is an ES Module.
 * @see https://www.npmjs.com/package/get-package-type
 */
function isPathModule(filePath) {
    const extension = (0, node_path_1.extname)(filePath).toLowerCase();
    switch (extension) {
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx': {
            return getPackageType.sync(filePath) === 'module';
        }
        case '.mjs':
        case '.mts': {
            return true;
        }
        default: {
            return false;
        }
    }
}
exports.isPathModule = isPathModule;
/**
 * Resolves a modulePath first by `require.resolve` to allow Node to resolve an actual module. If this fails then
 * the `modulePath` is resolved from the root of the provided config. `Config.tsPath` is used for initial resolution.
 * If this file path does not exist then several extensions are tried from `s_EXTENSIONS` in order: '.js', '.mjs',
 * '.cjs'. After a file path has been selected `isPathModule` is used to determine if the file is an ES Module.
 *
 * @param {IConfig|IPlugin} config - Oclif config or plugin config.
 * @param {string} modulePath - File path to load.
 *
 * @returns {{isESM: boolean, filePath: string}} An object including file path and whether the module is ESM.
 */
async function resolvePath(config, modulePath) {
    let isESM;
    let filePath;
    try {
        filePath = require.resolve(modulePath);
        isESM = isPathModule(filePath);
    }
    catch {
        filePath =
            (isPlugin(config) ? await (0, ts_path_1.tsPath)(config.root, modulePath, config) : await (0, ts_path_1.tsPath)(config.root, modulePath)) ??
                modulePath;
        let fileExists = false;
        let isDirectory = false;
        if ((0, fs_1.existsSync)(filePath)) {
            fileExists = true;
            try {
                if ((0, node_fs_1.lstatSync)(filePath)?.isDirectory?.()) {
                    fileExists = false;
                    isDirectory = true;
                }
            }
            catch { }
        }
        if (!fileExists) {
            // Try all supported extensions.
            let foundPath = findFile(filePath);
            if (!foundPath && isDirectory) {
                // Since filePath is a directory, try looking for index file.
                foundPath = findFile((0, node_path_1.join)(filePath, 'index'));
            }
            if (foundPath) {
                filePath = foundPath;
            }
        }
        isESM = isPathModule(filePath);
    }
    return { filePath, isESM };
}
/**
 * Try adding the different extensions from `s_EXTENSIONS` to find the file.
 *
 * @param {string} filePath - File path to load.
 *
 * @returns {string | null} Modified file path including extension or null if file is not found.
 */
function findFile(filePath) {
    for (const extension of SUPPORTED_EXTENSIONS) {
        const testPath = `${filePath}${extension}`;
        if ((0, fs_1.existsSync)(testPath)) {
            return testPath;
        }
    }
    return null;
}
