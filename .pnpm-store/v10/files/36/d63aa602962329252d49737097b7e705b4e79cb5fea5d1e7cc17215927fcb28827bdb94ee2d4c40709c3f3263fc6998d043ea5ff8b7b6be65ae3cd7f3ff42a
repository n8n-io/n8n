"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResolveModuleName = createResolveModuleName;
function createResolveModuleName(ts, getFileSize, host, languagePlugins, getSourceScript) {
    const toSourceFileInfo = new Map();
    const moduleResolutionHost = {
        readFile: host.readFile.bind(host),
        directoryExists: host.directoryExists?.bind(host),
        realpath: host.realpath?.bind(host),
        getCurrentDirectory: host.getCurrentDirectory?.bind(host),
        getDirectories: host.getDirectories?.bind(host),
        useCaseSensitiveFileNames: typeof host.useCaseSensitiveFileNames === 'function'
            ? host.useCaseSensitiveFileNames.bind(host)
            : host.useCaseSensitiveFileNames,
        fileExists(fileName) {
            const result = host.fileExists(fileName);
            for (const { typescript } of languagePlugins) {
                if (!typescript) {
                    continue;
                }
                if (!result) {
                    for (const { extension } of typescript.extraFileExtensions) {
                        if (!fileName.endsWith(`.d.${extension}.ts`)) {
                            continue;
                        }
                        const sourceFileName = fileName.slice(0, -`.d.${extension}.ts`.length) + `.${extension}`;
                        if (fileExists(sourceFileName)) {
                            const sourceScript = getSourceScript(sourceFileName);
                            if (sourceScript?.generated) {
                                const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
                                if (serviceScript) {
                                    const dtsPath = sourceFileName + '.d.ts';
                                    if ((serviceScript.extension === '.js' || serviceScript.extension === '.jsx') && fileExists(dtsPath)) {
                                        toSourceFileInfo.set(fileName, {
                                            sourceFileName: dtsPath,
                                            extension: '.ts',
                                        });
                                    }
                                    else {
                                        toSourceFileInfo.set(fileName, {
                                            sourceFileName,
                                            extension: serviceScript.extension,
                                        });
                                    }
                                    return true;
                                }
                            }
                        }
                    }
                }
                if (typescript.resolveHiddenExtensions && fileName.endsWith(`.d.ts`)) {
                    for (const { extension } of typescript.extraFileExtensions) {
                        const sourceFileName = fileName.slice(0, -`.d.ts`.length) + `.${extension}`;
                        if (fileExists(sourceFileName)) {
                            const sourceScript = getSourceScript(sourceFileName);
                            if (sourceScript?.generated) {
                                const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
                                if (serviceScript) {
                                    toSourceFileInfo.set(fileName, {
                                        sourceFileName,
                                        extension: serviceScript.extension,
                                    });
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            return result;
        },
    };
    return (moduleName, containingFile, compilerOptions, cache, redirectedReference, resolutionMode) => {
        const result = ts.resolveModuleName(moduleName, containingFile, compilerOptions, moduleResolutionHost, cache, redirectedReference, resolutionMode);
        if (result.resolvedModule) {
            const sourceFileInfo = toSourceFileInfo.get(result.resolvedModule.resolvedFileName);
            if (sourceFileInfo) {
                result.resolvedModule.resolvedFileName = sourceFileInfo.sourceFileName;
                result.resolvedModule.extension = sourceFileInfo.extension;
            }
        }
        toSourceFileInfo.clear();
        return result;
    };
    // fix https://github.com/vuejs/language-tools/issues/3332
    function fileExists(fileName) {
        if (host.fileExists(fileName)) {
            const fileSize = getFileSize?.(fileName) ?? host.readFile(fileName)?.length ?? 0;
            return fileSize < 4 * 1024 * 1024;
        }
        return false;
    }
}
//# sourceMappingURL=resolveModuleName.js.map