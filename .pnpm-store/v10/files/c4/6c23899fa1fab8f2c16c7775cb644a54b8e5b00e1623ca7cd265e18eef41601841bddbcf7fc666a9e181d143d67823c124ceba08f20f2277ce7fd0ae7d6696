"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProxyLanguageService = createProxyLanguageService;
const language_core_1 = require("@volar/language-core");
const dedupe_1 = require("./dedupe");
const transform_1 = require("./transform");
const utils_1 = require("./utils");
const windowsPathReg = /\\/g;
/**
 * Creates and returns a Proxy around the base TypeScript LanguageService.
 *
 * This is used by the Volar TypeScript Plugin (which can be created by `createLanguageServicePlugin`
 * and `createAsyncLanguageServicePlugin`) as an adapter layer between the TypeScript Language Service
 * plugin API (see https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
 * and a Volar `Language`.
 *
 * Once the `initialize` method is called, the proxy will begin intercepting requests and
 * enhancing the default behavior of the LanguageService with enhancements based on
 * the Volar `Language` that has been passed to `initialize`.
 */
function createProxyLanguageService(languageService) {
    const proxyCache = new Map();
    let getProxyMethod;
    return {
        initialize(language) {
            getProxyMethod = (target, p) => {
                switch (p) {
                    case 'getNavigationTree': return getNavigationTree(language, target[p]);
                    case 'getOutliningSpans': return getOutliningSpans(language, target[p]);
                    case 'getFormattingEditsForDocument': return getFormattingEditsForDocument(language, target[p]);
                    case 'getFormattingEditsForRange': return getFormattingEditsForRange(language, target[p]);
                    case 'getFormattingEditsAfterKeystroke': return getFormattingEditsAfterKeystroke(language, target[p]);
                    case 'getEditsForFileRename': return getEditsForFileRename(language, target[p]);
                    case 'getLinkedEditingRangeAtPosition': return getLinkedEditingRangeAtPosition(language, target[p]);
                    case 'prepareCallHierarchy': return prepareCallHierarchy(language, target[p]);
                    case 'provideCallHierarchyIncomingCalls': return provideCallHierarchyIncomingCalls(language, target[p]);
                    case 'provideCallHierarchyOutgoingCalls': return provideCallHierarchyOutgoingCalls(language, target[p]);
                    case 'organizeImports': return organizeImports(language, target[p]);
                    case 'getQuickInfoAtPosition': return getQuickInfoAtPosition(language, target[p]);
                    case 'getSignatureHelpItems': return getSignatureHelpItems(language, target[p]);
                    case 'getDocumentHighlights': return getDocumentHighlights(language, target[p]);
                    case 'getApplicableRefactors': return getApplicableRefactors(language, target[p]);
                    case 'getEditsForRefactor': return getEditsForRefactor(language, target[p]);
                    case 'getCombinedCodeFix': return getCombinedCodeFix(language, target[p]);
                    case 'getRenameInfo': return getRenameInfo(language, target[p]);
                    case 'getCodeFixesAtPosition': return getCodeFixesAtPosition(language, target[p]);
                    case 'getEncodedSemanticClassifications': return getEncodedSemanticClassifications(language, target[p]);
                    case 'getSyntacticDiagnostics': return getSyntacticDiagnostics(language, languageService, target[p]);
                    case 'getSemanticDiagnostics': return getSemanticDiagnostics(language, languageService, target[p]);
                    case 'getSuggestionDiagnostics': return getSuggestionDiagnostics(language, languageService, target[p]);
                    case 'getDefinitionAndBoundSpan': return getDefinitionAndBoundSpan(language, target[p]);
                    case 'findReferences': return findReferences(language, target[p]);
                    case 'getDefinitionAtPosition': return getDefinitionAtPosition(language, target[p]);
                    case 'getTypeDefinitionAtPosition': return getTypeDefinitionAtPosition(language, target[p]);
                    case 'getImplementationAtPosition': return getImplementationAtPosition(language, target[p]);
                    case 'findRenameLocations': return findRenameLocations(language, target[p]);
                    case 'getReferencesAtPosition': return getReferencesAtPosition(language, target[p]);
                    case 'getCompletionsAtPosition': return getCompletionsAtPosition(language, target[p]);
                    case 'getCompletionEntryDetails': return getCompletionEntryDetails(language, target[p]);
                    case 'provideInlayHints': return provideInlayHints(language, target[p]);
                    case 'getFileReferences': return getFileReferences(language, target[p]);
                    case 'getNavigateToItems': return getNavigateToItems(language, target[p]);
                }
            };
        },
        proxy: new Proxy(languageService, {
            get(target, p, receiver) {
                if (getProxyMethod) {
                    if (!proxyCache.has(p)) {
                        proxyCache.set(p, getProxyMethod(target, p));
                    }
                    const proxyMethod = proxyCache.get(p);
                    if (proxyMethod) {
                        return proxyMethod;
                    }
                }
                return Reflect.get(target, p, receiver);
            },
            set(target, p, value, receiver) {
                return Reflect.set(target, p, value, receiver);
            },
        }),
    };
}
// ignored methods
function getNavigationTree(language, getNavigationTree) {
    return filePath => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (serviceScript || targetScript?.associatedOnly) {
            const tree = getNavigationTree(targetScript.id);
            tree.childItems = undefined;
            return tree;
        }
        else {
            return getNavigationTree(fileName);
        }
    };
}
function getOutliningSpans(language, getOutliningSpans) {
    return filePath => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (serviceScript || targetScript?.associatedOnly) {
            return [];
        }
        else {
            return getOutliningSpans(fileName);
        }
    };
}
// proxy methods
function getFormattingEditsForDocument(language, getFormattingEditsForDocument) {
    return (filePath, options) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            const map = language.maps.get(serviceScript.code, targetScript);
            if (!map.mappings.some(mapping => (0, language_core_1.isFormattingEnabled)(mapping.data))) {
                return [];
            }
            const edits = getFormattingEditsForDocument(targetScript.id, options);
            return edits
                .map(edit => (0, transform_1.transformTextChange)(sourceScript, language, serviceScript, edit, false, language_core_1.isFormattingEnabled)?.[1])
                .filter(edit => !!edit);
        }
        else {
            return getFormattingEditsForDocument(fileName, options);
        }
    };
}
function getFormattingEditsForRange(language, getFormattingEditsForRange) {
    return (filePath, start, end, options) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            const generatedRange = (0, transform_1.toGeneratedRange)(language, serviceScript, sourceScript, start, end, language_core_1.isFormattingEnabled);
            if (generatedRange !== undefined) {
                const edits = getFormattingEditsForRange(targetScript.id, generatedRange[0], generatedRange[1], options);
                return edits
                    .map(edit => (0, transform_1.transformTextChange)(sourceScript, language, serviceScript, edit, false, language_core_1.isFormattingEnabled)?.[1])
                    .filter(edit => !!edit);
            }
            return [];
        }
        else {
            return getFormattingEditsForRange(fileName, start, end, options);
        }
    };
}
function getFormattingEditsAfterKeystroke(language, getFormattingEditsAfterKeystroke) {
    return (filePath, position, key, options) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, position, language_core_1.isFormattingEnabled);
            if (generatePosition !== undefined) {
                const edits = getFormattingEditsAfterKeystroke(targetScript.id, generatePosition, key, options);
                return edits
                    .map(edit => (0, transform_1.transformTextChange)(sourceScript, language, serviceScript, edit, false, language_core_1.isFormattingEnabled)?.[1])
                    .filter(edit => !!edit);
            }
            return [];
        }
        else {
            return getFormattingEditsAfterKeystroke(fileName, position, key, options);
        }
    };
}
function getEditsForFileRename(language, getEditsForFileRename) {
    return (oldFilePath, newFilePath, formatOptions, preferences) => {
        const edits = getEditsForFileRename(oldFilePath, newFilePath, formatOptions, preferences);
        return (0, transform_1.transformFileTextChanges)(language, edits, false, language_core_1.isRenameEnabled);
    };
}
function getLinkedEditingRangeAtPosition(language, getLinkedEditingRangeAtPosition) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return undefined;
        }
        if (serviceScript) {
            const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, position, language_core_1.isLinkedEditingEnabled);
            if (generatePosition !== undefined) {
                const info = getLinkedEditingRangeAtPosition(targetScript.id, generatePosition);
                if (info) {
                    return {
                        ranges: info.ranges
                            .map(span => (0, transform_1.transformTextSpan)(sourceScript, language, serviceScript, span, false, language_core_1.isLinkedEditingEnabled)?.[1])
                            .filter(span => !!span),
                        wordPattern: info.wordPattern,
                    };
                }
            }
        }
        else {
            return getLinkedEditingRangeAtPosition(fileName, position);
        }
    };
}
function prepareCallHierarchy(language, prepareCallHierarchy) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return undefined;
        }
        if (serviceScript) {
            const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, position, language_core_1.isCallHierarchyEnabled);
            if (generatePosition !== undefined) {
                const item = prepareCallHierarchy(targetScript.id, generatePosition);
                if (Array.isArray(item)) {
                    return item.map(item => (0, transform_1.transformCallHierarchyItem)(language, item, true, language_core_1.isCallHierarchyEnabled));
                }
                else if (item) {
                    return (0, transform_1.transformCallHierarchyItem)(language, item, true, language_core_1.isCallHierarchyEnabled);
                }
            }
        }
        else {
            return prepareCallHierarchy(fileName, position);
        }
    };
}
function provideCallHierarchyIncomingCalls(language, provideCallHierarchyIncomingCalls) {
    return (filePath, position) => {
        let calls = [];
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, position, language_core_1.isCallHierarchyEnabled);
            if (generatePosition !== undefined) {
                calls = provideCallHierarchyIncomingCalls(targetScript.id, generatePosition);
            }
        }
        else {
            calls = provideCallHierarchyIncomingCalls(fileName, position);
        }
        return calls
            .map(call => {
            const from = (0, transform_1.transformCallHierarchyItem)(language, call.from, true, language_core_1.isCallHierarchyEnabled);
            const fromSpans = call.fromSpans
                .map(span => (0, transform_1.transformSpan)(language, call.from.file, span, true, language_core_1.isCallHierarchyEnabled)?.textSpan)
                .filter(span => !!span);
            return {
                from,
                fromSpans,
            };
        });
    };
}
function provideCallHierarchyOutgoingCalls(language, provideCallHierarchyOutgoingCalls) {
    return (filePath, position) => {
        let calls = [];
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, position, language_core_1.isCallHierarchyEnabled);
            if (generatePosition !== undefined) {
                calls = provideCallHierarchyOutgoingCalls(targetScript.id, generatePosition);
            }
        }
        else {
            calls = provideCallHierarchyOutgoingCalls(fileName, position);
        }
        return calls
            .map(call => {
            const to = (0, transform_1.transformCallHierarchyItem)(language, call.to, true, language_core_1.isCallHierarchyEnabled);
            const fromSpans = call.fromSpans
                .map(span => serviceScript
                ? (0, transform_1.transformTextSpan)(sourceScript, language, serviceScript, span, true, language_core_1.isCallHierarchyEnabled)?.[1]
                : span)
                .filter(span => !!span);
            return {
                to,
                fromSpans,
            };
        });
    };
}
function organizeImports(language, organizeImports) {
    return (args, formatOptions, preferences) => {
        const unresolved = organizeImports(args, formatOptions, preferences);
        return (0, transform_1.transformFileTextChanges)(language, unresolved, false, language_core_1.isCodeActionsEnabled);
    };
}
function getQuickInfoAtPosition(language, getQuickInfoAtPosition) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return undefined;
        }
        if (serviceScript) {
            const infos = [];
            for (const [generatePosition] of (0, transform_1.toGeneratedOffsets)(language, serviceScript, sourceScript, position, language_core_1.isHoverEnabled)) {
                const info = getQuickInfoAtPosition(targetScript.id, generatePosition);
                if (info) {
                    const textSpan = (0, transform_1.transformTextSpan)(sourceScript, language, serviceScript, info.textSpan, true, language_core_1.isHoverEnabled)?.[1];
                    if (textSpan) {
                        infos.push({
                            ...info,
                            textSpan: textSpan,
                        });
                    }
                }
            }
            if (infos.length === 1) {
                return infos[0];
            }
            else if (infos.length >= 2) {
                const combine = { ...infos[0] };
                combine.displayParts = combine.displayParts?.slice();
                combine.documentation = combine.documentation?.slice();
                combine.tags = combine.tags?.slice();
                const displayPartsStrs = new Set([displayPartsToString(infos[0].displayParts)]);
                const documentationStrs = new Set([displayPartsToString(infos[0].documentation)]);
                const tagsStrs = new Set();
                for (const tag of infos[0].tags ?? []) {
                    tagsStrs.add(tag.name + '__volar__' + displayPartsToString(tag.text));
                }
                for (let i = 1; i < infos.length; i++) {
                    const { displayParts, documentation, tags } = infos[i];
                    if (displayParts?.length && !displayPartsStrs.has(displayPartsToString(displayParts))) {
                        displayPartsStrs.add(displayPartsToString(displayParts));
                        combine.displayParts ??= [];
                        combine.displayParts.push({ ...displayParts[0], text: '\n\n' + displayParts[0].text });
                        combine.displayParts.push(...displayParts.slice(1));
                    }
                    if (documentation?.length && !documentationStrs.has(displayPartsToString(documentation))) {
                        documentationStrs.add(displayPartsToString(documentation));
                        combine.documentation ??= [];
                        combine.documentation.push({ ...documentation[0], text: '\n\n' + documentation[0].text });
                        combine.documentation.push(...documentation.slice(1));
                    }
                    for (const tag of tags ?? []) {
                        if (!tagsStrs.has(tag.name + '__volar__' + displayPartsToString(tag.text))) {
                            tagsStrs.add(tag.name + '__volar__' + displayPartsToString(tag.text));
                            combine.tags ??= [];
                            combine.tags.push(tag);
                        }
                    }
                }
                return combine;
            }
        }
        else {
            return getQuickInfoAtPosition(fileName, position);
        }
    };
}
function getSignatureHelpItems(language, getSignatureHelpItems) {
    return (filePath, position, options) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return undefined;
        }
        if (serviceScript) {
            const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, position, language_core_1.isSignatureHelpEnabled);
            if (generatePosition !== undefined) {
                const result = getSignatureHelpItems(targetScript.id, generatePosition, options);
                if (result) {
                    const applicableSpan = (0, transform_1.transformTextSpan)(sourceScript, language, serviceScript, result.applicableSpan, true, language_core_1.isSignatureHelpEnabled)?.[1];
                    if (applicableSpan) {
                        return {
                            ...result,
                            applicableSpan,
                        };
                    }
                }
            }
        }
        else {
            return getSignatureHelpItems(fileName, position, options);
        }
    };
}
function getDocumentHighlights(language, getDocumentHighlights) {
    return (filePath, position, filesToSearch) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isHighlightEnabled, (fileName, position) => getDocumentHighlights(fileName, position, filesToSearch), function* (result) {
            for (const ref of result) {
                for (const reference of ref.highlightSpans) {
                    yield [reference.fileName ?? ref.fileName, reference.textSpan.start];
                }
            }
        });
        const resolved = unresolved
            .flat()
            .map(highlights => {
            return {
                ...highlights,
                highlightSpans: highlights.highlightSpans
                    .map(span => {
                    const { textSpan } = (0, transform_1.transformSpan)(language, span.fileName ?? highlights.fileName, span.textSpan, false, language_core_1.isHighlightEnabled) ?? {};
                    if (textSpan) {
                        return {
                            ...span,
                            contextSpan: (0, transform_1.transformSpan)(language, span.fileName ?? highlights.fileName, span.contextSpan, false, language_core_1.isHighlightEnabled)?.textSpan,
                            textSpan,
                        };
                    }
                })
                    .filter(span => !!span),
            };
        });
        return resolved;
    };
}
function getApplicableRefactors(language, getApplicableRefactors) {
    return (filePath, positionOrRange, preferences, triggerReason, kind, includeInteractiveActions) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            if (typeof positionOrRange === 'number') {
                const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, positionOrRange, language_core_1.isCodeActionsEnabled);
                if (generatePosition !== undefined) {
                    return getApplicableRefactors(targetScript.id, generatePosition, preferences, triggerReason, kind, includeInteractiveActions);
                }
            }
            else {
                for (const [generatedStart, generatedEnd] of (0, transform_1.toGeneratedRanges)(language, serviceScript, sourceScript, positionOrRange.pos, positionOrRange.end, language_core_1.isCodeActionsEnabled)) {
                    return getApplicableRefactors(targetScript.id, { pos: generatedStart, end: generatedEnd }, preferences, triggerReason, kind, includeInteractiveActions);
                }
            }
            return [];
        }
        else {
            return getApplicableRefactors(fileName, positionOrRange, preferences, triggerReason, kind, includeInteractiveActions);
        }
    };
}
function getEditsForRefactor(language, getEditsForRefactor) {
    return (filePath, formatOptions, positionOrRange, refactorName, actionName, preferences, interactiveRefactorArguments) => {
        let edits;
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return undefined;
        }
        if (serviceScript) {
            if (typeof positionOrRange === 'number') {
                const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, positionOrRange, language_core_1.isCodeActionsEnabled);
                if (generatePosition !== undefined) {
                    edits = getEditsForRefactor(targetScript.id, formatOptions, generatePosition, refactorName, actionName, preferences, interactiveRefactorArguments);
                }
            }
            else {
                for (const [generatedStart, generatedEnd] of (0, transform_1.toGeneratedRanges)(language, serviceScript, sourceScript, positionOrRange.pos, positionOrRange.end, language_core_1.isCodeActionsEnabled)) {
                    edits = getEditsForRefactor(targetScript.id, formatOptions, { pos: generatedStart, end: generatedEnd }, refactorName, actionName, preferences, interactiveRefactorArguments);
                }
            }
        }
        else {
            edits = getEditsForRefactor(fileName, formatOptions, positionOrRange, refactorName, actionName, preferences, interactiveRefactorArguments);
        }
        if (edits) {
            edits.edits = (0, transform_1.transformFileTextChanges)(language, edits.edits, false, language_core_1.isCodeActionsEnabled);
            return edits;
        }
    };
}
function getCombinedCodeFix(language, getCombinedCodeFix) {
    return (...args) => {
        const codeActions = getCombinedCodeFix(...args);
        codeActions.changes = (0, transform_1.transformFileTextChanges)(language, codeActions.changes, false, language_core_1.isCodeActionsEnabled);
        return codeActions;
    };
}
function getRenameInfo(language, getRenameInfo) {
    return (filePath, position, options) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return {
                canRename: false,
                localizedErrorMessage: "Cannot rename"
            };
        }
        if (serviceScript) {
            let failed;
            for (const [generateOffset] of (0, transform_1.toGeneratedOffsets)(language, serviceScript, sourceScript, position, language_core_1.isRenameEnabled)) {
                const info = getRenameInfo(targetScript.id, generateOffset, options);
                if (info.canRename) {
                    const span = (0, transform_1.transformTextSpan)(sourceScript, language, serviceScript, info.triggerSpan, false, language_core_1.isRenameEnabled)?.[1];
                    if (span) {
                        info.triggerSpan = span;
                        return info;
                    }
                }
                else {
                    failed = info;
                }
            }
            if (failed) {
                return failed;
            }
            return {
                canRename: false,
                localizedErrorMessage: 'Failed to get rename locations',
            };
        }
        else {
            return getRenameInfo(fileName, position, options);
        }
    };
}
function getCodeFixesAtPosition(language, getCodeFixesAtPosition) {
    return (filePath, start, end, errorCodes, formatOptions, preferences) => {
        let fixes = [];
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            const generateRange = (0, transform_1.toGeneratedRange)(language, serviceScript, sourceScript, start, end, language_core_1.isCodeActionsEnabled);
            if (generateRange !== undefined) {
                fixes = getCodeFixesAtPosition(targetScript.id, generateRange[0], generateRange[1], errorCodes, formatOptions, preferences);
            }
        }
        else {
            fixes = getCodeFixesAtPosition(fileName, start, end, errorCodes, formatOptions, preferences);
        }
        fixes = fixes.map(fix => {
            fix.changes = (0, transform_1.transformFileTextChanges)(language, fix.changes, false, language_core_1.isCodeActionsEnabled);
            return fix;
        });
        return fixes;
    };
}
function getEncodedSemanticClassifications(language, getEncodedSemanticClassifications) {
    return (filePath, span, format) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return {
                spans: [],
                endOfLineState: 0
            };
        }
        if (serviceScript) {
            const map = language.maps.get(serviceScript.code, targetScript);
            const mapped = (0, language_core_1.findOverlapCodeRange)(span.start, span.start + span.length, map, language_core_1.isSemanticTokensEnabled);
            if (!mapped) {
                return {
                    spans: [],
                    endOfLineState: 0
                };
            }
            const mappingOffset = (0, transform_1.getMappingOffset)(language, serviceScript);
            const start = mapped.start + mappingOffset;
            const end = mapped.end + mappingOffset;
            const result = getEncodedSemanticClassifications(targetScript.id, { start, length: end - start }, format);
            const spans = [];
            for (let i = 0; i < result.spans.length; i += 3) {
                for (const [_, sourceStart, sourceEnd] of (0, transform_1.toSourceRanges)(sourceScript, language, serviceScript, result.spans[i], result.spans[i] + result.spans[i + 1], false, language_core_1.isSemanticTokensEnabled)) {
                    spans.push(sourceStart, sourceEnd - sourceStart, result.spans[i + 2]);
                    break;
                }
            }
            result.spans = spans;
            return result;
        }
        else {
            return getEncodedSemanticClassifications(fileName, span, format);
        }
    };
}
function getSyntacticDiagnostics(language, languageService, getSyntacticDiagnostics) {
    return filePath => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        return getSyntacticDiagnostics(targetScript?.id ?? fileName)
            .map(d => (0, transform_1.transformDiagnostic)(language, d, languageService.getProgram(), false))
            .filter(d => !!d)
            .filter(d => !serviceScript || language.scripts.get(d.file.fileName) === sourceScript);
    };
}
function getSemanticDiagnostics(language, languageService, getSemanticDiagnostics) {
    return filePath => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        return getSemanticDiagnostics(targetScript?.id ?? fileName)
            .map(d => (0, transform_1.transformDiagnostic)(language, d, languageService.getProgram(), false))
            .filter(d => !!d)
            .filter(d => !serviceScript || !d.file || language.scripts.get(d.file.fileName) === sourceScript);
    };
}
function getSuggestionDiagnostics(language, languageService, getSuggestionDiagnostics) {
    return filePath => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        return getSuggestionDiagnostics(targetScript?.id ?? fileName)
            .map(d => (0, transform_1.transformDiagnostic)(language, d, languageService.getProgram(), false))
            .filter(d => !!d)
            .filter(d => !serviceScript || !d.file || language.scripts.get(d.file.fileName) === sourceScript);
    };
}
function getDefinitionAndBoundSpan(language, getDefinitionAndBoundSpan) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isDefinitionEnabled, (fileName, position) => getDefinitionAndBoundSpan(fileName, position), function* (result) {
            for (const ref of result.definitions ?? []) {
                yield [ref.fileName, ref.textSpan.start];
            }
        });
        const textSpan = unresolved
            .map(s => (0, transform_1.transformSpan)(language, fileName, s.textSpan, true, language_core_1.isDefinitionEnabled)?.textSpan)
            .filter(s => !!s)[0];
        if (!textSpan) {
            return;
        }
        const definitions = unresolved
            .map(s => s.definitions
            ?.map(s => (0, transform_1.transformDocumentSpan)(language, s, true, language_core_1.isDefinitionEnabled, s.fileName !== fileName))
            .filter(s => !!s)
            ?? [])
            .flat();
        return {
            textSpan,
            definitions: (0, dedupe_1.dedupeDocumentSpans)(definitions),
        };
    };
}
function findReferences(language, findReferences) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isReferencesEnabled, (fileName, position) => findReferences(fileName, position), function* (result) {
            for (const ref of result) {
                for (const reference of ref.references) {
                    yield [reference.fileName, reference.textSpan.start];
                }
            }
        });
        const resolved = unresolved
            .flat()
            .map(symbol => {
            const definition = (0, transform_1.transformDocumentSpan)(language, symbol.definition, true, language_core_1.isDefinitionEnabled, true);
            return {
                definition,
                references: symbol.references
                    .map(r => (0, transform_1.transformDocumentSpan)(language, r, true, language_core_1.isReferencesEnabled))
                    .filter(r => !!r),
            };
        });
        return resolved;
    };
}
function getDefinitionAtPosition(language, getDefinitionAtPosition) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isDefinitionEnabled, (fileName, position) => getDefinitionAtPosition(fileName, position), function* (result) {
            for (const ref of result) {
                yield [ref.fileName, ref.textSpan.start];
            }
        });
        const resolved = unresolved
            .flat()
            .map(s => (0, transform_1.transformDocumentSpan)(language, s, true, language_core_1.isDefinitionEnabled, s.fileName !== fileName))
            .filter(s => !!s);
        return (0, dedupe_1.dedupeDocumentSpans)(resolved);
    };
}
function getTypeDefinitionAtPosition(language, getTypeDefinitionAtPosition) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isTypeDefinitionEnabled, (fileName, position) => getTypeDefinitionAtPosition(fileName, position), function* (result) {
            for (const ref of result) {
                yield [ref.fileName, ref.textSpan.start];
            }
        });
        const resolved = unresolved
            .flat()
            .map(s => (0, transform_1.transformDocumentSpan)(language, s, true, language_core_1.isTypeDefinitionEnabled))
            .filter(s => !!s);
        return (0, dedupe_1.dedupeDocumentSpans)(resolved);
    };
}
function getImplementationAtPosition(language, getImplementationAtPosition) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isImplementationEnabled, (fileName, position) => getImplementationAtPosition(fileName, position), function* (result) {
            for (const ref of result) {
                yield [ref.fileName, ref.textSpan.start];
            }
        });
        const resolved = unresolved
            .flat()
            .map(s => (0, transform_1.transformDocumentSpan)(language, s, true, language_core_1.isImplementationEnabled))
            .filter(s => !!s);
        return (0, dedupe_1.dedupeDocumentSpans)(resolved);
    };
}
function findRenameLocations(language, findRenameLocations) {
    return (filePath, position, findInStrings, findInComments, preferences) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isRenameEnabled, (fileName, position) => findRenameLocations(fileName, position, findInStrings, findInComments, preferences), function* (result) {
            for (const ref of result) {
                yield [ref.fileName, ref.textSpan.start];
            }
        });
        const resolved = unresolved
            .flat()
            .map(s => (0, transform_1.transformDocumentSpan)(language, s, false, language_core_1.isRenameEnabled))
            .filter(s => !!s);
        return (0, dedupe_1.dedupeDocumentSpans)(resolved);
    };
}
function getReferencesAtPosition(language, getReferencesAtPosition) {
    return (filePath, position) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = linkedCodeFeatureWorker(language, fileName, position, language_core_1.isReferencesEnabled, (fileName, position) => getReferencesAtPosition(fileName, position), function* (result) {
            for (const ref of result) {
                yield [ref.fileName, ref.textSpan.start];
            }
        });
        const resolved = unresolved
            .flat()
            .map(s => (0, transform_1.transformDocumentSpan)(language, s, true, language_core_1.isReferencesEnabled))
            .filter(s => !!s);
        return (0, dedupe_1.dedupeDocumentSpans)(resolved);
    };
}
function getCompletionsAtPosition(language, getCompletionsAtPosition) {
    return (filePath, position, options, formattingSettings) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return undefined;
        }
        if (serviceScript) {
            let mainResult;
            const additionalResults = [];
            for (const [generatedOffset, mapping] of (0, transform_1.toGeneratedOffsets)(language, serviceScript, sourceScript, position, language_core_1.isCompletionEnabled)) {
                const isAdditional = typeof mapping.data.completion === 'object' && mapping.data.completion.isAdditional;
                if (!isAdditional && mainResult?.entries.length) {
                    continue;
                }
                const result = getCompletionsAtPosition(targetScript.id, generatedOffset, options, formattingSettings);
                if (!result) {
                    continue;
                }
                if (typeof mapping.data.completion === 'object' && mapping.data.completion.onlyImport) {
                    result.entries = result.entries.filter(entry => !!entry.sourceDisplay);
                }
                for (const entry of result.entries) {
                    entry.replacementSpan = entry.replacementSpan && (0, transform_1.transformTextSpan)(sourceScript, language, serviceScript, entry.replacementSpan, false, language_core_1.isCompletionEnabled)?.[1];
                }
                result.optionalReplacementSpan = result.optionalReplacementSpan
                    && (0, transform_1.transformTextSpan)(sourceScript, language, serviceScript, result.optionalReplacementSpan, false, language_core_1.isCompletionEnabled)?.[1];
                if (isAdditional) {
                    additionalResults.push(result);
                }
                else {
                    mainResult = result;
                }
            }
            const results = additionalResults;
            if (mainResult) {
                results.unshift(mainResult);
            }
            if (results.length) {
                return {
                    ...results[0],
                    entries: results
                        .map(additionalResult => additionalResult.entries)
                        .flat(),
                };
            }
        }
        else {
            return getCompletionsAtPosition(fileName, position, options, formattingSettings);
        }
    };
}
function getCompletionEntryDetails(language, getCompletionEntryDetails) {
    return (filePath, position, entryName, formatOptions, source, preferences, data) => {
        let details;
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return undefined;
        }
        if (serviceScript) {
            const generatePosition = (0, transform_1.toGeneratedOffset)(language, serviceScript, sourceScript, position, language_core_1.isCompletionEnabled);
            if (generatePosition !== undefined) {
                details = getCompletionEntryDetails(targetScript.id, generatePosition, entryName, formatOptions, source, preferences, data);
            }
        }
        else {
            return getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences, data);
        }
        if (details?.codeActions) {
            for (const codeAction of details.codeActions) {
                codeAction.changes = (0, transform_1.transformFileTextChanges)(language, codeAction.changes, false, language_core_1.isCompletionEnabled);
            }
        }
        return details;
    };
}
function provideInlayHints(language, provideInlayHints) {
    return (filePath, span, preferences) => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
        if (targetScript?.associatedOnly) {
            return [];
        }
        if (serviceScript) {
            const map = language.maps.get(serviceScript.code, sourceScript);
            const mapped = (0, language_core_1.findOverlapCodeRange)(span.start, span.start + span.length, map, language_core_1.isSemanticTokensEnabled);
            if (!mapped) {
                return [];
            }
            const mappingOffset = (0, transform_1.getMappingOffset)(language, serviceScript);
            const start = mapped.start + mappingOffset;
            const end = mapped.end + mappingOffset;
            const result = provideInlayHints(targetScript.id, { start, length: end - start }, preferences);
            const hints = [];
            for (const hint of result) {
                const sourcePosition = (0, transform_1.toSourceOffset)(sourceScript, language, serviceScript, hint.position, language_core_1.isInlayHintsEnabled);
                if (sourcePosition !== undefined) {
                    hints.push({
                        ...hint,
                        position: sourcePosition[1],
                    });
                }
            }
            return hints;
        }
        else {
            return provideInlayHints(fileName, span, preferences);
        }
    };
}
function getFileReferences(language, getFileReferences) {
    return filePath => {
        const fileName = filePath.replace(windowsPathReg, '/');
        const unresolved = getFileReferences(fileName);
        const resolved = unresolved
            .map(s => (0, transform_1.transformDocumentSpan)(language, s, true, language_core_1.isReferencesEnabled))
            .filter(s => !!s);
        return (0, dedupe_1.dedupeDocumentSpans)(resolved);
    };
}
function getNavigateToItems(language, getNavigateToItems) {
    return (...args) => {
        const unresolved = getNavigateToItems(...args);
        const resolved = unresolved
            .map(s => (0, transform_1.transformDocumentSpan)(language, s, true, language_core_1.isReferencesEnabled))
            .filter(s => !!s);
        return (0, dedupe_1.dedupeDocumentSpans)(resolved);
    };
}
function linkedCodeFeatureWorker(language, fileName, position, filter, worker, getLinkedCodes) {
    const results = [];
    const processedFilePositions = new Set();
    const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, fileName);
    if (serviceScript) {
        for (const [generatedOffset] of (0, transform_1.toGeneratedOffsets)(language, serviceScript, sourceScript, position, filter)) {
            process(targetScript.id, generatedOffset);
        }
    }
    else {
        process(fileName, position);
    }
    return results;
    function process(fileName, position) {
        if (processedFilePositions.has(fileName + ':' + position)) {
            return;
        }
        processedFilePositions.add(fileName + ':' + position);
        const result = worker(fileName, position);
        if (!result) {
            return;
        }
        results.push(result);
        for (const ref of getLinkedCodes(result)) {
            processedFilePositions.add(ref[0] + ':' + ref[1]);
            const [serviceScript] = (0, utils_1.getServiceScript)(language, ref[0]);
            if (!serviceScript) {
                continue;
            }
            const linkedCodeMap = language.linkedCodeMaps.get(serviceScript.code);
            if (!linkedCodeMap) {
                continue;
            }
            const mappingOffset = (0, transform_1.getMappingOffset)(language, serviceScript);
            for (const linkedCodeOffset of linkedCodeMap.getLinkedOffsets(ref[1] - mappingOffset)) {
                process(ref[0], linkedCodeOffset + mappingOffset);
            }
        }
    }
}
function displayPartsToString(displayParts) {
    if (displayParts) {
        return displayParts.map(displayPart => displayPart.text).join('');
    }
    return '';
}
//# sourceMappingURL=proxyLanguageService.js.map