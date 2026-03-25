"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenCoverageChecker = void 0;
var nodes_1 = require("../../nodes");
var TokenSequence_1 = require("../TokenSequence");
var Token_1 = require("../Token");
/**
 * The TokenCoverageChecker performs two diagnostics to detect parser bugs:
 * 1. It checks for two DocNode objects whose excerpt contains overlapping tokens.
 *    By design, a single character from the input stream should be associated with
 *    at most one TokenSequence.
 * 2. It checks for gaps, i.e. input tokens that were not associated with any DocNode
 *    (that is reachable from the final DocCommon node tree).  In some cases this is
 *    okay.  For example, if `@public` appears twice inside a comment, the second
 *    redundant instance is ignored.  But in general we want to track the gaps in the
 *    unit test snapshots to ensure in general that every input character is associated
 *    with an excerpt for a DocNode.
 */
var TokenCoverageChecker = /** @class */ (function () {
    function TokenCoverageChecker(parserContext) {
        this._parserContext = parserContext;
        this._tokenAssociations = [];
        this._tokenAssociations.length = parserContext.tokens.length;
    }
    TokenCoverageChecker.prototype.getGaps = function (rootNode) {
        this._addNodeTree(rootNode);
        return this._checkForGaps(false);
    };
    TokenCoverageChecker.prototype.reportGaps = function (rootNode) {
        this._addNodeTree(rootNode);
        this._checkForGaps(true);
    };
    TokenCoverageChecker.prototype._addNodeTree = function (node) {
        if (node instanceof nodes_1.DocExcerpt) {
            this._addSequence(node.content, node);
        }
        for (var _i = 0, _a = node.getChildNodes(); _i < _a.length; _i++) {
            var childNode = _a[_i];
            this._addNodeTree(childNode);
        }
    };
    TokenCoverageChecker.prototype._addSequence = function (tokenSequence, docNode) {
        var newTokenAssociation = { docNode: docNode, tokenSequence: tokenSequence };
        for (var i = tokenSequence.startIndex; i < tokenSequence.endIndex; ++i) {
            var tokenAssociation = this._tokenAssociations[i];
            if (tokenAssociation) {
                throw new Error("Overlapping content encountered between" +
                    " ".concat(this._formatTokenAssociation(tokenAssociation), " and") +
                    " ".concat(this._formatTokenAssociation(newTokenAssociation)));
            }
            this._tokenAssociations[i] = newTokenAssociation;
        }
    };
    TokenCoverageChecker.prototype._checkForGaps = function (reportGaps) {
        var gaps = [];
        var gapStartIndex = undefined;
        var tokenAssociationBeforeGap = undefined;
        var tokens = this._parserContext.tokens;
        if (tokens[tokens.length - 1].kind !== Token_1.TokenKind.EndOfInput) {
            throw new Error('Missing EndOfInput token');
        }
        for (var i = 0; i < this._parserContext.tokens.length - 1; ++i) {
            var tokenAssociation = this._tokenAssociations[i];
            if (gapStartIndex === undefined) {
                // No gap found yet
                if (tokenAssociation) {
                    tokenAssociationBeforeGap = tokenAssociation;
                }
                else {
                    // We found the start of a gap
                    gapStartIndex = i;
                }
            }
            else {
                // Is this the end of the gap?
                if (tokenAssociation) {
                    var gap = new TokenSequence_1.TokenSequence({
                        parserContext: this._parserContext,
                        startIndex: gapStartIndex,
                        endIndex: i
                    });
                    if (reportGaps) {
                        this._reportGap(gap, tokenAssociationBeforeGap, tokenAssociation);
                    }
                    gaps.push(gap);
                    gapStartIndex = undefined;
                    tokenAssociationBeforeGap = undefined;
                }
            }
        }
        if (gapStartIndex) {
            var gap = new TokenSequence_1.TokenSequence({
                parserContext: this._parserContext,
                startIndex: gapStartIndex,
                endIndex: this._parserContext.tokens.length
            });
            if (reportGaps) {
                this._reportGap(gap, tokenAssociationBeforeGap, undefined);
            }
            gaps.push(gap);
        }
        return gaps;
    };
    TokenCoverageChecker.prototype._reportGap = function (gap, tokenAssociationBeforeGap, tokenAssociationAfterGap) {
        var message = 'Gap encountered';
        if (tokenAssociationBeforeGap) {
            message += ' before ' + this._formatTokenAssociation(tokenAssociationBeforeGap);
        }
        if (tokenAssociationAfterGap) {
            message += ' after ' + this._formatTokenAssociation(tokenAssociationAfterGap);
        }
        message += ': ' + JSON.stringify(gap.toString());
        throw new Error(message);
    };
    TokenCoverageChecker.prototype._formatTokenAssociation = function (tokenAssociation) {
        return "".concat(tokenAssociation.docNode.kind, " (").concat(JSON.stringify(tokenAssociation.tokenSequence.toString()), ")");
    };
    return TokenCoverageChecker;
}());
exports.TokenCoverageChecker = TokenCoverageChecker;
//# sourceMappingURL=TokenCoverageChecker.js.map