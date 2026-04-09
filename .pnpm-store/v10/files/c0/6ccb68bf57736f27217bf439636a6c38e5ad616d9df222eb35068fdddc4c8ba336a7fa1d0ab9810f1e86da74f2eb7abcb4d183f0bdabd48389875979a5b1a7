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
exports.PackageJsonLookup = void 0;
const path = __importStar(require("node:path"));
const JsonFile_1 = require("./JsonFile");
const Constants_1 = require("./Constants");
const FileSystem_1 = require("./FileSystem");
/**
 * This class provides methods for finding the nearest "package.json" for a folder
 * and retrieving the name of the package.  The results are cached.
 *
 * @public
 */
class PackageJsonLookup {
    /**
     * A singleton instance of `PackageJsonLookup`, which is useful for short-lived processes
     * that can reasonably assume that the file system will not be modified after the cache
     * is populated.
     *
     * @remarks
     * For long-running processes that need to clear the cache at appropriate times,
     * it is recommended to create your own instance of `PackageJsonLookup` instead
     * of relying on this instance.
     */
    static get instance() {
        if (!PackageJsonLookup._instance) {
            PackageJsonLookup._instance = new PackageJsonLookup({ loadExtraFields: true });
        }
        return PackageJsonLookup._instance;
    }
    constructor(parameters) {
        this._loadExtraFields = false;
        if (parameters) {
            if (parameters.loadExtraFields) {
                this._loadExtraFields = parameters.loadExtraFields;
            }
        }
        this.clearCache();
    }
    /**
     * A helper for loading the caller's own package.json file.
     *
     * @remarks
     *
     * This function provides a concise and efficient way for an NPM package to report metadata about itself.
     * For example, a tool might want to report its version.
     *
     * The `loadOwnPackageJson()` probes upwards from the caller's folder, expecting to find a package.json file,
     * which is assumed to be the caller's package.  The result is cached, under the assumption that a tool's
     * own package.json (and intermediary folders) will never change during the lifetime of the process.
     *
     * @example
     * ```ts
     * // Report the version of our NPM package
     * const myPackageVersion: string = PackageJsonLookup.loadOwnPackageJson(__dirname).version;
     * console.log(`Cool Tool - Version ${myPackageVersion}`);
     * ```
     *
     * @param dirnameOfCaller - The NodeJS `__dirname` macro for the caller.
     * @returns This function always returns a valid `IPackageJson` object.  If any problems are encountered during
     * loading, an exception will be thrown instead.
     */
    static loadOwnPackageJson(dirnameOfCaller) {
        const packageJson = PackageJsonLookup.instance.tryLoadPackageJsonFor(dirnameOfCaller);
        if (packageJson === undefined) {
            throw new Error(`PackageJsonLookup.loadOwnPackageJson() failed to find the caller's package.json.` +
                `  The __dirname was: ${dirnameOfCaller}`);
        }
        if (packageJson.version !== undefined) {
            return packageJson;
        }
        const errorPath = PackageJsonLookup.instance.tryGetPackageJsonFilePathFor(dirnameOfCaller) || 'package.json';
        throw new Error(`PackageJsonLookup.loadOwnPackageJson() failed because the "version" field is missing in` +
            ` ${errorPath}`);
    }
    /**
     * Clears the internal file cache.
     * @remarks
     * Call this method if changes have been made to the package.json files on disk.
     */
    clearCache() {
        this._packageFolderCache = new Map();
        this._packageJsonCache = new Map();
    }
    /**
     * Returns the absolute path of a folder containing a package.json file, by looking
     * upwards from the specified fileOrFolderPath.  If no package.json can be found,
     * undefined is returned.
     *
     * @remarks
     * The fileOrFolderPath is not required to actually exist on disk.
     * The fileOrFolderPath itself can be the return value, if it is a folder containing
     * a package.json file.
     * Both positive and negative lookup results are cached.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an absolute path to a folder containing a package.json file
     */
    tryGetPackageFolderFor(fileOrFolderPath) {
        // Convert it to an absolute path
        const resolvedFileOrFolderPath = path.resolve(fileOrFolderPath);
        // Optimistically hope that the starting string is already in the cache,
        // in which case we can avoid disk access entirely.
        //
        // (Two lookups are required, because get() cannot distinguish the undefined value
        // versus a missing key.)
        if (this._packageFolderCache.has(resolvedFileOrFolderPath)) {
            return this._packageFolderCache.get(resolvedFileOrFolderPath);
        }
        // Now call the recursive part of the algorithm
        return this._tryGetPackageFolderFor(resolvedFileOrFolderPath);
    }
    /**
     * If the specified file or folder is part of a package, this returns the absolute path
     * to the associated package.json file.
     *
     * @remarks
     * The package folder is determined using the same algorithm
     * as {@link PackageJsonLookup.tryGetPackageFolderFor}.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an absolute path to * package.json file
     */
    tryGetPackageJsonFilePathFor(fileOrFolderPath) {
        const packageJsonFolder = this.tryGetPackageFolderFor(fileOrFolderPath);
        if (!packageJsonFolder) {
            return undefined;
        }
        return path.join(packageJsonFolder, Constants_1.FileConstants.PackageJson);
    }
    /**
     * If the specified file or folder is part of a package, this loads and returns the
     * associated package.json file.
     *
     * @remarks
     * The package folder is determined using the same algorithm
     * as {@link PackageJsonLookup.tryGetPackageFolderFor}.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an IPackageJson object, or undefined if the fileOrFolderPath does not
     * belong to a package
     */
    tryLoadPackageJsonFor(fileOrFolderPath) {
        const packageJsonFilePath = this.tryGetPackageJsonFilePathFor(fileOrFolderPath);
        if (!packageJsonFilePath) {
            return undefined;
        }
        return this.loadPackageJson(packageJsonFilePath);
    }
    /**
     * This function is similar to {@link PackageJsonLookup.tryLoadPackageJsonFor}, except that it does not report
     * an error if the `version` field is missing from the package.json file.
     */
    tryLoadNodePackageJsonFor(fileOrFolderPath) {
        const packageJsonFilePath = this.tryGetPackageJsonFilePathFor(fileOrFolderPath);
        if (!packageJsonFilePath) {
            return undefined;
        }
        return this.loadNodePackageJson(packageJsonFilePath);
    }
    /**
     * Loads the specified package.json file, if it is not already present in the cache.
     *
     * @remarks
     * Unless {@link IPackageJsonLookupParameters.loadExtraFields} was specified,
     * the returned IPackageJson object will contain a subset of essential fields.
     * The returned object should be considered to be immutable; the caller must never
     * modify it.
     *
     * @param jsonFilename - a relative or absolute path to a package.json file
     */
    loadPackageJson(jsonFilename) {
        const packageJson = this.loadNodePackageJson(jsonFilename);
        if (!packageJson.version) {
            throw new Error(`Error reading "${jsonFilename}":\n  The required field "version" was not found`);
        }
        return packageJson;
    }
    /**
     * This function is similar to {@link PackageJsonLookup.loadPackageJson}, except that it does not report an error
     * if the `version` field is missing from the package.json file.
     */
    loadNodePackageJson(jsonFilename) {
        return this._loadPackageJsonInner(jsonFilename);
    }
    _loadPackageJsonInner(jsonFilename, errorsToIgnore) {
        const loadResult = this._tryLoadNodePackageJsonInner(jsonFilename);
        if (loadResult.error && (errorsToIgnore === null || errorsToIgnore === void 0 ? void 0 : errorsToIgnore.has(loadResult.error))) {
            return undefined;
        }
        switch (loadResult.error) {
            case 'FILE_NOT_FOUND': {
                throw new Error(`Input file not found: ${jsonFilename}`);
            }
            case 'MISSING_NAME_FIELD': {
                throw new Error(`Error reading "${jsonFilename}":\n  The required field "name" was not found`);
            }
            case 'OTHER_ERROR': {
                throw loadResult.errorObject;
            }
            default: {
                return loadResult.packageJson;
            }
        }
    }
    /**
     * Try to load a package.json file as an INodePackageJson,
     * returning undefined if the found file does not contain a `name` field.
     */
    _tryLoadNodePackageJsonInner(jsonFilename) {
        // Since this will be a cache key, follow any symlinks and get an absolute path
        // to minimize duplication.  (Note that duplication can still occur due to e.g. character case.)
        let normalizedFilePath;
        try {
            normalizedFilePath = FileSystem_1.FileSystem.getRealPath(jsonFilename);
        }
        catch (e) {
            if (FileSystem_1.FileSystem.isNotExistError(e)) {
                return {
                    error: 'FILE_NOT_FOUND'
                };
            }
            else {
                return {
                    error: 'OTHER_ERROR',
                    errorObject: e
                };
            }
        }
        let packageJson = this._packageJsonCache.get(normalizedFilePath);
        if (!packageJson) {
            const loadedPackageJson = JsonFile_1.JsonFile.load(normalizedFilePath);
            // Make sure this is really a package.json file.  CommonJS has fairly strict requirements,
            // but NPM only requires "name" and "version"
            if (!loadedPackageJson.name) {
                return {
                    error: 'MISSING_NAME_FIELD'
                };
            }
            if (this._loadExtraFields) {
                packageJson = loadedPackageJson;
            }
            else {
                packageJson = {};
                // Unless "loadExtraFields" was requested, copy over the essential fields only
                packageJson.bin = loadedPackageJson.bin;
                packageJson.dependencies = loadedPackageJson.dependencies;
                packageJson.description = loadedPackageJson.description;
                packageJson.devDependencies = loadedPackageJson.devDependencies;
                packageJson.exports = loadedPackageJson.exports;
                packageJson.homepage = loadedPackageJson.homepage;
                packageJson.license = loadedPackageJson.license;
                packageJson.main = loadedPackageJson.main;
                packageJson.name = loadedPackageJson.name;
                packageJson.optionalDependencies = loadedPackageJson.optionalDependencies;
                packageJson.peerDependencies = loadedPackageJson.peerDependencies;
                packageJson.private = loadedPackageJson.private;
                packageJson.scripts = loadedPackageJson.scripts;
                packageJson.tsdocMetadata = loadedPackageJson.tsdocMetadata;
                packageJson.typings = loadedPackageJson.typings || loadedPackageJson.types;
                packageJson.version = loadedPackageJson.version;
            }
            Object.freeze(packageJson);
            this._packageJsonCache.set(normalizedFilePath, packageJson);
        }
        return {
            packageJson
        };
    }
    // Recursive part of the algorithm from tryGetPackageFolderFor()
    _tryGetPackageFolderFor(resolvedFileOrFolderPath) {
        // Two lookups are required, because get() cannot distinguish the undefined value
        // versus a missing key.
        if (this._packageFolderCache.has(resolvedFileOrFolderPath)) {
            return this._packageFolderCache.get(resolvedFileOrFolderPath);
        }
        // Is resolvedFileOrFolderPath itself a folder with a valid package.json file?  If so, return it.
        const packageJsonFilePath = `${resolvedFileOrFolderPath}/${Constants_1.FileConstants.PackageJson}`;
        const packageJson = this._loadPackageJsonInner(packageJsonFilePath, new Set(['FILE_NOT_FOUND', 'MISSING_NAME_FIELD']));
        if (packageJson) {
            this._packageFolderCache.set(resolvedFileOrFolderPath, resolvedFileOrFolderPath);
            return resolvedFileOrFolderPath;
        }
        // Otherwise go up one level
        const parentFolder = path.dirname(resolvedFileOrFolderPath);
        if (!parentFolder || parentFolder === resolvedFileOrFolderPath) {
            // We reached the root directory without finding a package.json file,
            // so cache the negative result
            this._packageFolderCache.set(resolvedFileOrFolderPath, undefined);
            return undefined; // no match
        }
        // Recurse upwards, caching every step along the way
        const parentResult = this._tryGetPackageFolderFor(parentFolder);
        // Cache the parent's answer as well
        this._packageFolderCache.set(resolvedFileOrFolderPath, parentResult);
        return parentResult;
    }
}
exports.PackageJsonLookup = PackageJsonLookup;
//# sourceMappingURL=PackageJsonLookup.js.map