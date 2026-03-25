"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
const path = __importStar(require("path"));
const importLazy = require("import-lazy");
const Resolve = __importStar(require("resolve"));
const nodeModule = require("module");
const PackageJsonLookup_1 = require("./PackageJsonLookup");
const FileSystem_1 = require("./FileSystem");
const PackageName_1 = require("./PackageName");
/**
 * Helpers for resolving and importing Node.js modules.
 * @public
 */
class Import {
    static get _builtInModules() {
        if (!Import.__builtInModules) {
            Import.__builtInModules = new Set(nodeModule.builtinModules);
        }
        return Import.__builtInModules;
    }
    /**
     * Provides a way to improve process startup times by lazy-loading imported modules.
     *
     * @remarks
     * This is a more structured wrapper for the {@link https://www.npmjs.com/package/import-lazy|import-lazy}
     * package.  It enables you to replace an import like this:
     *
     * ```ts
     * import * as example from 'example'; // <-- 100ms load time
     *
     * if (condition) {
     *   example.doSomething();
     * }
     * ```
     *
     * ...with a pattern like this:
     *
     * ```ts
     * const example: typeof import('example') = Import.lazy('example', require);
     *
     * if (condition) {
     *   example.doSomething(); // <-- 100ms load time occurs here, only if needed
     * }
     * ```
     *
     * The implementation relies on JavaScript's `Proxy` feature to intercept access to object members.  Thus
     * it will only work correctly with certain types of module exports.  If a particular export isn't well behaved,
     * you may need to find (or introduce) some other module in your dependency graph to apply the optimization to.
     *
     * Usage guidelines:
     *
     * - Always specify types using `typeof` as shown above.
     *
     * - Never apply lazy-loading in a way that would convert the module's type to `any`. Losing type safety
     *   seriously impacts the maintainability of the code base.
     *
     * - In cases where the non-runtime types are needed, import them separately using the `Types` suffix:
     *
     * ```ts
     * const example: typeof import('example') = Import.lazy('example', require);
     * import type * as exampleTypes from 'example';
     * ```
     *
     * - If the imported module confusingly has the same name as its export, then use the Module suffix:
     *
     * ```ts
     * const exampleModule: typeof import('../../logic/Example') = Import.lazy(
     *   '../../logic/Example', require);
     * import type * as exampleTypes from '../../logic/Example';
     * ```
     *
     * - If the exports cause a lot of awkwardness (e.g. too many expressions need to have `exampleModule.` inserted
     *   into them), or if some exports cannot be proxied (e.g. `Import.lazy('example', require)` returns a function
     *   signature), then do not lazy-load that module.  Instead, apply lazy-loading to some other module which is
     *   better behaved.
     *
     * - It's recommended to sort imports in a standard ordering:
     *
     * ```ts
     * // 1. external imports
     * import * as path from 'path';
     * import { Import, JsonFile, JsonObject } from '@rushstack/node-core-library';
     *
     * // 2. local imports
     * import { LocalFile } from './path/LocalFile';
     *
     * // 3. lazy-imports (which are technically variables, not imports)
     * const semver: typeof import('semver') = Import.lazy('semver', require);
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static lazy(moduleName, require) {
        const importLazyLocal = importLazy(require);
        return importLazyLocal(moduleName);
    }
    /**
     * This resolves a module path using similar logic as the Node.js `require.resolve()` API,
     * but supporting extra features such as specifying the base folder.
     *
     * @remarks
     * A module path is a text string that might appear in a statement such as
     * `import { X } from "____";` or `const x = require("___");`.  The implementation is based
     * on the popular `resolve` NPM package.
     *
     * Suppose `example` is an NPM package whose entry point is `lib/index.js`:
     * ```ts
     * // Returns "/path/to/project/node_modules/example/lib/index.js"
     * Import.resolveModule({ modulePath: 'example' });
     *
     * // Returns "/path/to/project/node_modules/example/lib/other.js"
     * Import.resolveModule({ modulePath: 'example/lib/other' });
     * ```
     * If you need to determine the containing package folder
     * (`/path/to/project/node_modules/example`), use {@link Import.resolvePackage} instead.
     *
     * @returns the absolute path of the resolved module.
     * If {@link IImportResolveOptions.includeSystemModules} is specified
     * and a system module is found, then its name is returned without any file path.
     */
    static resolveModule(options) {
        const { modulePath, baseFolderPath, includeSystemModules, allowSelfReference, getRealPath } = options;
        if (path.isAbsolute(modulePath)) {
            return modulePath;
        }
        const normalizedRootPath = (getRealPath || FileSystem_1.FileSystem.getRealPath)(baseFolderPath);
        if (modulePath.startsWith('.')) {
            // This looks like a conventional relative path
            return path.resolve(normalizedRootPath, modulePath);
        }
        // Built-in modules do not have a scope, so if there is a slash, then we need to check
        // against the first path segment
        const slashIndex = modulePath.indexOf('/');
        const moduleName = slashIndex === -1 ? modulePath : modulePath.slice(0, slashIndex);
        if (!includeSystemModules && Import._builtInModules.has(moduleName)) {
            throw new Error(`Cannot find module "${modulePath}" from "${options.baseFolderPath}".`);
        }
        if (allowSelfReference === true) {
            const ownPackage = Import._getPackageName(normalizedRootPath);
            if (ownPackage &&
                (modulePath === ownPackage.packageName || modulePath.startsWith(`${ownPackage.packageName}/`))) {
                const packagePath = modulePath.slice(ownPackage.packageName.length + 1);
                return path.resolve(ownPackage.packageRootPath, packagePath);
            }
        }
        try {
            return Resolve.sync(modulePath, {
                basedir: normalizedRootPath,
                preserveSymlinks: false,
                realpathSync: getRealPath
            });
        }
        catch (e) {
            throw new Error(`Cannot find module "${modulePath}" from "${options.baseFolderPath}": ${e}`);
        }
    }
    /**
     * Async version of {@link Import.resolveModule}.
     */
    static async resolveModuleAsync(options) {
        const { modulePath, baseFolderPath, includeSystemModules, allowSelfReference, getRealPath, getRealPathAsync } = options;
        if (path.isAbsolute(modulePath)) {
            return modulePath;
        }
        const normalizedRootPath = await (getRealPathAsync || getRealPath || FileSystem_1.FileSystem.getRealPathAsync)(baseFolderPath);
        if (modulePath.startsWith('.')) {
            // This looks like a conventional relative path
            return path.resolve(normalizedRootPath, modulePath);
        }
        // Built-in modules do not have a scope, so if there is a slash, then we need to check
        // against the first path segment
        const slashIndex = modulePath.indexOf('/');
        const moduleName = slashIndex === -1 ? modulePath : modulePath.slice(0, slashIndex);
        if (!includeSystemModules && Import._builtInModules.has(moduleName)) {
            throw new Error(`Cannot find module "${modulePath}" from "${options.baseFolderPath}".`);
        }
        if (allowSelfReference === true) {
            const ownPackage = Import._getPackageName(normalizedRootPath);
            if (ownPackage &&
                (modulePath === ownPackage.packageName || modulePath.startsWith(`${ownPackage.packageName}/`))) {
                const packagePath = modulePath.slice(ownPackage.packageName.length + 1);
                return path.resolve(ownPackage.packageRootPath, packagePath);
            }
        }
        try {
            const resolvePromise = new Promise((resolve, reject) => {
                const realPathFn = getRealPathAsync || getRealPath
                    ? (filePath, callback) => {
                        if (getRealPathAsync) {
                            getRealPathAsync(filePath)
                                .then((resolvedPath) => callback(null, resolvedPath))
                                .catch((error) => callback(error));
                        }
                        else {
                            try {
                                const resolvedPath = getRealPath(filePath);
                                callback(null, resolvedPath);
                            }
                            catch (error) {
                                callback(error);
                            }
                        }
                    }
                    : undefined;
                Resolve.default(modulePath, {
                    basedir: normalizedRootPath,
                    preserveSymlinks: false,
                    realpath: realPathFn
                }, (error, resolvedPath) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        // Resolve docs state that either an error will be returned, or the resolved path.
                        // In this case, the resolved path should always be populated.
                        resolve(resolvedPath);
                    }
                });
            });
            return await resolvePromise;
        }
        catch (e) {
            throw new Error(`Cannot find module "${modulePath}" from "${options.baseFolderPath}": ${e}`);
        }
    }
    /**
     * Performs module resolution to determine the folder where a package is installed.
     *
     * @remarks
     * Suppose `example` is an NPM package whose entry point is `lib/index.js`:
     * ```ts
     * // Returns "/path/to/project/node_modules/example"
     * Import.resolvePackage({ packageName: 'example' });
     * ```
     *
     * If you need to resolve a module path, use {@link Import.resolveModule} instead:
     * ```ts
     * // Returns "/path/to/project/node_modules/example/lib/index.js"
     * Import.resolveModule({ modulePath: 'example' });
     * ```
     *
     * @returns the absolute path of the package folder.
     * If {@link IImportResolveOptions.includeSystemModules} is specified
     * and a system module is found, then its name is returned without any file path.
     */
    static resolvePackage(options) {
        const { packageName, includeSystemModules, baseFolderPath, allowSelfReference, getRealPath, useNodeJSResolver } = options;
        if (includeSystemModules && Import._builtInModules.has(packageName)) {
            return packageName;
        }
        const normalizedRootPath = (getRealPath || FileSystem_1.FileSystem.getRealPath)(baseFolderPath);
        if (allowSelfReference) {
            const ownPackage = Import._getPackageName(normalizedRootPath);
            if (ownPackage && ownPackage.packageName === packageName) {
                return ownPackage.packageRootPath;
            }
        }
        PackageName_1.PackageName.parse(packageName); // Ensure the package name is valid and doesn't contain a path
        try {
            const resolvedPath = useNodeJSResolver
                ? require.resolve(`${packageName}/package.json`, {
                    paths: [normalizedRootPath]
                })
                : // Append `/package.json` to ensure `resolve.sync` doesn't attempt to return a system package, and to avoid
                    // having to mess with the `packageFilter` option.
                    Resolve.sync(`${packageName}/package.json`, {
                        basedir: normalizedRootPath,
                        preserveSymlinks: false,
                        realpathSync: getRealPath
                    });
            const packagePath = path.dirname(resolvedPath);
            return packagePath;
        }
        catch (e) {
            throw new Error(`Cannot find package "${packageName}" from "${baseFolderPath}": ${e}.`);
        }
    }
    /**
     * Async version of {@link Import.resolvePackage}.
     */
    static async resolvePackageAsync(options) {
        const { packageName, includeSystemModules, baseFolderPath, allowSelfReference, getRealPath, getRealPathAsync } = options;
        if (includeSystemModules && Import._builtInModules.has(packageName)) {
            return packageName;
        }
        const normalizedRootPath = await (getRealPathAsync || getRealPath || FileSystem_1.FileSystem.getRealPathAsync)(baseFolderPath);
        if (allowSelfReference) {
            const ownPackage = Import._getPackageName(normalizedRootPath);
            if (ownPackage && ownPackage.packageName === packageName) {
                return ownPackage.packageRootPath;
            }
        }
        PackageName_1.PackageName.parse(packageName); // Ensure the package name is valid and doesn't contain a path
        try {
            const resolvePromise = new Promise((resolve, reject) => {
                const realPathFn = getRealPathAsync || getRealPath
                    ? (filePath, callback) => {
                        if (getRealPathAsync) {
                            getRealPathAsync(filePath)
                                .then((resolvedPath) => callback(null, resolvedPath))
                                .catch((error) => callback(error));
                        }
                        else {
                            try {
                                const resolvedPath = getRealPath(filePath);
                                callback(null, resolvedPath);
                            }
                            catch (error) {
                                callback(error);
                            }
                        }
                    }
                    : undefined;
                Resolve.default(
                // Append `/package.json` to ensure `resolve` doesn't attempt to return a system package, and to avoid
                // having to mess with the `packageFilter` option.
                `${packageName}/package.json`, {
                    basedir: normalizedRootPath,
                    preserveSymlinks: false,
                    realpath: realPathFn
                }, (error, resolvedPath) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        // Resolve docs state that either an error will be returned, or the resolved path.
                        // In this case, the resolved path should always be populated.
                        resolve(resolvedPath);
                    }
                });
            });
            const resolvedPath = await resolvePromise;
            const packagePath = path.dirname(resolvedPath);
            return packagePath;
        }
        catch (e) {
            throw new Error(`Cannot find package "${packageName}" from "${baseFolderPath}": ${e}`);
        }
    }
    static _getPackageName(rootPath) {
        const packageJsonPath = PackageJsonLookup_1.PackageJsonLookup.instance.tryGetPackageJsonFilePathFor(rootPath);
        if (packageJsonPath) {
            const packageJson = PackageJsonLookup_1.PackageJsonLookup.instance.loadPackageJson(packageJsonPath);
            return {
                packageRootPath: path.dirname(packageJsonPath),
                packageName: packageJson.name
            };
        }
        else {
            return undefined;
        }
    }
}
exports.Import = Import;
//# sourceMappingURL=Import.js.map