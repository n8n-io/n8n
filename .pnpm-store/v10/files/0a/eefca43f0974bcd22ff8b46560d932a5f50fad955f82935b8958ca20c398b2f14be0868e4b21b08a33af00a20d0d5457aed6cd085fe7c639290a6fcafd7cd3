"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformCallHierarchyItem = transformCallHierarchyItem;
exports.transformDiagnostic = transformDiagnostic;
exports.fillSourceFileText = fillSourceFileText;
exports.transformFileTextChanges = transformFileTextChanges;
exports.transformDocumentSpan = transformDocumentSpan;
exports.transformSpan = transformSpan;
exports.transformTextChange = transformTextChange;
exports.transformTextSpan = transformTextSpan;
exports.toSourceOffset = toSourceOffset;
exports.toSourceRanges = toSourceRanges;
exports.toSourceOffsets = toSourceOffsets;
exports.toGeneratedRange = toGeneratedRange;
exports.toGeneratedRanges = toGeneratedRanges;
exports.toGeneratedOffset = toGeneratedOffset;
exports.toGeneratedOffsets = toGeneratedOffsets;
exports.getMappingOffset = getMappingOffset;
const language_core_1 = require("@volar/language-core");
const utils_1 = require("./utils");
const transformedDiagnostics = new WeakMap();
const transformedSourceFile = new WeakSet();
/**
 * This file contains a number of facilities for transforming `ts.Diagnostic`s returned
 * from the  base TypeScript LanguageService, which reference locations in generated
 * TS code (e.g. the TypeScript codegen'd from the script portion of a .vue file) into locations
 * in the script portion of the .vue file.
 */
