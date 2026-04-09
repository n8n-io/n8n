"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHoverEnabled = isHoverEnabled;
exports.isInlayHintsEnabled = isInlayHintsEnabled;
exports.isCodeLensEnabled = isCodeLensEnabled;
exports.isMonikerEnabled = isMonikerEnabled;
exports.isInlineValueEnabled = isInlineValueEnabled;
exports.isSemanticTokensEnabled = isSemanticTokensEnabled;
exports.isCallHierarchyEnabled = isCallHierarchyEnabled;
exports.isTypeHierarchyEnabled = isTypeHierarchyEnabled;
exports.isRenameEnabled = isRenameEnabled;
exports.isDefinitionEnabled = isDefinitionEnabled;
exports.isTypeDefinitionEnabled = isTypeDefinitionEnabled;
exports.isReferencesEnabled = isReferencesEnabled;
exports.isImplementationEnabled = isImplementationEnabled;
exports.isHighlightEnabled = isHighlightEnabled;
exports.isSymbolsEnabled = isSymbolsEnabled;
exports.isFoldingRangesEnabled = isFoldingRangesEnabled;
exports.isSelectionRangesEnabled = isSelectionRangesEnabled;
exports.isLinkedEditingEnabled = isLinkedEditingEnabled;
exports.isColorEnabled = isColorEnabled;
exports.isDocumentLinkEnabled = isDocumentLinkEnabled;
exports.isDiagnosticsEnabled = isDiagnosticsEnabled;
exports.isCodeActionsEnabled = isCodeActionsEnabled;
exports.isFormattingEnabled = isFormattingEnabled;
exports.isCompletionEnabled = isCompletionEnabled;
exports.isAutoInsertEnabled = isAutoInsertEnabled;
exports.isSignatureHelpEnabled = isSignatureHelpEnabled;
exports.shouldReportDiagnostics = shouldReportDiagnostics;
exports.resolveRenameNewName = resolveRenameNewName;
exports.resolveRenameEditText = resolveRenameEditText;
exports.findOverlapCodeRange = findOverlapCodeRange;
function isHoverEnabled(info) {
    return !!info.semantic;
}
function isInlayHintsEnabled(info) {
    return !!info.semantic;
}
function isCodeLensEnabled(info) {
    return !!info.semantic;
}
function isMonikerEnabled(info) {
    return !!info.semantic;
}
function isInlineValueEnabled(info) {
    return !!info.semantic;
}
function isSemanticTokensEnabled(info) {
    return typeof info.semantic === 'object'
        ? info.semantic.shouldHighlight?.() ?? true
        : !!info.semantic;
}
function isCallHierarchyEnabled(info) {
    return !!info.navigation;
}
function isTypeHierarchyEnabled(info) {
    return !!info.navigation;
}
function isRenameEnabled(info) {
    return typeof info.navigation === 'object'
        ? info.navigation.shouldRename?.() ?? true
        : !!info.navigation;
}
function isDefinitionEnabled(info) {
    return !!info.navigation;
}
function isTypeDefinitionEnabled(info) {
    return !!info.navigation;
}
function isReferencesEnabled(info) {
    return !!info.navigation;
}
function isImplementationEnabled(info) {
    return !!info.navigation;
}
function isHighlightEnabled(info) {
    return typeof info.navigation === 'object'
        ? info.navigation.shouldHighlight?.() ?? true
        : !!info.navigation;
}
function isSymbolsEnabled(info) {
    return !!info.structure;
}
function isFoldingRangesEnabled(info) {
    return !!info.structure;
}
function isSelectionRangesEnabled(info) {
    return !!info.structure;
}
function isLinkedEditingEnabled(info) {
    return !!info.structure;
}
function isColorEnabled(info) {
    return !!info.structure;
}
function isDocumentLinkEnabled(info) {
    return !!info.structure;
}
function isDiagnosticsEnabled(info) {
    return !!info.verification;
}
function isCodeActionsEnabled(info) {
    return !!info.verification;
}
function isFormattingEnabled(info) {
    return !!info.format;
}
function isCompletionEnabled(info) {
    return !!info.completion;
}
function isAutoInsertEnabled(info) {
    return !!info.completion;
}
function isSignatureHelpEnabled(info) {
    return !!info.completion;
}
// should...
function shouldReportDiagnostics(info, source, code) {
    return typeof info.verification === 'object'
        ? info.verification.shouldReport?.(source, code) ?? true
        : !!info.verification;
}
//  resolve...
function resolveRenameNewName(newName, info) {
    return typeof info.navigation === 'object'
        ? info.navigation.resolveRenameNewName?.(newName) ?? newName
        : newName;
}
function resolveRenameEditText(text, info) {
    return typeof info.navigation === 'object'
        ? info.navigation.resolveRenameEditText?.(text) ?? text
        : text;
}
function findOverlapCodeRange(start, end, map, filter) {
    let mappedStart;
    let mappedEnd;
    for (const [mapped, mapping] of map.toGeneratedLocation(start)) {
        if (filter(mapping.data)) {
            mappedStart = mapped;
            break;
        }
    }
    for (const [mapped, mapping] of map.toGeneratedLocation(end)) {
        if (filter(mapping.data)) {
            mappedEnd = mapped;
            break;
        }
    }
    if (mappedStart === undefined || mappedEnd === undefined) {
        for (const mapping of map.mappings) {
            if (filter(mapping.data)) {
                const mappingStart = mapping.sourceOffsets[0];
                const mappingEnd = mapping.sourceOffsets[mapping.sourceOffsets.length - 1]
                    + mapping.lengths[mapping.lengths.length - 1];
                const overlap = getOverlapRange(start, end, mappingStart, mappingEnd);
                if (overlap) {
                    const curMappedStart = (overlap.start - mappingStart) + mapping.generatedOffsets[0];
                    const lastGeneratedLength = (mapping.generatedLengths ?? mapping.lengths)[mapping.generatedOffsets.length - 1];
                    const curMappedEndOffset = Math.min(overlap.end - mapping.sourceOffsets[mapping.sourceOffsets.length - 1], lastGeneratedLength);
                    const curMappedEnd = mapping.generatedOffsets[mapping.generatedOffsets.length - 1] + curMappedEndOffset;
                    mappedStart = mappedStart === undefined ? curMappedStart : Math.min(mappedStart, curMappedStart);
                    mappedEnd = mappedEnd === undefined ? curMappedEnd : Math.max(mappedEnd, curMappedEnd);
                }
            }
        }
    }
    if (mappedStart !== undefined && mappedEnd !== undefined) {
        return {
            start: mappedStart,
            end: mappedEnd,
        };
    }
}
function getOverlapRange(range1Start, range1End, range2Start, range2End) {
    const start = Math.max(range1Start, range2Start);
    const end = Math.min(range1End, range2End);
    if (start > end) {
        return undefined;
    }
    return {
        start,
        end,
    };
}
//# sourceMappingURL=editor.js.map