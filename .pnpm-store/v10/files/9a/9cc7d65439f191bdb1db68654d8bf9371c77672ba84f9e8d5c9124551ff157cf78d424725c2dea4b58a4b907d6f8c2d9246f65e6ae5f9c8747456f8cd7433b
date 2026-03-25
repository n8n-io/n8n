// @ts-check
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    parseCandidateFiles: function() {
        return parseCandidateFiles;
    },
    resolvedChangedContent: function() {
        return resolvedChangedContent;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
const _isglob = /*#__PURE__*/ _interop_require_default(require("is-glob"));
const _fastglob = /*#__PURE__*/ _interop_require_default(require("fast-glob"));
const _normalizepath = /*#__PURE__*/ _interop_require_default(require("normalize-path"));
const _parseGlob = require("../util/parseGlob");
const _sharedState = require("./sharedState");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function parseCandidateFiles(context, tailwindConfig) {
    let files = tailwindConfig.content.files;
    // Normalize the file globs
    files = files.filter((filePath)=>typeof filePath === "string");
    files = files.map(_normalizepath.default);
    // Split into included and excluded globs
    let tasks = _fastglob.default.generateTasks(files);
    /** @type {ContentPath[]} */ let included = [];
    /** @type {ContentPath[]} */ let excluded = [];
    for (const task of tasks){
        included.push(...task.positive.map((filePath)=>parseFilePath(filePath, false)));
        excluded.push(...task.negative.map((filePath)=>parseFilePath(filePath, true)));
    }
    let paths = [
        ...included,
        ...excluded
    ];
    // Resolve paths relative to the config file or cwd
    paths = resolveRelativePaths(context, paths);
    // Resolve symlinks if possible
    paths = paths.flatMap(resolvePathSymlinks);
    // Update cached patterns
    paths = paths.map(resolveGlobPattern);
    return paths;
}
/**
 *
 * @param {string} filePath
 * @param {boolean} ignore
 * @returns {ContentPath}
 */ function parseFilePath(filePath, ignore) {
    let contentPath = {
        original: filePath,
        base: filePath,
        ignore,
        pattern: filePath,
        glob: null
    };
    if ((0, _isglob.default)(filePath)) {
        Object.assign(contentPath, (0, _parseGlob.parseGlob)(filePath));
    }
    return contentPath;
}
/**
 *
 * @param {ContentPath} contentPath
 * @returns {ContentPath}
 */ function resolveGlobPattern(contentPath) {
    // This is required for Windows support to properly pick up Glob paths.
    // Afaik, this technically shouldn't be needed but there's probably
    // some internal, direct path matching with a normalized path in
    // a package which can't handle mixed directory separators
    let base = (0, _normalizepath.default)(contentPath.base);
    // If the user's file path contains any special characters (like parens) for instance fast-glob
    // is like "OOOH SHINY" and treats them as such. So we have to escape the base path to fix this
    base = _fastglob.default.escapePath(base);
    contentPath.pattern = contentPath.glob ? `${base}/${contentPath.glob}` : base;
    contentPath.pattern = contentPath.ignore ? `!${contentPath.pattern}` : contentPath.pattern;
    return contentPath;
}
/**
 * Resolve each path relative to the config file (when possible) if the experimental flag is enabled
 * Otherwise, resolve relative to the current working directory
 *
 * @param {any} context
 * @param {ContentPath[]} contentPaths
 * @returns {ContentPath[]}
 */ function resolveRelativePaths(context, contentPaths) {
    let resolveFrom = [];
    // Resolve base paths relative to the config file (when possible) if the experimental flag is enabled
    if (context.userConfigPath && context.tailwindConfig.content.relative) {
        resolveFrom = [
            _path.default.dirname(context.userConfigPath)
        ];
    }
    return contentPaths.map((contentPath)=>{
        contentPath.base = _path.default.resolve(...resolveFrom, contentPath.base);
        return contentPath;
    });
}
/**
 * Resolve the symlink for the base directory / file in each path
 * These are added as additional dependencies to watch for changes because
 * some tools (like webpack) will only watch the actual file or directory
 * but not the symlink itself even in projects that use monorepos.
 *
 * @param {ContentPath} contentPath
 * @returns {ContentPath[]}
 */ function resolvePathSymlinks(contentPath) {
    let paths = [
        contentPath
    ];
    try {
        let resolvedPath = _fs.default.realpathSync(contentPath.base);
        if (resolvedPath !== contentPath.base) {
            paths.push({
                ...contentPath,
                base: resolvedPath
            });
        }
    } catch  {
    // TODO: log this?
    }
    return paths;
}
function resolvedChangedContent(context, candidateFiles, fileModifiedMap) {
    let changedContent = context.tailwindConfig.content.files.filter((item)=>typeof item.raw === "string").map(({ raw , extension ="html"  })=>({
            content: raw,
            extension
        }));
    let [changedFiles, mTimesToCommit] = resolveChangedFiles(candidateFiles, fileModifiedMap);
    for (let changedFile of changedFiles){
        let extension = _path.default.extname(changedFile).slice(1);
        changedContent.push({
            file: changedFile,
            extension
        });
    }
    return [
        changedContent,
        mTimesToCommit
    ];
}
/**
 *
 * @param {ContentPath[]} candidateFiles
 * @param {Map<string, number>} fileModifiedMap
 * @returns {[Set<string>, Map<string, number>]}
 */ function resolveChangedFiles(candidateFiles, fileModifiedMap) {
    let paths = candidateFiles.map((contentPath)=>contentPath.pattern);
    let mTimesToCommit = new Map();
    let changedFiles = new Set();
    _sharedState.env.DEBUG && console.time("Finding changed files");
    let files = _fastglob.default.sync(paths, {
        absolute: true
    });
    for (let file of files){
        let prevModified = fileModifiedMap.get(file) || -Infinity;
        let modified = _fs.default.statSync(file).mtimeMs;
        if (modified > prevModified) {
            changedFiles.add(file);
            mTimesToCommit.set(file, modified);
        }
    }
    _sharedState.env.DEBUG && console.timeEnd("Finding changed files");
    return [
        changedFiles,
        mTimesToCommit
    ];
}
