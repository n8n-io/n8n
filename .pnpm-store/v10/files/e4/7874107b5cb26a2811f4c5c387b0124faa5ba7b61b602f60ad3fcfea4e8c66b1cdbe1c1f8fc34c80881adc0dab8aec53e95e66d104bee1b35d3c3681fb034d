"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLanguageServiceHost = createLanguageServiceHost;
const language_core_1 = require("@volar/language-core");
const path = require("path-browserify");
const resolveModuleName_1 = require("../resolveModuleName");
function createLanguageServiceHost(ts, sys, language, asScriptId, projectHost) {
    const scriptVersions = new language_core_1.FileMap(sys.useCaseSensitiveFileNames);
    let lastProjectVersion;
    let tsProjectVersion = 0;
    let tsFileRegistry = new language_core_1.FileMap(sys.useCaseSensitiveFileNames);
    let tsFileDirRegistry = new language_core_1.FileMap(sys.useCaseSensitiveFileNames);
    let extraScriptRegistry = new language_core_1.FileMap(sys.useCaseSensitiveFileNames);
    let lastTsVirtualFileSnapshots = new Set();
    let lastOtherVirtualFileSnapshots = new Set();
    let languageServiceHost = {
        ...sys,
        getCurrentDirectory() {
            return projectHost.getCurrentDirectory();
        },
        useCaseSensitiveFileNames() {
            return sys.useCaseSensitiveFileNames;
        },
        getNewLine() {
            return sys.newLine;
        },
        getTypeRootsVersion: () => {
            return 'version' in sys ? sys.version : -1; // TODO: only update for /node_modules changes?
        },
        getDirectories(dirName) {
            return sys.getDirectories(dirName);
        },
        readDirectory(dirName, extensions, excludes, includes, depth) {
            const exts = new Set(extensions);
            for (const languagePlugin of language.plugins) {
                for (const ext of languagePlugin.typescript?.extraFileExtensions ?? []) {
                    exts.add('.' + ext.extension);
                }
            }
            extensions = [...exts];
            return sys.readDirectory(dirName, extensions, excludes, includes, depth);
        },
        getCompilationSettings() {
            const options = projectHost.getCompilationSettings();
            if (language.plugins.some(language => language.typescript?.extraFileExtensions.length)) {
                options.allowNonTsExtensions ??= true;
                if (!options.allowNonTsExtensions) {
                    console.warn('`allowNonTsExtensions` must be `true`.');
                }
            }
            return options;
        },
        getLocalizedDiagnosticMessages: projectHost.getLocalizedDiagnosticMessages,
        getProjectReferences: projectHost.getProjectReferences,
        getDefaultLibFileName: options => {
            try {
                return ts.getDefaultLibFilePath(options);
            }
            catch {
                // web
                return `/node_modules/typescript/lib/${ts.getDefaultLibFileName(options)}`;
            }
        },
        readFile(fileName) {
            const snapshot = getScriptSnapshot(fileName);
            if (snapshot) {
                return snapshot.getText(0, snapshot.getLength());
            }
        },
        directoryExists(directoryName) {
            sync();
            if (tsFileDirRegistry.has(directoryName)) {
                return true;
            }
            return sys.directoryExists(directoryName);
        },
        fileExists(fileName) {
            return getScriptVersion(fileName) !== '';
        },
        getProjectVersion() {
            sync();
            return tsProjectVersion + ('version' in sys ? `:${sys.version}` : '');
        },
        getScriptFileNames() {
            sync();
            return [...tsFileRegistry.keys()];
        },
        getScriptKind(fileName) {
            sync();
            if (extraScriptRegistry.has(fileName)) {
                return extraScriptRegistry.get(fileName).scriptKind;
            }
            const sourceScript = language.scripts.get(asScriptId(fileName));
            if (sourceScript?.generated) {
                const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
                if (serviceScript) {
                    return serviceScript.scriptKind;
                }
            }
            switch (path.extname(fileName)) {
                case '.js':
                case '.cjs':
                case '.mjs':
                    return ts.ScriptKind.JS;
                case '.jsx':
                    return ts.ScriptKind.JSX;
                case '.ts':
                case '.cts':
                case '.mts':
                    return ts.ScriptKind.TS;
                case '.tsx':
                    return ts.ScriptKind.TSX;
                case '.json':
                    return ts.ScriptKind.JSON;
                default:
                    return ts.ScriptKind.Unknown;
            }
        },
        getScriptVersion,
        getScriptSnapshot,
    };
    for (const plugin of language.plugins) {
        if (plugin.typescript?.resolveLanguageServiceHost) {
            languageServiceHost = plugin.typescript.resolveLanguageServiceHost(languageServiceHost);
        }
    }
    if (language.plugins.some(plugin => plugin.typescript?.extraFileExtensions.length)) {
        // TODO: can this share between monorepo packages?
        const moduleCache = ts.createModuleResolutionCache(languageServiceHost.getCurrentDirectory(), languageServiceHost.useCaseSensitiveFileNames?.() ? s => s : s => s.toLowerCase(), languageServiceHost.getCompilationSettings());
        const resolveModuleName = (0, resolveModuleName_1.createResolveModuleName)(ts, sys.getFileSize, languageServiceHost, language.plugins, fileName => language.scripts.get(asScriptId(fileName)));
        let lastSysVersion = 'version' in sys ? sys.version : undefined;
        languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, containingFile, redirectedReference, options, sourceFile) => {
            if ('version' in sys && lastSysVersion !== sys.version) {
                lastSysVersion = sys.version;
                moduleCache.clear();
            }
            return moduleLiterals.map(moduleLiteral => {
                return resolveModuleName(moduleLiteral.text, containingFile, options, moduleCache, redirectedReference, sourceFile.impliedNodeFormat);
            });
        };
        languageServiceHost.resolveModuleNames = (moduleNames, containingFile, _reusedNames, redirectedReference, options) => {
            if ('version' in sys && lastSysVersion !== sys.version) {
                lastSysVersion = sys.version;
                moduleCache.clear();
            }
            return moduleNames.map(moduleName => {
                return resolveModuleName(moduleName, containingFile, options, moduleCache, redirectedReference).resolvedModule;
            });
        };
        languageServiceHost.getModuleResolutionCache = () => moduleCache;
    }
    return {
        languageServiceHost,
        getExtraServiceScript,
    };
    function getExtraServiceScript(fileName) {
        sync();
        return extraScriptRegistry.get(fileName);
    }
    function sync() {
        const newProjectVersion = projectHost.getProjectVersion?.();
        const shouldUpdate = newProjectVersion === undefined || newProjectVersion !== lastProjectVersion;
        if (!shouldUpdate) {
            return;
        }
        lastProjectVersion = newProjectVersion;
        extraScriptRegistry.clear();
        const newTsVirtualFileSnapshots = new Set();
        const newOtherVirtualFileSnapshots = new Set();
        const tsFileNamesSet = new Set();
        for (const fileName of projectHost.getScriptFileNames()) {
            const sourceScript = language.scripts.get(asScriptId(fileName));
            if (sourceScript?.generated) {
                const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
                if (serviceScript) {
                    newTsVirtualFileSnapshots.add(serviceScript.code.snapshot);
                    tsFileNamesSet.add(fileName);
                }
                for (const extraServiceScript of sourceScript.generated.languagePlugin.typescript?.getExtraServiceScripts?.(fileName, sourceScript.generated.root) ?? []) {
                    newTsVirtualFileSnapshots.add(extraServiceScript.code.snapshot);
                    tsFileNamesSet.add(extraServiceScript.fileName);
                    extraScriptRegistry.set(extraServiceScript.fileName, extraServiceScript);
                }
                for (const code of (0, language_core_1.forEachEmbeddedCode)(sourceScript.generated.root)) {
                    newOtherVirtualFileSnapshots.add(code.snapshot);
                }
            }
            else {
                tsFileNamesSet.add(fileName);
            }
        }
        if (!setEquals(lastTsVirtualFileSnapshots, newTsVirtualFileSnapshots)) {
            tsProjectVersion++;
        }
        else if (setEquals(lastOtherVirtualFileSnapshots, newOtherVirtualFileSnapshots)) {
            // no any meta language files update, it mean project version was update by source files this time
            tsProjectVersion++;
        }
        lastTsVirtualFileSnapshots = newTsVirtualFileSnapshots;
        lastOtherVirtualFileSnapshots = newOtherVirtualFileSnapshots;
        tsFileRegistry.clear();
        tsFileDirRegistry.clear();
        for (const fileName of tsFileNamesSet) {
            tsFileRegistry.set(fileName, true);
            const parts = fileName.split('/');
            for (let i = 1; i < parts.length; i++) {
                const dirName = parts.slice(0, i).join('/');
                tsFileDirRegistry.set(dirName, true);
            }
        }
    }
    function getScriptSnapshot(fileName) {
        sync();
        if (extraScriptRegistry.has(fileName)) {
            return extraScriptRegistry.get(fileName).code.snapshot;
        }
        const sourceScript = language.scripts.get(asScriptId(fileName));
        if (sourceScript?.generated) {
            const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
            if (serviceScript) {
                return serviceScript.code.snapshot;
            }
        }
        else if (sourceScript) {
            return sourceScript.snapshot;
        }
    }
    function getScriptVersion(fileName) {
        sync();
        if (!scriptVersions.has(fileName)) {
            scriptVersions.set(fileName, { lastVersion: 0, map: new WeakMap() });
        }
        const version = scriptVersions.get(fileName);
        if (extraScriptRegistry.has(fileName)) {
            const snapshot = extraScriptRegistry.get(fileName).code.snapshot;
            if (!version.map.has(snapshot)) {
                version.map.set(snapshot, version.lastVersion++);
            }
            return version.map.get(snapshot).toString();
        }
        const sourceScript = language.scripts.get(asScriptId(fileName));
        if (sourceScript?.generated) {
            const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
            if (serviceScript) {
                if (!version.map.has(serviceScript.code.snapshot)) {
                    version.map.set(serviceScript.code.snapshot, version.lastVersion++);
                }
                return version.map.get(serviceScript.code.snapshot).toString();
            }
        }
        const openedFile = language.scripts.get(asScriptId(fileName), false);
        if (openedFile && !openedFile.generated) {
            if (!version.map.has(openedFile.snapshot)) {
                version.map.set(openedFile.snapshot, version.lastVersion++);
            }
            return version.map.get(openedFile.snapshot).toString();
        }
        if (sys.fileExists(fileName)) {
            return sys.getModifiedTime?.(fileName)?.valueOf().toString() ?? '0';
        }
        return '';
    }
}
function setEquals(a, b) {
    if (a.size !== b.size) {
        return false;
    }
    for (const item of a) {
        if (!b.has(item)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=createProject.js.map