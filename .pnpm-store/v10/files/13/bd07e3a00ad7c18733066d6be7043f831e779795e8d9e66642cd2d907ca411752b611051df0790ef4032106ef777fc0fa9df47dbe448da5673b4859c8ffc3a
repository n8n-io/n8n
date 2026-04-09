"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyCreateProgram = proxyCreateProgram;
const language_core_1 = require("@volar/language-core");
const resolveModuleName_1 = require("../resolveModuleName");
const decorateProgram_1 = require("./decorateProgram");
const common_1 = require("../common");
const arrayEqual = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};
const objectEqual = (a, b) => {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (const key of keysA) {
        if (a[key] !== b[key]) {
            return false;
        }
    }
    return true;
};
function proxyCreateProgram(ts, original, create) {
    const sourceFileSnapshots = new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames);
    const parsedSourceFiles = new WeakMap();
    let lastOptions;
    let languagePlugins;
    let language;
    let moduleResolutionCache;
    return new Proxy(original, {
        apply: (target, thisArg, args) => {
            const options = args[0];
            assert(!!options.host, '!!options.host');
            if (!lastOptions
                || !languagePlugins
                || !language
                || !arrayEqual(options.rootNames, lastOptions.rootNames)
                || !objectEqual(options.options, lastOptions.options)) {
                moduleResolutionCache = ts.createModuleResolutionCache(options.host.getCurrentDirectory(), options.host.getCanonicalFileName, options.options);
                lastOptions = options;
                const created = create(ts, options);
                if (Array.isArray(created)) {
                    languagePlugins = created;
                }
                else {
                    languagePlugins = created.languagePlugins;
                }
                language = (0, language_core_1.createLanguage)([
                    ...languagePlugins,
                    { getLanguageId: common_1.resolveFileLanguageId },
                ], new language_core_1.FileMap(ts.sys.useCaseSensitiveFileNames), (fileName, includeFsFiles) => {
                    if (includeFsFiles && !sourceFileSnapshots.has(fileName)) {
                        const sourceFileText = originalHost.readFile(fileName);
                        if (sourceFileText !== undefined) {
                            sourceFileSnapshots.set(fileName, [undefined, {
                                    getChangeRange() {
                                        return undefined;
                                    },
                                    getLength() {
                                        return sourceFileText.length;
                                    },
                                    getText(start, end) {
                                        return sourceFileText.substring(start, end);
                                    },
                                }]);
                        }
                        else {
                            sourceFileSnapshots.set(fileName, [undefined, undefined]);
                        }
                    }
                    const snapshot = sourceFileSnapshots.get(fileName)?.[1];
                    if (snapshot) {
                        language.scripts.set(fileName, snapshot);
                    }
                    else {
                        language.scripts.delete(fileName);
                    }
                });
                if ('setup' in created) {
                    created.setup?.(language);
                }
            }
            const originalHost = options.host;
            const extensions = languagePlugins
                .map(plugin => plugin.typescript?.extraFileExtensions.map(({ extension }) => `.${extension}`) ?? [])
                .flat();
            options.host = { ...originalHost };
            options.host.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) => {
                const originalSourceFile = originalHost.getSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
                if (!sourceFileSnapshots.has(fileName)
                    || sourceFileSnapshots.get(fileName)?.[0] !== originalSourceFile) {
                    if (originalSourceFile) {
                        sourceFileSnapshots.set(fileName, [originalSourceFile, {
                                getChangeRange() {
                                    return undefined;
                                },
                                getLength() {
                                    return originalSourceFile.text.length;
                                },
                                getText(start, end) {
                                    return originalSourceFile.text.substring(start, end);
                                },
                            }]);
                    }
                    else {
                        sourceFileSnapshots.set(fileName, [undefined, undefined]);
                    }
                }
                if (!originalSourceFile) {
                    return;
                }
                if (!parsedSourceFiles.has(originalSourceFile)) {
                    const sourceScript = language.scripts.get(fileName);
                    assert(!!sourceScript, '!!sourceScript');
                    parsedSourceFiles.set(originalSourceFile, undefined);
                    if (sourceScript.generated?.languagePlugin.typescript) {
                        const { getServiceScript, getExtraServiceScripts } = sourceScript.generated.languagePlugin.typescript;
                        const serviceScript = getServiceScript(sourceScript.generated.root);
                        if (serviceScript) {
                            let virtualContents;
                            if (!serviceScript.preventLeadingOffset) {
                                virtualContents = originalSourceFile.text.split('\n').map(line => ' '.repeat(line.length)).join('\n')
                                    + serviceScript.code.snapshot.getText(0, serviceScript.code.snapshot.getLength());
                            }
                            else {
                                virtualContents = serviceScript.code.snapshot.getText(0, serviceScript.code.snapshot.getLength());
                            }
                            const parsedSourceFile = ts.createSourceFile(fileName, virtualContents, languageVersionOrOptions, undefined, serviceScript.scriptKind);
                            // @ts-expect-error
                            parsedSourceFile.version = originalSourceFile.version;
                            parsedSourceFiles.set(originalSourceFile, parsedSourceFile);
                        }
                        if (getExtraServiceScripts) {
                            console.warn('getExtraServiceScripts() is not available in this use case.');
                        }
                    }
                }
                return parsedSourceFiles.get(originalSourceFile) ?? originalSourceFile;
            };
            if (extensions.length) {
                options.options.allowArbitraryExtensions = true;
                const resolveModuleName = (0, resolveModuleName_1.createResolveModuleName)(ts, ts.sys.getFileSize, originalHost, language.plugins, fileName => language.scripts.get(fileName));
                const resolveModuleNameLiterals = originalHost.resolveModuleNameLiterals;
                const resolveModuleNames = originalHost.resolveModuleNames;
                options.host.resolveModuleNameLiterals = (moduleLiterals, containingFile, redirectedReference, compilerOptions, ...rest) => {
                    if (resolveModuleNameLiterals && moduleLiterals.every(name => !extensions.some(ext => name.text.endsWith(ext)))) {
                        return resolveModuleNameLiterals(moduleLiterals, containingFile, redirectedReference, compilerOptions, ...rest);
                    }
                    return moduleLiterals.map(moduleLiteral => {
                        return resolveModuleName(moduleLiteral.text, containingFile, compilerOptions, moduleResolutionCache, redirectedReference);
                    });
                };
                options.host.resolveModuleNames = (moduleNames, containingFile, reusedNames, redirectedReference, compilerOptions, containingSourceFile) => {
                    if (resolveModuleNames && moduleNames.every(name => !extensions.some(ext => name.endsWith(ext)))) {
                        return resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference, compilerOptions, containingSourceFile);
                    }
                    return moduleNames.map(moduleName => {
                        return resolveModuleName(moduleName, containingFile, compilerOptions, moduleResolutionCache, redirectedReference).resolvedModule;
                    });
                };
            }
            const program = Reflect.apply(target, thisArg, args);
            (0, decorateProgram_1.decorateProgram)(language, program);
            return program;
        },
    });
}
function assert(condition, message) {
    if (!condition) {
        console.error(message);
        throw new Error(message);
    }
}
//# sourceMappingURL=proxyCreateProgram.js.map