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
exports.Path = void 0;
const path = __importStar(require("node:path"));
/**
 * Common operations for manipulating file and directory paths.
 * @remarks
 * This API is intended to eventually be a complete replacement for the NodeJS "path" API.
 * @public
 */
class Path {
    /**
     * Returns true if "childPath" is located inside the "parentFolderPath" folder
     * or one of its child folders.  Note that "parentFolderPath" is not considered to be
     * under itself.  The "childPath" can refer to any type of file system object.
     *
     * @remarks
     * The indicated file/folder objects are not required to actually exist on disk.
     * For example, "parentFolderPath" is interpreted as a folder name even if it refers to a file.
     * If the paths are relative, they will first be resolved using path.resolve().
     */
    static isUnder(childPath, parentFolderPath) {
        // If childPath is under parentPath, then relativePath will be something like
        // "../.." or "..\\..", which consists entirely of periods and slashes.
        // (Note that something like "....t" is actually a valid filename, but "...." is not.)
        const relativePath = path.relative(childPath, parentFolderPath);
        return Path._relativePathRegex.test(relativePath);
    }
    /**
     * Returns true if "childPath" is equal to "parentFolderPath", or if it is inside that folder
     * or one of its children.  The "childPath" can refer to any type of file system object.
     *
     * @remarks
     * The indicated file/folder objects are not required to actually exist on disk.
     * For example, "parentFolderPath" is interpreted as a folder name even if it refers to a file.
     * If the paths are relative, they will first be resolved using path.resolve().
     */
    static isUnderOrEqual(childPath, parentFolderPath) {
        const relativePath = path.relative(childPath, parentFolderPath);
        return relativePath === '' || Path._relativePathRegex.test(relativePath);
    }
    /**
     * Returns true if `path1` and `path2` refer to the same underlying path.
     *
     * @remarks
     *
     * The comparison is performed using `path.relative()`.
     */
    static isEqual(path1, path2) {
        return path.relative(path1, path2) === '';
    }
    /**
     * Formats a path to look nice for reporting purposes.
     * @remarks
     * If `pathToConvert` is under the `baseFolder`, then it will be converted to a relative with the `./` prefix
     * unless the {@link IPathFormatConciselyOptions.trimLeadingDotSlash} option is set to `true`.
     * Otherwise, it will be converted to an absolute path.
     *
     * Backslashes will be converted to slashes, unless the path starts with an OS-specific string like `C:\`.
     */
    static formatConcisely(options) {
        // Same logic as Path.isUnderOrEqual()
        const relativePath = path.relative(options.pathToConvert, options.baseFolder);
        const isUnderOrEqual = relativePath === '' || Path._relativePathRegex.test(relativePath);
        if (isUnderOrEqual) {
            // Note that isUnderOrEqual()'s relativePath is the reverse direction
            const convertedPath = Path.convertToSlashes(path.relative(options.baseFolder, options.pathToConvert));
            if (options.trimLeadingDotSlash) {
                return convertedPath;
            }
            else {
                return `./${convertedPath}`;
            }
        }
        const absolutePath = path.resolve(options.pathToConvert);
        return absolutePath;
    }
    /**
     * Formats a file location to look nice for reporting purposes.
     * @remarks
     * If `pathToFormat` is under the `baseFolder`, then it will be converted to a relative with the `./` prefix.
     * Otherwise, it will be converted to an absolute path.
     *
     * Backslashes will be converted to slashes, unless the path starts with an OS-specific string like `C:\`.
     */
    static formatFileLocation(options) {
        const { message, format, pathToFormat, baseFolder, line, column } = options;
        // Convert the path to be relative to the base folder, if specified. Otherwise, use
        // the path as-is.
        const filePath = baseFolder
            ? Path.formatConcisely({
                pathToConvert: pathToFormat,
                baseFolder,
                trimLeadingDotSlash: true
            })
            : path.resolve(pathToFormat);
        let formattedFileLocation;
        switch (format) {
            case 'Unix': {
                if (line !== undefined && column !== undefined) {
                    formattedFileLocation = `:${line}:${column}`;
                }
                else if (line !== undefined) {
                    formattedFileLocation = `:${line}`;
                }
                else {
                    formattedFileLocation = '';
                }
                break;
            }
            case 'VisualStudio': {
                if (line !== undefined && column !== undefined) {
                    formattedFileLocation = `(${line},${column})`;
                }
                else if (line !== undefined) {
                    formattedFileLocation = `(${line})`;
                }
                else {
                    formattedFileLocation = '';
                }
                break;
            }
            default: {
                throw new Error(`Unknown format: ${format}`);
            }
        }
        return `${filePath}${formattedFileLocation} - ${message}`;
    }
    /**
     * Replaces Windows-style backslashes with POSIX-style slashes.
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToSlashes(inputPath) {
        return inputPath.replace(/\\/g, '/');
    }
    /**
     * Replaces POSIX-style slashes with Windows-style backslashes
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToBackslashes(inputPath) {
        return inputPath.replace(/\//g, '\\');
    }
    /**
     * Replaces slashes or backslashes with the appropriate slash for the current operating system.
     */
    static convertToPlatformDefault(inputPath) {
        return path.sep === '/' ? Path.convertToSlashes(inputPath) : Path.convertToBackslashes(inputPath);
    }
    /**
     * Returns true if the specified path is a relative path and does not use `..` to walk upwards.
     *
     * @example
     * ```ts
     * // These evaluate to true
     * isDownwardRelative('folder');
     * isDownwardRelative('file');
     * isDownwardRelative('folder/');
     * isDownwardRelative('./folder/');
     * isDownwardRelative('./folder/file');
     *
     * // These evaluate to false
     * isDownwardRelative('../folder');
     * isDownwardRelative('folder/../file');
     * isDownwardRelative('/folder/file');
     * ```
     */
    static isDownwardRelative(inputPath) {
        if (path.isAbsolute(inputPath)) {
            return false;
        }
        // Does it contain ".."
        if (Path._upwardPathSegmentRegex.test(inputPath)) {
            return false;
        }
        return true;
    }
}
exports.Path = Path;
// Matches a relative path consisting entirely of periods and slashes
// Example: ".", "..", "../..", etc
Path._relativePathRegex = /^[.\/\\]+$/;
// Matches a relative path segment that traverses upwards
// Example: "a/../b"
Path._upwardPathSegmentRegex = /([\/\\]|^)\.\.([\/\\]|$)/;
//# sourceMappingURL=Path.js.map