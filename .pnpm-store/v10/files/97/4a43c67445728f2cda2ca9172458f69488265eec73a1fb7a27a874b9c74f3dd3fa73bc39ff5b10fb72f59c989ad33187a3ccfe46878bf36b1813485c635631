"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installCommonjsResolveHooksIfNecessary = void 0;
/**
 * @internal
 */
function installCommonjsResolveHooksIfNecessary(tsNodeService) {
    const Module = require('module');
    const originalResolveFilename = Module._resolveFilename;
    const originalFindPath = Module._findPath;
    const shouldInstallHook = tsNodeService.options.experimentalResolver;
    if (shouldInstallHook) {
        const { Module_findPath, Module_resolveFilename } = tsNodeService.getNodeCjsLoader();
        Module._resolveFilename = _resolveFilename;
        Module._findPath = _findPath;
        function _resolveFilename(request, parent, isMain, options, ...rest) {
            if (!tsNodeService.enabled())
                return originalResolveFilename.call(this, request, parent, isMain, options, ...rest);
            return Module_resolveFilename.call(this, request, parent, isMain, options, ...rest);
        }
        function _findPath() {
            if (!tsNodeService.enabled())
                return originalFindPath.apply(this, arguments);
            return Module_findPath.apply(this, arguments);
        }
    }
}
exports.installCommonjsResolveHooksIfNecessary = installCommonjsResolveHooksIfNecessary;
//# sourceMappingURL=cjs-resolve-hooks.js.map