function transformCallHierarchyItem(language, item, fallbackToAnyMatch, filter) {
    const span = transformSpan(language, item.file, item.span, fallbackToAnyMatch, filter);
    const selectionSpan = transformSpan(language, item.file, item.selectionSpan, fallbackToAnyMatch, filter);
    return {
        ...item,
        file: span?.fileName ?? item.file,
        span: span?.textSpan ?? { start: 0, length: 0 },
        selectionSpan: selectionSpan?.textSpan ?? { start: 0, length: 0 },
    };
}
function transformDiagnostic(language, diagnostic, program, isTsc) {
    if (!transformedDiagnostics.has(diagnostic)) {
        transformedDiagnostics.set(diagnostic, undefined);
        const { relatedInformation } = diagnostic;
        if (relatedInformation) {
            diagnostic.relatedInformation = relatedInformation
                .map(d => transformDiagnostic(language, d, program, isTsc))
                .filter(d => !!d);
        }
        if (diagnostic.file !== undefined
            && diagnostic.start !== undefined
            && diagnostic.length !== undefined) {
            const [serviceScript] = (0, utils_1.getServiceScript)(language, diagnostic.file.fileName);
            if (serviceScript) {
                const [sourceSpanFileName, sourceSpan] = transformTextSpan(undefined, language, serviceScript, {
                    start: diagnostic.start,
                    length: diagnostic.length,
                }, true, data => (0, language_core_1.shouldReportDiagnostics)(data, String(diagnostic.source), String(diagnostic.code))) ?? [];
                const actualDiagnosticFile = sourceSpanFileName
                    ? diagnostic.file.fileName === sourceSpanFileName
                        ? diagnostic.file
                        : program?.getSourceFile(sourceSpanFileName)
                    : undefined;
                if (sourceSpan && actualDiagnosticFile) {
                    if (isTsc) {
                        fillSourceFileText(language, diagnostic.file);
                    }
                    transformedDiagnostics.set(diagnostic, {
                        ...diagnostic,
                        file: actualDiagnosticFile,
                        start: sourceSpan.start,
                        length: sourceSpan.length,
                    });
                }
            }
            else {
                transformedDiagnostics.set(diagnostic, diagnostic);
            }
        }
        else {
            transformedDiagnostics.set(diagnostic, diagnostic);
        }
    }
    return transformedDiagnostics.get(diagnostic);
}
// fix https://github.com/vuejs/language-tools/issues/4099 without `incremental`
function fillSourceFileText(language, sourceFile) {
    if (transformedSourceFile.has(sourceFile)) {
        return;
    }
    transformedSourceFile.add(sourceFile);
    const [serviceScript] = (0, utils_1.getServiceScript)(language, sourceFile.fileName);
    if (serviceScript && !serviceScript.preventLeadingOffset) {
        const sourceScript = language.scripts.fromVirtualCode(serviceScript.code);
        sourceFile.text = sourceScript.snapshot.getText(0, sourceScript.snapshot.getLength())
            + sourceFile.text.substring(sourceScript.snapshot.getLength());
    }
}
function transformFileTextChanges(language, changes, fallbackToAnyMatch, filter) {
    const changesPerFile = {};
    const newFiles = new Set();
    for (const fileChanges of changes) {
        const [_, source] = (0, utils_1.getServiceScript)(language, fileChanges.fileName);
        if (source) {
            fileChanges.textChanges.forEach(c => {
                const { fileName, textSpan } = transformSpan(language, fileChanges.fileName, c.span, fallbackToAnyMatch, filter)
                    ?? {};
                if (fileName && textSpan) {
                    (changesPerFile[fileName] ?? (changesPerFile[fileName] = [])).push({ ...c, span: textSpan });
                }
            });
        }
        else {
            const list = changesPerFile[fileChanges.fileName] ?? (changesPerFile[fileChanges.fileName] = []);
            fileChanges.textChanges.forEach(c => {
                list.push(c);
            });
            if (fileChanges.isNewFile) {
                newFiles.add(fileChanges.fileName);
            }
        }
    }
    const result = [];
    for (const fileName in changesPerFile) {
        result.push({
            fileName,
            isNewFile: newFiles.has(fileName),
            textChanges: changesPerFile[fileName],
        });
    }
    return result;
}
function transformDocumentSpan(language, documentSpan, fallbackToAnyMatch, filter, shouldFallback) {
    let textSpan = transformSpan(language, documentSpan.fileName, documentSpan.textSpan, fallbackToAnyMatch, filter);
    if (!textSpan && shouldFallback) {
        textSpan = {
            fileName: documentSpan.fileName,
            textSpan: { start: 0, length: 0 },
        };
    }
    if (!textSpan) {
        return;
    }
    const contextSpan = transformSpan(language, documentSpan.fileName, documentSpan.contextSpan, fallbackToAnyMatch, filter);
    const originalTextSpan = transformSpan(language, documentSpan.originalFileName, documentSpan.originalTextSpan, fallbackToAnyMatch, filter);
    const originalContextSpan = transformSpan(language, documentSpan.originalFileName, documentSpan.originalContextSpan, fallbackToAnyMatch, filter);
    return {
        ...documentSpan,
        fileName: textSpan.fileName,
        textSpan: textSpan.textSpan,
        contextSpan: contextSpan?.textSpan,
        originalFileName: originalTextSpan?.fileName,
        originalTextSpan: originalTextSpan?.textSpan,
        originalContextSpan: originalContextSpan?.textSpan,
    };
}
function transformSpan(language, fileName, textSpan, fallbackToAnyMatch, filter) {
    if (!fileName || !textSpan) {
        return;
    }
    const [serviceScript] = (0, utils_1.getServiceScript)(language, fileName);
    if (serviceScript) {
        const [sourceSpanFileName, sourceSpan] = transformTextSpan(undefined, language, serviceScript, textSpan, fallbackToAnyMatch, filter) ?? [];
        if (sourceSpan && sourceSpanFileName) {
            return {
                fileName: sourceSpanFileName,
                textSpan: sourceSpan,
            };
        }
    }
    else {
        return {
            fileName,
            textSpan,
        };
    }
}
function transformTextChange(sourceScript, language, serviceScript, textChange, fallbackToAnyMatch, filter) {
    const [sourceSpanFileName, sourceSpan] = transformTextSpan(sourceScript, language, serviceScript, textChange.span, fallbackToAnyMatch, filter) ?? [];
    if (sourceSpan && sourceSpanFileName) {
        return [sourceSpanFileName, {
                newText: textChange.newText,
                span: sourceSpan,
            }];
    }
    return undefined;
}
function transformTextSpan(sourceScript, language, serviceScript, textSpan, fallbackToAnyMatch, filter) {
    const start = textSpan.start;
    const end = textSpan.start + textSpan.length;
    for (const [fileName, sourceStart, sourceEnd] of toSourceRanges(sourceScript, language, serviceScript, start, end, fallbackToAnyMatch, filter)) {
        return [fileName, {
                start: sourceStart,
                length: sourceEnd - sourceStart,
            }];
    }
}
function toSourceOffset(sourceScript, language, serviceScript, position, filter) {
    for (const source of toSourceOffsets(sourceScript, language, serviceScript, position, filter)) {
        return source;
    }
}
function* toSourceRanges(sourceScript, language, serviceScript, start, end, fallbackToAnyMatch, filter) {
    if (sourceScript) {
        const map = language.maps.get(serviceScript.code, sourceScript);
        for (const [sourceStart, sourceEnd] of map.toSourceRange(start - getMappingOffset(language, serviceScript), end - getMappingOffset(language, serviceScript), fallbackToAnyMatch, filter)) {
            yield [sourceScript.id, sourceStart, sourceEnd];
        }
    }
    else {
        for (const [sourceScript, map] of language.maps.forEach(serviceScript.code)) {
            for (const [sourceStart, sourceEnd] of map.toSourceRange(start - getMappingOffset(language, serviceScript), end - getMappingOffset(language, serviceScript), fallbackToAnyMatch, filter)) {
                yield [sourceScript.id, sourceStart, sourceEnd];
            }
        }
    }
}
function* toSourceOffsets(sourceScript, language, serviceScript, position, filter) {
    if (sourceScript) {
        const map = language.maps.get(serviceScript.code, sourceScript);
        for (const [sourceOffset, mapping] of map.toSourceLocation(position - getMappingOffset(language, serviceScript))) {
            if (filter(mapping.data)) {
                yield [sourceScript.id, sourceOffset];
            }
        }
    }
    else {
        for (const [sourceScript, map] of language.maps.forEach(serviceScript.code)) {
            for (const [sourceOffset, mapping] of map.toSourceLocation(position - getMappingOffset(language, serviceScript))) {
                if (filter(mapping.data)) {
                    yield [sourceScript.id, sourceOffset];
                }
            }
        }
    }
}
function toGeneratedRange(language, serviceScript, sourceScript, start, end, filter) {
    for (const result of toGeneratedRanges(language, serviceScript, sourceScript, start, end, filter)) {
        return result;
    }
}
function* toGeneratedRanges(language, serviceScript, sourceScript, start, end, filter) {
    const map = language.maps.get(serviceScript.code, sourceScript);
    for (const [generateStart, generateEnd] of map.toGeneratedRange(start, end, true, filter)) {
        yield [
            generateStart + getMappingOffset(language, serviceScript),
            generateEnd + getMappingOffset(language, serviceScript),
        ];
    }
}
function toGeneratedOffset(language, serviceScript, sourceScript, position, filter) {
    for (const [generateOffset] of toGeneratedOffsets(language, serviceScript, sourceScript, position, filter)) {
        return generateOffset;
    }
}
function* toGeneratedOffsets(language, serviceScript, sourceScript, position, filter) {
    const map = language.maps.get(serviceScript.code, sourceScript);
    for (const [generateOffset, mapping] of map.toGeneratedLocation(position)) {
        if (filter(mapping.data)) {
            yield [generateOffset + getMappingOffset(language, serviceScript), mapping];
        }
    }
}
function getMappingOffset(language, serviceScript) {
    if (serviceScript.preventLeadingOffset) {
        return 0;
    }
    const sourceScript = language.scripts.fromVirtualCode(serviceScript.code);
    return sourceScript.snapshot.getLength();
}
//# sourceMappingURL=transform.js.map