// @ts-check
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, // DISABLE_TOUCH = TRUE
// Retrieve an existing context from cache if possible (since contexts are unique per
// source path), or set up a new one (including setting up watchers and registering
// plugins) then return it
"default", {
    enumerable: true,
    get: function() {
        return setupTrackingContext;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _quicklru = /*#__PURE__*/ _interop_require_default(require("@alloc/quick-lru"));
const _hashConfig = /*#__PURE__*/ _interop_require_default(require("../util/hashConfig"));
const _resolveconfig = /*#__PURE__*/ _interop_require_default(require("../public/resolve-config"));
const _resolveConfigPath = /*#__PURE__*/ _interop_require_default(require("../util/resolveConfigPath"));
const _setupContextUtils = require("./setupContextUtils");
const _parseDependency = /*#__PURE__*/ _interop_require_default(require("../util/parseDependency"));
const _validateConfig = require("../util/validateConfig.js");
const _content = require("./content.js");
const _loadconfig = require("../lib/load-config");
const _getModuleDependencies = /*#__PURE__*/ _interop_require_default(require("./getModuleDependencies"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let configPathCache = new _quicklru.default({
    maxSize: 100
});
let candidateFilesCache = new WeakMap();
function getCandidateFiles(context, tailwindConfig) {
    if (candidateFilesCache.has(context)) {
        return candidateFilesCache.get(context);
    }
    let candidateFiles = (0, _content.parseCandidateFiles)(context, tailwindConfig);
    return candidateFilesCache.set(context, candidateFiles).get(context);
}
// Get the config object based on a path
function getTailwindConfig(configOrPath) {
    let userConfigPath = (0, _resolveConfigPath.default)(configOrPath);
    if (userConfigPath !== null) {
        let [prevConfig, prevConfigHash, prevDeps, prevModified] = configPathCache.get(userConfigPath) || [];
        let newDeps = (0, _getModuleDependencies.default)(userConfigPath);
        let modified = false;
        let newModified = new Map();
        for (let file of newDeps){
            let time = _fs.default.statSync(file).mtimeMs;
            newModified.set(file, time);
            if (!prevModified || !prevModified.has(file) || time > prevModified.get(file)) {
                modified = true;
            }
        }
        // It hasn't changed (based on timestamps)
        if (!modified) {
            return [
                prevConfig,
                userConfigPath,
                prevConfigHash,
                prevDeps
            ];
        }
        // It has changed (based on timestamps), or first run
        for (let file of newDeps){
            // When loaded transitively through a TypeScript file `require.cache`
            // may be undefined. Happens in Node 22.18+.
            if (!require.cache) continue;
            delete require.cache[file];
        }
        let newConfig = (0, _validateConfig.validateConfig)((0, _resolveconfig.default)((0, _loadconfig.loadConfig)(userConfigPath)));
        let newHash = (0, _hashConfig.default)(newConfig);
        configPathCache.set(userConfigPath, [
            newConfig,
            newHash,
            newDeps,
            newModified
        ]);
        return [
            newConfig,
            userConfigPath,
            newHash,
            newDeps
        ];
    }
    var _configOrPath_config, _ref;
    // It's a plain object, not a path
    let newConfig = (0, _resolveconfig.default)((_ref = (_configOrPath_config = configOrPath === null || configOrPath === void 0 ? void 0 : configOrPath.config) !== null && _configOrPath_config !== void 0 ? _configOrPath_config : configOrPath) !== null && _ref !== void 0 ? _ref : {});
    newConfig = (0, _validateConfig.validateConfig)(newConfig);
    return [
        newConfig,
        null,
        (0, _hashConfig.default)(newConfig),
        []
    ];
}
function setupTrackingContext(configOrPath) {
    return ({ tailwindDirectives , registerDependency  })=>{
        return (root, result)=>{
            let [tailwindConfig, userConfigPath, tailwindConfigHash, configDependencies] = getTailwindConfig(configOrPath);
            let contextDependencies = new Set(configDependencies);
            // If there are no @tailwind or @apply rules, we don't consider this CSS
            // file or its dependencies to be dependencies of the context. Can reuse
            // the context even if they change. We may want to think about `@layer`
            // being part of this trigger too, but it's tough because it's impossible
            // for a layer in one file to end up in the actual @tailwind rule in
            // another file since independent sources are effectively isolated.
            if (tailwindDirectives.size > 0) {
                // Add current css file as a context dependencies.
                contextDependencies.add(result.opts.from);
                // Add all css @import dependencies as context dependencies.
                for (let message of result.messages){
                    if (message.type === "dependency") {
                        contextDependencies.add(message.file);
                    }
                }
            }
            let [context, , mTimesToCommit] = (0, _setupContextUtils.getContext)(root, result, tailwindConfig, userConfigPath, tailwindConfigHash, contextDependencies);
            let fileModifiedMap = (0, _setupContextUtils.getFileModifiedMap)(context);
            let candidateFiles = getCandidateFiles(context, tailwindConfig);
            // If there are no @tailwind or @apply rules, we don't consider this CSS file or it's
            // dependencies to be dependencies of the context. Can reuse the context even if they change.
            // We may want to think about `@layer` being part of this trigger too, but it's tough
            // because it's impossible for a layer in one file to end up in the actual @tailwind rule
            // in another file since independent sources are effectively isolated.
            if (tailwindDirectives.size > 0) {
                // Add template paths as postcss dependencies.
                for (let contentPath of candidateFiles){
                    for (let dependency of (0, _parseDependency.default)(contentPath)){
                        registerDependency(dependency);
                    }
                }
                let [changedContent, contentMTimesToCommit] = (0, _content.resolvedChangedContent)(context, candidateFiles, fileModifiedMap);
                for (let content of changedContent){
                    context.changedContent.push(content);
                }
                // Add the mtimes of the content files to the commit list
                // We can overwrite the existing values because unconditionally
                // This is because:
                // 1. Most of the files here won't be in the map yet
                // 2. If they are that means it's a context dependency
                // and we're reading this after the context. This means
                // that the mtime we just read is strictly >= the context
                // mtime. Unless the user / os is doing something weird
                // in which the mtime would be going backwards. If that
                // happens there's already going to be problems.
                for (let [path, mtime] of contentMTimesToCommit.entries()){
                    mTimesToCommit.set(path, mtime);
                }
            }
            for (let file of configDependencies){
                registerDependency({
                    type: "dependency",
                    file
                });
            }
            // "commit" the new modified time for all context deps
            // We do this here because we want content tracking to
            // read the "old" mtime even when it's a context dependency.
            for (let [path, mtime] of mTimesToCommit.entries()){
                fileModifiedMap.set(path, mtime);
            }
            return context;
        };
    };
}
