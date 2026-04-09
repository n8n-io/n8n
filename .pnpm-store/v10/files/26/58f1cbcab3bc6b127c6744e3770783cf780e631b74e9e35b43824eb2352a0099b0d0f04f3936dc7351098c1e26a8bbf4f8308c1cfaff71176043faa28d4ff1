"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageMetadataManager = exports.PackageMetadata = void 0;
const node_path_1 = __importDefault(require("node:path"));
const semver_1 = __importDefault(require("semver"));
const node_core_library_1 = require("@rushstack/node-core-library");
const Extractor_1 = require("../api/Extractor");
const ConsoleMessageId_1 = require("../api/ConsoleMessageId");
/**
 * Represents analyzed information for a package.json file.
 * This object is constructed and returned by PackageMetadataManager.
 */
class PackageMetadata {
    constructor(packageJsonPath, packageJson, aedocSupported) {
        this.packageJsonPath = packageJsonPath;
        this.packageJson = packageJson;
        this.aedocSupported = aedocSupported;
    }
}
exports.PackageMetadata = PackageMetadata;
const TSDOC_METADATA_FILENAME = 'tsdoc-metadata.json';
/**
 * 1. If package.json a `"tsdocMetadata": "./path1/path2/tsdoc-metadata.json"` field
 * then that takes precedence. This convention will be rarely needed, since the other rules below generally
 * produce a good result.
 */
function _tryResolveTsdocMetadataFromTsdocMetadataField({ tsdocMetadata }) {
    return tsdocMetadata;
}
/**
 * 2. If package.json contains a `"exports": { ".": { "types": "./path1/path2/index.d.ts" } }` field,
 * then we look for the file under "./path1/path2/tsdoc-metadata.json"
 *
 * This always looks for a "." and then a "*" entry in the exports field, and then evaluates for
 * a "types" field in that entry.
 */
