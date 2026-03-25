import { Command } from './command';
import { Config as IConfig, Plugin as IPlugin } from './interfaces';
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
export declare function load<T = any>(config: IConfig | IPlugin, modulePath: string): Promise<T>;
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
export declare function loadWithData<T = any>(config: IConfig | IPlugin, modulePath: string): Promise<{
    filePath: string;
    isESM: boolean;
    module: T;
}>;
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
export declare function loadWithDataFromManifest<T = any>(cached: Command.Cached, modulePath: string): Promise<{
    filePath: string;
    isESM: boolean;
    module: T;
}>;
/**
 * For `.js` files uses `getPackageType` to determine if `type` is set to `module` in associated `package.json`. If
 * the `modulePath` provided ends in `.mjs` it is assumed to be ESM.
 *
 * @param {string} filePath - File path to test.
 *
 * @returns {boolean} The modulePath is an ES Module.
 * @see https://www.npmjs.com/package/get-package-type
 */
export declare function isPathModule(filePath: string): boolean;
