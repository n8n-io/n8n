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
exports.RealNodeModulePathResolver = void 0;
const nodeFs = __importStar(require("fs"));
const nodePath = __importStar(require("path"));
/**
 * This class encapsulates a caching resolver for symlinks in node_modules directories.
 * It assumes that the only symlinks that exist in input paths are those that correspond to
 * npm packages.
 *
 * @remarks
 * In a repository with a symlinked node_modules installation, some symbolic links need to be mapped for
 * node module resolution to produce correct results. However, calling `fs.realpathSync.native` on every path,
 * as is commonly done by most resolvers, involves an enormous number of file system operations (for reference,
 * each invocation of `fs.realpathSync.native` involves a series of `fs.readlinkSync` calls, up to one for each
 * path segment in the input).
 *
 * @public
 */
class RealNodeModulePathResolver {
    constructor(options = {}) {
        const { fs: { lstatSync = nodeFs.lstatSync, readlinkSync = nodeFs.readlinkSync } = nodeFs, path: { isAbsolute = nodePath.isAbsolute, join = nodePath.join, resolve = nodePath.resolve, sep = nodePath.sep } = nodePath, ignoreMissingPaths = false } = options;
        const cache = (this._cache = new Map());
        this._errorCache = new Map();
        this._fs = {
            lstatSync,
            readlinkSync
        };
        this._path = {
            isAbsolute,
            join,
            resolve,
            sep
        };
        this._lstatOptions = {
            throwIfNoEntry: !ignoreMissingPaths
        };
        const nodeModulesToken = `${sep}node_modules${sep}`;
        const self = this;
        function realNodeModulePathInternal(input) {
            // Find the last node_modules path segment
            const nodeModulesIndex = input.lastIndexOf(nodeModulesToken);
            if (nodeModulesIndex < 0) {
                // No node_modules in path, so we assume it is already the real path
                return input;
            }
            // First assume that the next path segment after node_modules is a symlink
            let linkStart = nodeModulesIndex + nodeModulesToken.length - 1;
            let linkEnd = input.indexOf(sep, linkStart + 1);
            // If the path segment starts with a '@', then it is a scoped package
            const isScoped = input.charAt(linkStart + 1) === '@';
            if (isScoped) {
                // For a scoped package, the scope is an ordinary directory, so we need to find the next path segment
                if (linkEnd < 0) {
                    // Symlink missing, so see if anything before the last node_modules needs resolving,
                    // and preserve the rest of the path
                    return join(realNodeModulePathInternal(input.slice(0, nodeModulesIndex)), input.slice(nodeModulesIndex + 1), 
                    // Joining to `.` will clean up any extraneous trailing slashes
                    '.');
                }
                linkStart = linkEnd;
                linkEnd = input.indexOf(sep, linkStart + 1);
            }
            // No trailing separator, so the link is the last path segment
            if (linkEnd < 0) {
                linkEnd = input.length;
            }
            const linkCandidate = input.slice(0, linkEnd);
            // Check if the link is a symlink
            const linkTarget = self._tryReadLink(linkCandidate);
            if (linkTarget && isAbsolute(linkTarget)) {
                // Absolute path, combine the link target with any remaining path segments
                // Cache the resolution to avoid the readlink call in subsequent calls
                cache.set(linkCandidate, linkTarget);
                cache.set(linkTarget, linkTarget);
                // Joining to `.` will clean up any extraneous trailing slashes
                return join(linkTarget, input.slice(linkEnd + 1), '.');
            }
            // Relative path or does not exist
            // Either way, the path before the last node_modules could itself be in a node_modules folder
            // So resolve the base path to find out what paths are relative to
            const realpathBeforeNodeModules = realNodeModulePathInternal(input.slice(0, nodeModulesIndex));
            if (linkTarget) {
                // Relative path in symbolic link. Should be resolved relative to real path of base path.
                const resolvedTarget = resolve(realpathBeforeNodeModules, input.slice(nodeModulesIndex + 1, linkStart), linkTarget);
                // Cache the result of the combined resolution to avoid the readlink call in subsequent calls
                cache.set(linkCandidate, resolvedTarget);
                cache.set(resolvedTarget, resolvedTarget);
                // Joining to `.` will clean up any extraneous trailing slashes
                return join(resolvedTarget, input.slice(linkEnd + 1), '.');
            }
            // No symlink, so just return the real path before the last node_modules combined with the
            // subsequent path segments
            // Joining to `.` will clean up any extraneous trailing slashes
            return join(realpathBeforeNodeModules, input.slice(nodeModulesIndex + 1), '.');
        }
        this.realNodeModulePath = (input) => {
            return realNodeModulePathInternal(resolve(input));
        };
    }
    /**
     * Clears the cache of resolved symlinks.
     * @public
     */
    clearCache() {
        this._cache.clear();
    }
    /**
     * Tries to read a symbolic link at the specified path.
     * If the input is not a symbolic link, returns undefined.
     * @param link - The link to try to read
     * @returns The target of the symbolic link, or undefined if the input is not a symbolic link
     */
    _tryReadLink(link) {
        const cached = this._cache.get(link);
        if (cached !== undefined) {
            return cached || undefined;
        }
        const cachedError = this._errorCache.get(link);
        if (cachedError) {
            // Fill the properties but fix the stack trace.
            throw Object.assign(new Error(cachedError.message), cachedError);
        }
        // On Windows, calling `readlink` on a directory throws an EUNKOWN, not EINVAL, so just pay the cost
        // of an lstat call.
        try {
            const stat = this._fs.lstatSync(link, this._lstatOptions);
            if (stat === null || stat === void 0 ? void 0 : stat.isSymbolicLink()) {
                // path.join(x, '.') will trim trailing slashes, if applicable
                const result = this._path.join(this._fs.readlinkSync(link, 'utf8'), '.');
                return result;
            }
            // Ensure we cache that this was not a symbolic link.
            this._cache.set(link, false);
        }
        catch (err) {
            this._errorCache.set(link, err);
        }
    }
}
exports.RealNodeModulePathResolver = RealNodeModulePathResolver;
//# sourceMappingURL=RealNodeModulePath.js.map