function _tryResolveTsdocMetadataFromExportsField({ exports }) {
    var _a;
    switch (typeof exports) {
        case 'string': {
            return `${node_path_1.default.dirname(exports)}/${TSDOC_METADATA_FILENAME}`;
        }
        case 'object': {
            if (Array.isArray(exports)) {
                const [firstExport] = exports;
                // Take the first entry in the array
                if (firstExport) {
                    return `${node_path_1.default.dirname(exports[0])}/${TSDOC_METADATA_FILENAME}`;
                }
            }
            else {
                const rootExport = (_a = exports['.']) !== null && _a !== void 0 ? _a : exports['*'];
                switch (typeof rootExport) {
                    case 'string': {
                        return `${node_path_1.default.dirname(rootExport)}/${TSDOC_METADATA_FILENAME}`;
                    }
                    case 'object': {
                        let typesExport = rootExport === null || rootExport === void 0 ? void 0 : rootExport.types;
                        while (typesExport) {
                            switch (typeof typesExport) {
                                case 'string': {
                                    return `${node_path_1.default.dirname(typesExport)}/${TSDOC_METADATA_FILENAME}`;
                                }
                                case 'object': {
                                    typesExport = typesExport === null || typesExport === void 0 ? void 0 : typesExport.types;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            break;
        }
    }
}
/**
 * 3. If package.json contains a `typesVersions` field, look for the version
 * matching the highest minimum version that either includes a "." or "*" entry.
 */
function _tryResolveTsdocMetadataFromTypesVersionsField({ typesVersions }) {
    var _a;
    if (typesVersions) {
        let highestMinimumMatchingSemver;
        let latestMatchingPath;
        for (const [version, paths] of Object.entries(typesVersions)) {
            let range;
            try {
                range = new semver_1.default.Range(version);
            }
            catch (_b) {
                continue;
            }
            const minimumMatchingSemver = semver_1.default.minVersion(range);
            if (minimumMatchingSemver &&
                (!highestMinimumMatchingSemver || semver_1.default.gt(minimumMatchingSemver, highestMinimumMatchingSemver))) {
                const pathEntry = (_a = paths['.']) !== null && _a !== void 0 ? _a : paths['*'];
                const firstPath = pathEntry === null || pathEntry === void 0 ? void 0 : pathEntry[0];
                if (firstPath) {
                    highestMinimumMatchingSemver = minimumMatchingSemver;
                    latestMatchingPath = firstPath;
                }
            }
        }
        if (latestMatchingPath) {
            return `${node_path_1.default.dirname(latestMatchingPath)}/${TSDOC_METADATA_FILENAME}`;
        }
    }
}
/**
 * 4. If package.json contains a `"types": "./path1/path2/index.d.ts"` or a `"typings": "./path1/path2/index.d.ts"`
 * field, then we look for the file under "./path1/path2/tsdoc-metadata.json".
 *
 * @remarks
 * `types` takes precedence over `typings`.
 */
function _tryResolveTsdocMetadataFromTypesOrTypingsFields({ typings, types }) {
    const typesField = types !== null && types !== void 0 ? types : typings;
    if (typesField) {
        return `${node_path_1.default.dirname(typesField)}/${TSDOC_METADATA_FILENAME}`;
    }
}
/**
 * 5. If package.json contains a `"main": "./path1/path2/index.js"` field, then we look for the file under
 * "./path1/path2/tsdoc-metadata.json".
 */
function _tryResolveTsdocMetadataFromMainField({ main }) {
    if (main) {
        return `${node_path_1.default.dirname(main)}/${TSDOC_METADATA_FILENAME}`;
    }
}
/**
 * This class maintains a cache of analyzed information obtained from package.json
 * files.  It is built on top of the PackageJsonLookup class.
 *
 * @remarks
 *
 * IMPORTANT: Don't use PackageMetadataManager to analyze source files from the current project:
 * 1. Files such as tsdoc-metadata.json may not have been built yet, and thus may contain incorrect information.
 * 2. The current project is not guaranteed to have a package.json file at all.  For example, API Extractor can
 *    be invoked on a bare .d.ts file.
 *
 * Use ts.program.isSourceFileFromExternalLibrary() to test source files before passing the to PackageMetadataManager.
 */
class PackageMetadataManager {
    constructor(packageJsonLookup, messageRouter) {
        this._packageMetadataByPackageJsonPath = new Map();
        this._packageJsonLookup = packageJsonLookup;
        this._messageRouter = messageRouter;
    }
    /**
     * This feature is still being standardized: https://github.com/microsoft/tsdoc/issues/7
     * In the future we will use the @microsoft/tsdoc library to read this file.
     */
    static _resolveTsdocMetadataPathFromPackageJson(packageFolder, packageJson) {
        var _a, _b, _c, _d, _e;
        const tsdocMetadataRelativePath = (_e = (_d = (_c = (_b = (_a = _tryResolveTsdocMetadataFromTsdocMetadataField(packageJson)) !== null && _a !== void 0 ? _a : _tryResolveTsdocMetadataFromExportsField(packageJson)) !== null && _b !== void 0 ? _b : _tryResolveTsdocMetadataFromTypesVersionsField(packageJson)) !== null && _c !== void 0 ? _c : _tryResolveTsdocMetadataFromTypesOrTypingsFields(packageJson)) !== null && _d !== void 0 ? _d : _tryResolveTsdocMetadataFromMainField(packageJson)) !== null && _e !== void 0 ? _e : 
        // As a final fallback, place the file in the root of the package.
        TSDOC_METADATA_FILENAME;
        // Always resolve relative to the package folder.
        const tsdocMetadataPath = node_path_1.default.resolve(packageFolder, 
        // This non-null assertion is safe because the last entry in TSDOC_METADATA_RESOLUTION_FUNCTIONS
        // returns a non-undefined value.
        tsdocMetadataRelativePath);
        return tsdocMetadataPath;
    }
    /**
     * @param tsdocMetadataPath - An explicit path that can be configured in api-extractor.json.
     * If this parameter is not an empty string, it overrides the normal path calculation.
     * @returns the absolute path to the TSDoc metadata file
     */
    static resolveTsdocMetadataPath(packageFolder, packageJson, tsdocMetadataPath) {
        if (tsdocMetadataPath) {
            return node_path_1.default.resolve(packageFolder, tsdocMetadataPath);
        }
        return PackageMetadataManager._resolveTsdocMetadataPathFromPackageJson(packageFolder, packageJson);
    }
    /**
     * Writes the TSDoc metadata file to the specified output file.
     */
    static writeTsdocMetadataFile(tsdocMetadataPath, newlineKind) {
        const fileObject = {
            tsdocVersion: '0.12',
            toolPackages: [
                {
                    packageName: '@microsoft/api-extractor',
                    packageVersion: Extractor_1.Extractor.version
                }
            ]
        };
        const fileContent = '// This file is read by tools that parse documentation comments conforming to the TSDoc standard.\n' +
            '// It should be published with your NPM package.  It should not be tracked by Git.\n' +
            node_core_library_1.JsonFile.stringify(fileObject);
        node_core_library_1.FileSystem.writeFile(tsdocMetadataPath, fileContent, {
            convertLineEndings: newlineKind,
            ensureFolderExists: true
        });
    }
    /**
     * Finds the package.json in a parent folder of the specified source file, and
     * returns a PackageMetadata object.  If no package.json was found, then undefined
     * is returned.  The results are cached.
     */
    tryFetchPackageMetadata(sourceFilePath) {
        const packageJsonFilePath = this._packageJsonLookup.tryGetPackageJsonFilePathFor(sourceFilePath);
        if (!packageJsonFilePath) {
            return undefined;
        }
        let packageMetadata = this._packageMetadataByPackageJsonPath.get(packageJsonFilePath);
        if (!packageMetadata) {
            const packageJson = this._packageJsonLookup.loadNodePackageJson(packageJsonFilePath);
            const packageJsonFolder = node_path_1.default.dirname(packageJsonFilePath);
            let aedocSupported = false;
            const tsdocMetadataPath = PackageMetadataManager._resolveTsdocMetadataPathFromPackageJson(packageJsonFolder, packageJson);
            if (node_core_library_1.FileSystem.exists(tsdocMetadataPath)) {
                this._messageRouter.logVerbose(ConsoleMessageId_1.ConsoleMessageId.FoundTSDocMetadata, 'Found metadata in ' + tsdocMetadataPath);
                // If the file exists at all, assume it was written by API Extractor
                aedocSupported = true;
            }
            packageMetadata = new PackageMetadata(packageJsonFilePath, packageJson, aedocSupported);
            this._packageMetadataByPackageJsonPath.set(packageJsonFilePath, packageMetadata);
        }
        return packageMetadata;
    }
    /**
     * Returns true if the source file is part of a package whose .d.ts files support AEDoc annotations.
     */
    isAedocSupportedFor(sourceFilePath) {
        const packageMetadata = this.tryFetchPackageMetadata(sourceFilePath);
        if (!packageMetadata) {
            return false;
        }
        return packageMetadata.aedocSupported;
    }
}
exports.PackageMetadataManager = PackageMetadataManager;
PackageMetadataManager.tsdocMetadataFilename = TSDOC_METADATA_FILENAME;
//# sourceMappingURL=PackageMetadataManager.js.map