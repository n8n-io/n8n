"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeGetExternalFiles = exports.decoratedLanguageServiceHosts = exports.decoratedLanguageServices = exports.projectExternalFileExtensions = exports.externalFiles = void 0;
exports.makeGetScriptInfoWithLargeFileFailsafe = makeGetScriptInfoWithLargeFileFailsafe;
exports.createLanguageCommon = createLanguageCommon;
exports.isHasAlreadyDecoratedLanguageService = isHasAlreadyDecoratedLanguageService;
const language_core_1 = require("@volar/language-core");
const common_1 = require("../common");
const decorateLanguageServiceHost_1 = require("../node/decorateLanguageServiceHost");
exports.externalFiles = new WeakMap();
exports.projectExternalFileExtensions = new WeakMap();
exports.decoratedLanguageServices = new WeakSet();
exports.decoratedLanguageServiceHosts = new WeakSet();
/**
 * Wrap `getScriptInfo` to handle large files that may crash the language service.
 *
 * Introduced to fix issues with converting `relatedInformation` (in Diagnostics)
 * when working with large files.
 *
 * https://github.com/volarjs/volar.js/commit/e242709a91e9d2919dc4fa59278dd266fd11e7a3
 */
function makeGetScriptInfoWithLargeFileFailsafe(info) {
    return (fileName) => {
        // getSnapshot could be crashed if the file is too large
        try {
            return info.project.getScriptInfo(fileName);
        }
        catch { }
    };
}
function createLanguageCommon(createPluginResult, ts, info, initializeProxiedLanguageService) {
    const getScriptSnapshot = info.languageServiceHost.getScriptSnapshot.bind(info.languageServiceHost);
    const getScriptInfo = makeGetScriptInfoWithLargeFileFailsafe(info);
    const language = (0, language_core_1.createLanguage)([
        ...createPluginResult.languagePlugins,
        { getLanguageId: common_1.resolveFileLanguageId },
    ], new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames), (fileName, _, shouldRegister) => {
        let snapshot;
        if (shouldRegister) {
            // We need to trigger registration of the script file with the project, see #250
            snapshot = getScriptSnapshot(fileName);
        }
        else {
            snapshot = getScriptInfo(fileName)?.getSnapshot();
            if (!snapshot) {
                // trigger projectService.getOrCreateScriptInfoNotOpenedByClient
                info.project.getScriptVersion(fileName);
                snapshot = getScriptInfo(fileName)?.getSnapshot();
            }
        }
        if (snapshot) {
            language.scripts.set(fileName, snapshot);
        }
        else {
            language.scripts.delete(fileName);
        }
    }, targetFileName => {
        // https://github.com/JetBrains/intellij-plugins/blob/6435723ad88fa296b41144162ebe3b8513f4949b/Angular/src-js/angular-service/src/ngCommands.ts#L88
        info.session.change({
            file: targetFileName,
            line: 1,
            offset: 1,
            endLine: 1,
            endOffset: 1,
            insertString: '',
        });
    });
    initializeProxiedLanguageService(language);
    (0, decorateLanguageServiceHost_1.decorateLanguageServiceHost)(ts, language, info.languageServiceHost);
    createPluginResult.setup?.(language);
}
const makeGetExternalFiles = (ts) => (project, updateLevel = 0) => {
    if (updateLevel >= 1
        || !exports.externalFiles.has(project)) {
        const oldFiles = exports.externalFiles.get(project);
        const extensions = exports.projectExternalFileExtensions.get(project);
        const newFiles = extensions?.length ? (0, decorateLanguageServiceHost_1.searchExternalFiles)(ts, project, extensions) : [];
        exports.externalFiles.set(project, newFiles);
        if (oldFiles && !arrayItemsEqual(oldFiles, newFiles)) {
            project.refreshDiagnostics();
        }
    }
    return exports.externalFiles.get(project);
};
exports.makeGetExternalFiles = makeGetExternalFiles;
function arrayItemsEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    const set = new Set(a);
    for (const file of b) {
        if (!set.has(file)) {
            return false;
        }
    }
    return true;
}
function isHasAlreadyDecoratedLanguageService(info) {
    if (exports.decoratedLanguageServices.has(info.languageService)
        || exports.decoratedLanguageServiceHosts.has(info.languageServiceHost)) {
        return true;
    }
    else {
        exports.decoratedLanguageServices.add(info.languageService);
        exports.decoratedLanguageServiceHosts.add(info.languageServiceHost);
        return false;
    }
}
//# sourceMappingURL=languageServicePluginCommon.js.map