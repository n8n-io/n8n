"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcerptBuilder = void 0;
const ts = __importStar(require("typescript"));
const api_extractor_model_1 = require("@microsoft/api-extractor-model");
const Span_1 = require("../analyzer/Span");
class ExcerptBuilder {
    /**
     * Appends a blank line to the `excerptTokens` list.
     * @param excerptTokens - The target token list to append to
     */
    static addBlankLine(excerptTokens) {
        let newlines = '\n\n';
        // If the existing text already ended with a newline, then only append one newline
        if (excerptTokens.length > 0) {
            const previousText = excerptTokens[excerptTokens.length - 1].text;
            if (/\n$/.test(previousText)) {
                newlines = '\n';
            }
        }
        excerptTokens.push({ kind: api_extractor_model_1.ExcerptTokenKind.Content, text: newlines });
    }
    /**
     * Appends the signature for the specified `AstDeclaration` to the `excerptTokens` list.
     * @param excerptTokens - The target token list to append to
     * @param nodesToCapture - A list of child nodes whose token ranges we want to capture
     */
    static addDeclaration(excerptTokens, astDeclaration, nodesToCapture, referenceGenerator) {
        let stopBeforeChildKind = undefined;
        switch (astDeclaration.declaration.kind) {
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
                // FirstPunctuation = "{"
                stopBeforeChildKind = ts.SyntaxKind.FirstPunctuation;
                break;
            case ts.SyntaxKind.ModuleDeclaration:
                // ModuleBlock = the "{ ... }" block
                stopBeforeChildKind = ts.SyntaxKind.ModuleBlock;
                break;
        }
        const span = new Span_1.Span(astDeclaration.declaration);
        const tokenRangesByNode = new Map();
        for (const excerpt of nodesToCapture || []) {
            if (excerpt.node) {
                tokenRangesByNode.set(excerpt.node, excerpt.tokenRange);
            }
        }
        ExcerptBuilder._buildSpan(excerptTokens, span, {
            referenceGenerator: referenceGenerator,
            startingNode: span.node,
            stopBeforeChildKind,
            tokenRangesByNode,
            lastAppendedTokenIsSeparator: false
        });
        ExcerptBuilder._condenseTokens(excerptTokens, [...tokenRangesByNode.values()]);
    }
    static createEmptyTokenRange() {
        return { startIndex: 0, endIndex: 0 };
    }
    static _buildSpan(excerptTokens, span, state) {
        if (span.kind === ts.SyntaxKind.JSDocComment) {
            // Discard any comments
            return true;
        }
        // Can this node start a excerpt?
        const capturedTokenRange = state.tokenRangesByNode.get(span.node);
        let excerptStartIndex = 0;
        if (capturedTokenRange) {
            // We will assign capturedTokenRange.startIndex to be the index of the next token to be appended
            excerptStartIndex = excerptTokens.length;
        }
        if (span.prefix) {
            let canonicalReference = undefined;
            if (span.kind === ts.SyntaxKind.Identifier) {
                const name = span.node;
                if (!ExcerptBuilder._isDeclarationName(name)) {
                    canonicalReference = state.referenceGenerator.getDeclarationReferenceForIdentifier(name);
                }
            }
            if (canonicalReference) {
                ExcerptBuilder._appendToken(excerptTokens, api_extractor_model_1.ExcerptTokenKind.Reference, span.prefix, canonicalReference);
            }
            else {
                ExcerptBuilder._appendToken(excerptTokens, api_extractor_model_1.ExcerptTokenKind.Content, span.prefix);
            }
            state.lastAppendedTokenIsSeparator = false;
        }
        for (const child of span.children) {
            if (span.node === state.startingNode) {
                if (state.stopBeforeChildKind && child.kind === state.stopBeforeChildKind) {
                    // We reached a child whose kind is stopBeforeChildKind, so stop traversing
                    return false;
                }
            }
            if (!this._buildSpan(excerptTokens, child, state)) {
                return false;
            }
        }
        if (span.suffix) {
            ExcerptBuilder._appendToken(excerptTokens, api_extractor_model_1.ExcerptTokenKind.Content, span.suffix);
            state.lastAppendedTokenIsSeparator = false;
        }
        if (span.separator) {
            ExcerptBuilder._appendToken(excerptTokens, api_extractor_model_1.ExcerptTokenKind.Content, span.separator);
            state.lastAppendedTokenIsSeparator = true;
        }
        // Are we building a excerpt?  If so, set its range
        if (capturedTokenRange) {
            capturedTokenRange.startIndex = excerptStartIndex;
            // We will assign capturedTokenRange.startIndex to be the index after the last token
            // that was appended so far. However, if the last appended token was a separator, omit
            // it from the range.
            let excerptEndIndex = excerptTokens.length;
            if (state.lastAppendedTokenIsSeparator) {
                excerptEndIndex--;
            }
            capturedTokenRange.endIndex = excerptEndIndex;
        }
        return true;
    }
    static _appendToken(excerptTokens, excerptTokenKind, text, canonicalReference) {
        if (text.length === 0) {
            return;
        }
        const excerptToken = { kind: excerptTokenKind, text: text };
        if (canonicalReference !== undefined) {
            excerptToken.canonicalReference = canonicalReference.toString();
        }
        excerptTokens.push(excerptToken);
    }
    /**
     * Condenses the provided excerpt tokens by merging tokens where possible. Updates the provided token ranges to
     * remain accurate after token merging.
     *
     * @remarks
     * For example, suppose we have excerpt tokens ["A", "B", "C"] and a token range [0, 2]. If the excerpt tokens
     * are condensed to ["AB", "C"], then the token range would be updated to [0, 1]. Note that merges are only
     * performed if they are compatible with the provided token ranges. In the example above, if our token range was
     * originally [0, 1], we would not be able to merge tokens "A" and "B".
     */
    static _condenseTokens(excerptTokens, tokenRanges) {
        // This set is used to quickly lookup a start or end index.
        const startOrEndIndices = new Set();
        for (const tokenRange of tokenRanges) {
            startOrEndIndices.add(tokenRange.startIndex);
            startOrEndIndices.add(tokenRange.endIndex);
        }
        for (let currentIndex = 1; currentIndex < excerptTokens.length; ++currentIndex) {
            while (currentIndex < excerptTokens.length) {
                const prevPrevToken = excerptTokens[currentIndex - 2]; // May be undefined
                const prevToken = excerptTokens[currentIndex - 1];
                const currentToken = excerptTokens[currentIndex];
                // The number of excerpt tokens that are merged in this iteration. We need this to determine
                // how to update the start and end indices of our token ranges.
                let mergeCount;
                // There are two types of merges that can occur. We only perform these merges if they are
                // compatible with all of our token ranges.
                if (prevPrevToken &&
                    prevPrevToken.kind === api_extractor_model_1.ExcerptTokenKind.Reference &&
                    prevToken.kind === api_extractor_model_1.ExcerptTokenKind.Content &&
                    prevToken.text.trim() === '.' &&
                    currentToken.kind === api_extractor_model_1.ExcerptTokenKind.Reference &&
                    !startOrEndIndices.has(currentIndex) &&
                    !startOrEndIndices.has(currentIndex - 1)) {
                    // If the current token is a reference token, the previous token is a ".", and the previous-
                    // previous token is a reference token, then merge all three tokens into a reference token.
                    //
                    // For example: Given ["MyNamespace" (R), ".", "MyClass" (R)], tokens "." and "MyClass" might
                    // be merged into "MyNamespace". The condensed token would be ["MyNamespace.MyClass" (R)].
                    prevPrevToken.text += prevToken.text + currentToken.text;
                    prevPrevToken.canonicalReference = currentToken.canonicalReference;
                    mergeCount = 2;
                    currentIndex--;
                }
                else if (
                // If the current and previous tokens are both content tokens, then merge the tokens into a
                // single content token. For example: Given ["export ", "declare class"], these tokens
                // might be merged into "export declare class".
                prevToken.kind === api_extractor_model_1.ExcerptTokenKind.Content &&
                    prevToken.kind === currentToken.kind &&
                    !startOrEndIndices.has(currentIndex)) {
                    prevToken.text += currentToken.text;
                    mergeCount = 1;
                }
                else {
                    // Otherwise, no merging can occur here. Continue to the next index.
                    break;
                }
                // Remove the now redundant excerpt token(s), as they were merged into a previous token.
                excerptTokens.splice(currentIndex, mergeCount);
                // Update the start and end indices for all token ranges based upon how many excerpt
                // tokens were merged and in what positions.
                for (const tokenRange of tokenRanges) {
                    if (tokenRange.startIndex > currentIndex) {
                        tokenRange.startIndex -= mergeCount;
                    }
                    if (tokenRange.endIndex > currentIndex) {
                        tokenRange.endIndex -= mergeCount;
                    }
                }
                // Clear and repopulate our set with the updated indices.
                startOrEndIndices.clear();
                for (const tokenRange of tokenRanges) {
                    startOrEndIndices.add(tokenRange.startIndex);
                    startOrEndIndices.add(tokenRange.endIndex);
                }
            }
        }
    }
    static _isDeclarationName(name) {
        return ExcerptBuilder._isDeclaration(name.parent) && name.parent.name === name;
    }
    static _isDeclaration(node) {
        switch (node.kind) {
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.VariableDeclaration:
            case ts.SyntaxKind.Parameter:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.ClassExpression:
            case ts.SyntaxKind.ModuleDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.TypeParameter:
            case ts.SyntaxKind.EnumMember:
            case ts.SyntaxKind.BindingElement:
                return true;
            default:
                return false;
        }
    }
}
exports.ExcerptBuilder = ExcerptBuilder;
//# sourceMappingURL=ExcerptBuilder.js.map