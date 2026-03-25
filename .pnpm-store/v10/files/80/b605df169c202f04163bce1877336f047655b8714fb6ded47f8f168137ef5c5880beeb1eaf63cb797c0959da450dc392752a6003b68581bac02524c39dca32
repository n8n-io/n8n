"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorateLanguageServiceHost = decorateLanguageServiceHost;
exports.searchExternalFiles = searchExternalFiles;
const resolveModuleName_1 = require("../resolveModuleName");
function decorateLanguageServiceHost(ts, language, languageServiceHost) {
    const pluginExtensions = language.plugins
        .map(plugin => plugin.typescript?.extraFileExtensions.map(ext => '.' + ext.extension) ?? [])
        .flat();
    const scripts = new Map();
    const crashFileNames = new Set();
    const readDirectory = languageServiceHost.readDirectory?.bind(languageServiceHost);
    const resolveModuleNameLiterals = languageServiceHost.resolveModuleNameLiterals?.bind(languageServiceHost);
    const resolveModuleNames = languageServiceHost.resolveModuleNames?.bind(languageServiceHost);
    const getScriptSnapshot = languageServiceHost.getScriptSnapshot.bind(languageServiceHost);
    const getScriptKind = languageServiceHost.getScriptKind?.bind(languageServiceHost);
    // path completion
    if (readDirectory) {
        languageServiceHost.readDirectory = (path, extensions, exclude, include, depth) => {
            if (extensions) {
                for (const ext of pluginExtensions) {
                    if (!extensions.includes(ext)) {
                        extensions = [...extensions, ext];
                    }
                }
            }
            return readDirectory(path, extensions, exclude, include, depth);
        };
    }
    if (pluginExtensions.length) {
        const resolveModuleName = (0, resolveModuleName_1.createResolveModuleName)(ts, ts.sys.getFileSize, languageServiceHost, language.plugins, fileName => language.scripts.get(fileName));
        const getCanonicalFileName = languageServiceHost.useCaseSensitiveFileNames?.()
            ? (fileName) => fileName
            : (fileName) => fileName.toLowerCase();
        const moduleResolutionCache = ts.createModuleResolutionCache(languageServiceHost.getCurrentDirectory(), getCanonicalFileName, languageServiceHost.getCompilationSettings());
        if (resolveModuleNameLiterals) {
            languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, containingFile, redirectedReference, options, ...rest) => {
                if (moduleLiterals.every(name => !pluginExtensions.some(ext => name.text.endsWith(ext)))) {
                    return resolveModuleNameLiterals(moduleLiterals, containingFile, redirectedReference, options, ...rest);
                }
                return moduleLiterals.map(moduleLiteral => {
                    return resolveModuleName(moduleLiteral.text, containingFile, options, moduleResolutionCache, redirectedReference);
                });
            };
        }
        if (resolveModuleNames) {
            languageServiceHost.resolveModuleNames = (moduleNames, containingFile, reusedNames, redirectedReference, options, containingSourceFile) => {
                if (moduleNames.every(name => !pluginExtensions.some(ext => name.endsWith(ext)))) {
                    return resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference, options, containingSourceFile);
                }
                return moduleNames.map(moduleName => {
                    return resolveModuleName(moduleName, containingFile, options, moduleResolutionCache, redirectedReference).resolvedModule;
                });
            };
        }
    }
    languageServiceHost.getScriptSnapshot = fileName => {
        const virtualScript = updateVirtualScript(fileName, true);
        if (virtualScript) {
            return virtualScript.snapshot;
        }
        return getScriptSnapshot(fileName);
    };
    if (getScriptKind) {
        languageServiceHost.getScriptKind = fileName => {
            const virtualScript = updateVirtualScript(fileName, false);
            if (virtualScript) {
                return virtualScript.scriptKind;
            }
            return getScriptKind(fileName);
        };
    }
    function updateVirtualScript(fileName, shouldRegister) {
        if (crashFileNames.has(fileName)) {
            return;
        }
        let version;
        try {
            version = languageServiceHost.getScriptVersion(fileName);
        }
        catch {
            // fix https://github.com/vuejs/language-tools/issues/4278
            crashFileNames.add(fileName);
        }
        if (version === undefined) {
            // somehow getScriptVersion returns undefined
            return;
        }
        let script = scripts.get(fileName);
        if (!script || script[0] !== version) {
            script = [version];
            const sourceScript = language.scripts.get(fileName, undefined, shouldRegister);
            if (sourceScript?.generated) {
                const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
                if (serviceScript) {
                    if (serviceScript.preventLeadingOffset) {
                        script[1] = {
                            extension: serviceScript.extension,
                            scriptKind: serviceScript.scriptKind,
                            snapshot: serviceScript.code.snapshot,
                        };
                    }
                    else {
                        const sourceContents = sourceScript.snapshot.getText(0, sourceScript.snapshot.getLength());
                        const virtualContents = sourceContents.split('\n').map(line => ' '.repeat(line.length)).join('\n')
                            + serviceScript.code.snapshot.getText(0, serviceScript.code.snapshot.getLength());
                        script[1] = {
                            extension: serviceScript.extension,
                            scriptKind: serviceScript.scriptKind,
                            snapshot: ts.ScriptSnapshot.fromString(virtualContents),
                        };
                    }
                }
                if (sourceScript.generated.languagePlugin.typescript?.getExtraServiceScripts) {
                    console.warn('getExtraServiceScripts() is not available in TS plugin.');
                }
            }
            scripts.set(fileName, script);
        }
        return script[1];
    }
}
function searchExternalFiles(ts, project, exts) {
    if (project.projectKind !== ts.server.ProjectKind.Configured) {
        return [];
    }
    const configFile = project.getProjectName();
    const config = ts.readJsonConfigFile(configFile, project.readFile.bind(project));
    const parseHost = {
        useCaseSensitiveFileNames: project.useCaseSensitiveFileNames(),
        fileExists: project.fileExists.bind(project),
        readFile: project.readFile.bind(project),
        readDirectory: (...args) => {
            args[1] = exts;
            return project.readDirectory(...args);
        },
    };
    const parsed = ts.parseJsonSourceFileConfigFileContent(config, parseHost, project.getCurrentDirectory());
    return parsed.fileNames;
}
//# sourceMappingURL=decorateLanguageServiceHost.js.map