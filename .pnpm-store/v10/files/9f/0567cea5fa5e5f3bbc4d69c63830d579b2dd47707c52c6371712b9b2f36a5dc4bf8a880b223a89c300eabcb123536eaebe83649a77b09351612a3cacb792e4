"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathCache = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class PathCache {
    constructor(useCache, fileExtensions) {
        this.fileExtensions = fileExtensions || [
            'js',
            'json',
            'jsx',
            'cjs',
            'mjs',
            'd.ts',
            'd.tsx',
            'd.cts',
            'd.mts'
        ];
        this.useCache = useCache;
        if (useCache) {
            this.existsCache = new Map();
            this.absoluteCache = new Map();
        }
    }
    existsResolvedAlias(path) {
        if (!this.useCache)
            return this.exists(path);
        if (this.existsCache.has(path)) {
            return this.existsCache.get(path);
        }
        else {
            const result = this.exists(path);
            this.existsCache.set(path, result);
            return result;
        }
    }
    getAbsoluteAliasPath(basePath, aliasPath) {
        const request = { basePath, aliasPath };
        if (!this.useCache)
            return this.getAAP(request);
        if (this.absoluteCache.has(this.getCacheKey(request))) {
            return this.absoluteCache.get(this.getCacheKey(request));
        }
        else {
            const result = this.getAAP(request);
            this.absoluteCache.set(this.getCacheKey(request), result);
            return result;
        }
    }
    getCacheKey({ basePath, aliasPath }) {
        return `${basePath}___${aliasPath}`;
    }
    getAAP({ basePath, aliasPath }) {
        const aliasPathParts = aliasPath
            .split('/')
            .filter((part) => !part.match(/^\.$|^\s*$/));
        let aliasPathPart = aliasPathParts.shift() || '';
        let pathExists = false;
        while (!(pathExists = this.exists((0, path_1.join)(basePath, aliasPathPart))) &&
            aliasPathParts.length) {
            aliasPathPart = aliasPathParts.shift();
        }
        if (pathExists) {
            return (0, path_1.join)(basePath, aliasPathPart, aliasPathParts.join('/'));
        }
        return '---' + (0, path_1.join)(basePath, aliasPathParts.join('/'));
    }
    exists(path) {
        return ((0, fs_1.existsSync)(path) ||
            this.fileExtensions.some((extension) => (0, fs_1.existsSync)(`${path}.${extension}`)));
    }
}
exports.PathCache = PathCache;
//# sourceMappingURL=path-cache.js.map