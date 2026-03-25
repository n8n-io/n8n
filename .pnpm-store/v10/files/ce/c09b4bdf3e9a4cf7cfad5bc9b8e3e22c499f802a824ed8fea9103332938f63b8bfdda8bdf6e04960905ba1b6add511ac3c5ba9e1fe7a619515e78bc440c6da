"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLanguageServicePlugin = createLanguageServicePlugin;
const proxyLanguageService_1 = require("../node/proxyLanguageService");
const languageServicePluginCommon_1 = require("./languageServicePluginCommon");
/**
 * Creates and returns a TS Service Plugin using Volar primitives.
 *
 * See https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin for
 * more information.
 */
function createLanguageServicePlugin(createPluginCallback) {
    return modules => {
        const { typescript: ts } = modules;
        const pluginModule = {
            create(info) {
                if (!(0, languageServicePluginCommon_1.isHasAlreadyDecoratedLanguageService)(info)) {
                    const createPluginResult = createPluginCallback(ts, info);
                    const extensions = createPluginResult.languagePlugins
                        .map(plugin => plugin.typescript?.extraFileExtensions.map(ext => '.' + ext.extension) ?? [])
                        .flat();
                    // TODO: this logic does not seem to appear in the async variant
                    // (createAsyncLanguageServicePlugin)... bug?
                    languageServicePluginCommon_1.projectExternalFileExtensions.set(info.project, extensions);
                    const { proxy, initialize } = (0, proxyLanguageService_1.createProxyLanguageService)(info.languageService);
                    info.languageService = proxy;
                    (0, languageServicePluginCommon_1.createLanguageCommon)(createPluginResult, ts, info, initialize);
                }
                return info.languageService;
            },
            getExternalFiles: (0, languageServicePluginCommon_1.makeGetExternalFiles)(ts),
        };
        return pluginModule;
    };
}
//# sourceMappingURL=createLanguageServicePlugin.js.map