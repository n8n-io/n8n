"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const normalizePath = require("normalize-path");
const path_1 = require("path");
const utils_1 = require("../utils");
function escapeSpecialChars(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
function getAliasPrefixRegExp(alias) {
    return new RegExp(`(?:^${escapeSpecialChars(alias.prefix)})|(?:\\.(js|ts|json)$)`, 'g');
}
function removeAliasPrefix(requiredModule, alias) {
    return requiredModule.replace(getAliasPrefixRegExp(alias), '');
}
function replaceImportStatement({ orig, file, config }) {
    var _a, _b;
    const requiredModule = (_b = (_a = orig.match((0, utils_1.newStringRegex)())) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.path;
    config.output.debug('default replacer - requiredModule: ', requiredModule);
    config.output.assert(typeof requiredModule == 'string', `Unexpected import statement pattern ${orig}`);
    const alias = config.aliasTrie.search(requiredModule);
    config.output.debug('default replacer - alias: ', alias);
    if (!alias)
        return orig;
    const isAlias = alias.shouldPrefixMatchWildly
        ?
            requiredModule.startsWith(alias.prefix) && requiredModule !== alias.prefix
        :
            requiredModule === alias.prefix ||
                requiredModule.startsWith(alias.prefix + '/');
    if (isAlias) {
        for (let i = 0; i < alias.paths.length; i++) {
            let absoluteAliasPath = config.pathCache.getAbsoluteAliasPath(alias.paths[i].basePath, alias.paths[i].path);
            config.output.debug('default replacer - absoluteAliasPath: ', absoluteAliasPath);
            if (absoluteAliasPath.startsWith('---')) {
                if (i === alias.paths.length - 1) {
                    absoluteAliasPath = absoluteAliasPath.replace('---', '');
                }
                else {
                    continue;
                }
            }
            if (!config.pathCache.existsResolvedAlias(alias.prefix.length == requiredModule.length
                ? normalizePath(absoluteAliasPath)
                : normalizePath(`${absoluteAliasPath}/${removeAliasPrefix(requiredModule, alias)}`))) {
                config.output.debug('default replacer - Invalid path');
                continue;
            }
            let relativeAliasPath = normalizePath((0, path_1.relative)((0, path_1.dirname)(file), absoluteAliasPath));
            if (!relativeAliasPath.startsWith('.')) {
                relativeAliasPath = './' + relativeAliasPath;
            }
            config.output.debug('default replacer - relativeAliasPath: ', relativeAliasPath);
            const index = orig.indexOf(alias.prefix);
            const newImportScript = orig.substring(0, index) +
                relativeAliasPath +
                '/' +
                orig.substring(index + alias.prefix.length);
            config.output.debug('default replacer - newImportScript: ', newImportScript);
            const modulePath = newImportScript.match((0, utils_1.newStringRegex)()).groups.path;
            config.output.debug('default replacer - modulePath: ', modulePath);
            return newImportScript.replace(modulePath, normalizePath(modulePath));
        }
    }
    return orig;
}
exports.default = replaceImportStatement;
//# sourceMappingURL=default.replacer.js.map