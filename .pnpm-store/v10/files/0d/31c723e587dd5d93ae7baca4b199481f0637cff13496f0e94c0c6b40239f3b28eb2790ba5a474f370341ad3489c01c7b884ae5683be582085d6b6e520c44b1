"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const normalizePath = require("normalize-path");
const path_1 = require("path");
const utils_1 = require("../utils");
function replaceBaseUrlImport({ orig, file, config }) {
    var _a, _b;
    const requiredModule = (_b = (_a = orig.match((0, utils_1.newStringRegex)())) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.path;
    config.output.debug('base-url replacer - requiredModule: ', requiredModule);
    config.output.assert(typeof requiredModule == 'string', `Unexpected import statement pattern ${orig}`);
    if (requiredModule.startsWith('.')) {
        config.output.debug('base-url replacer - already resolved');
        return orig;
    }
    if (config.pathCache.existsResolvedAlias(`${config.outPath}/${requiredModule}`)) {
        let relativePath = normalizePath((0, path_1.relative)((0, path_1.dirname)(file), config.pathCache
            .getAbsoluteAliasPath(config.outPath, '')
            .replace('---', '')));
        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }
        config.output.debug('base-url replacer - relativePath: ', relativePath);
        const index = orig.indexOf(requiredModule);
        const newImportScript = orig.substring(0, index) + relativePath + '/' + orig.substring(index);
        config.output.debug('base-url replacer - newImportScript: ', newImportScript);
        const modulePath = newImportScript.match((0, utils_1.newStringRegex)()).groups.path;
        config.output.debug('base-url replacer - modulePath: ', modulePath);
        return newImportScript.replace(modulePath, normalizePath(modulePath));
    }
    return orig;
}
exports.default = replaceBaseUrlImport;
//# sourceMappingURL=base-url.replacer.js.map