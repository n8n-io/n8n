// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { DocNodeKind } from '../nodes/DocNode';
import { DocNodeTransforms } from '../transforms/DocNodeTransforms';
import { StandardTags } from '../details/StandardTags';
var LineState;
(function (LineState) {
    LineState[LineState["Closed"] = 0] = "Closed";
    LineState[LineState["StartOfLine"] = 1] = "StartOfLine";
    LineState[LineState["MiddleOfLine"] = 2] = "MiddleOfLine";
})(LineState || (LineState = {}));
/**
 * Renders a DocNode tree as a code comment.
 */
var TSDocEmitter = /** @class */ (function () {
    function TSDocEmitter() {
        this.eol = '\n';
        // Whether to emit the /** */ framing
        this._emitCommentFraming = true;
        // This state machine is used by the writer functions to generate the /** */ framing around the emitted lines
        this._lineState = LineState.Closed;
        // State for _ensureLineSkipped()
        this._previousLineHadContent = false;
        // Normally a paragraph is precede by a blank line (unless it's the first thing written).
        // But sometimes we want the paragraph to be attached to the previous element, e.g. when it's part of
        // an "@param" block.  Setting _hangingParagraph=true accomplishes that.
        this._hangingParagraph = false;
    }
    TSDocEmitter.prototype.renderComment = function (output, docComment) {
        this._emitCommentFraming = true;
        this._renderCompleteObject(output, docComment);
    };
    TSDocEmitter.prototype.renderHtmlTag = function (output, htmlTag) {
        this._emitCommentFraming = false;
        this._renderCompleteObject(output, htmlTag);
    };
    TSDocEmitter.prototype.renderDeclarationReference = function (output, declarationReference) {
        this._emitCommentFraming = false;
        this._renderCompleteObject(output, declarationReference);
    };
    TSDocEmitter.prototype._renderCompleteObject = function (output, docNode) {
        this._output = output;
        this._lineState = LineState.Closed;
        this._previousLineHadContent = false;
        this._hangingParagraph = false;
        this._renderNode(docNode);
        this._writeEnd();
    };
    TSDocEmitter.prototype._renderNode = function (docNode) {
        var _this = this;
        if (docNode === undefined) {
            return;
        }
        switch (docNode.kind) {
            case DocNodeKind.Block:
                var docBlock = docNode;
                this._ensureLineSkipped();
                this._renderNode(docBlock.blockTag);
                if (docBlock.blockTag.tagNameWithUpperCase === StandardTags.returns.tagNameWithUpperCase) {
                    this._writeContent(' ');
                    this._hangingParagraph = true;
                }
                this._renderNode(docBlock.content);
                break;
            case DocNodeKind.BlockTag:
                var docBlockTag = docNode;
                if (this._lineState === LineState.MiddleOfLine) {
                    this._writeContent(' ');
                }
                this._writeContent(docBlockTag.tagName);
                break;
            case DocNodeKind.CodeSpan:
                var docCodeSpan = docNode;
                this._writeContent('`');
                this._writeContent(docCodeSpan.code);
                this._writeContent('`');
                break;
            case DocNodeKind.Comment:
                var docComment = docNode;
                this._renderNodes(__spreadArray(__spreadArray(__spreadArray([
                    docComment.summarySection,
                    docComment.remarksBlock,
                    docComment.privateRemarks,
                    docComment.deprecatedBlock,
                    docComment.params,
                    docComment.typeParams,
                    docComment.returnsBlock
                ], docComment.customBlocks, true), docComment.seeBlocks, true), [
                    docComment.inheritDocTag
                ], false));
                if (docComment.modifierTagSet.nodes.length > 0) {
                    this._ensureLineSkipped();
                    this._renderNodes(docComment.modifierTagSet.nodes);
                }
                break;
            case DocNodeKind.DeclarationReference:
                var docDeclarationReference = docNode;
                this._writeContent(docDeclarationReference.packageName);
                this._writeContent(docDeclarationReference.importPath);
                if (docDeclarationReference.packageName !== undefined ||
                    docDeclarationReference.importPath !== undefined) {
                    this._writeContent('#');
                }
                this._renderNodes(docDeclarationReference.memberReferences);
                break;
            case DocNodeKind.ErrorText:
                var docErrorText = docNode;
                this._writeContent(docErrorText.text);
                break;
            case DocNodeKind.EscapedText:
                var docEscapedText = docNode;
                this._writeContent(docEscapedText.encodedText);
                break;
            case DocNodeKind.FencedCode:
                var docFencedCode = docNode;
                this._ensureAtStartOfLine();
                this._writeContent('```');
                this._writeContent(docFencedCode.language);
                this._writeNewline();
                this._writeContent(docFencedCode.code);
                this._writeContent('```');
                this._writeNewline();
                this._writeNewline();
                break;
            case DocNodeKind.HtmlAttribute:
                var docHtmlAttribute = docNode;
                this._writeContent(docHtmlAttribute.name);
                this._writeContent(docHtmlAttribute.spacingAfterName);
                this._writeContent('=');
                this._writeContent(docHtmlAttribute.spacingAfterEquals);
                this._writeContent(docHtmlAttribute.value);
                this._writeContent(docHtmlAttribute.spacingAfterValue);
                break;
            case DocNodeKind.HtmlEndTag:
                var docHtmlEndTag = docNode;
                this._writeContent('</');
                this._writeContent(docHtmlEndTag.name);
                this._writeContent('>');
                break;
            case DocNodeKind.HtmlStartTag:
                var docHtmlStartTag = docNode;
                this._writeContent('<');
                this._writeContent(docHtmlStartTag.name);
                this._writeContent(docHtmlStartTag.spacingAfterName);
                var needsSpace = docHtmlStartTag.spacingAfterName === undefined || docHtmlStartTag.spacingAfterName.length === 0;
                for (var _i = 0, _a = docHtmlStartTag.htmlAttributes; _i < _a.length; _i++) {
                    var attribute = _a[_i];
                    if (needsSpace) {
                        this._writeContent(' ');
                    }
                    this._renderNode(attribute);
                    needsSpace = attribute.spacingAfterValue === undefined || attribute.spacingAfterValue.length === 0;
                }
                this._writeContent(docHtmlStartTag.selfClosingTag ? '/>' : '>');
                break;
            case DocNodeKind.InheritDocTag:
                var docInheritDocTag_1 = docNode;
                this._renderInlineTag(docInheritDocTag_1, function () {
                    if (docInheritDocTag_1.declarationReference) {
                        _this._writeContent(' ');
                        _this._renderNode(docInheritDocTag_1.declarationReference);
                    }
                });
                break;
            case DocNodeKind.InlineTag:
                var docInlineTag_1 = docNode;
                this._renderInlineTag(docInlineTag_1, function () {
                    if (docInlineTag_1.tagContent.length > 0) {
                        _this._writeContent(' ');
                        _this._writeContent(docInlineTag_1.tagContent);
                    }
                });
                break;
            case DocNodeKind.LinkTag:
                var docLinkTag_1 = docNode;
                this._renderInlineTag(docLinkTag_1, function () {
                    if (docLinkTag_1.urlDestination !== undefined || docLinkTag_1.codeDestination !== undefined) {
                        if (docLinkTag_1.urlDestination !== undefined) {
                            _this._writeContent(' ');
                            _this._writeContent(docLinkTag_1.urlDestination);
                        }
                        else if (docLinkTag_1.codeDestination !== undefined) {
                            _this._writeContent(' ');
                            _this._renderNode(docLinkTag_1.codeDestination);
                        }
                    }
                    if (docLinkTag_1.linkText !== undefined) {
                        _this._writeContent(' ');
                        _this._writeContent('|');
                        _this._writeContent(' ');
                        _this._writeContent(docLinkTag_1.linkText);
                    }
                });
                break;
            case DocNodeKind.MemberIdentifier:
                var docMemberIdentifier = docNode;
                if (docMemberIdentifier.hasQuotes) {
                    this._writeContent('"');
                    this._writeContent(docMemberIdentifier.identifier); // todo: encoding
                    this._writeContent('"');
                }
                else {
                    this._writeContent(docMemberIdentifier.identifier);
                }
                break;
            case DocNodeKind.MemberReference:
                var docMemberReference = docNode;
                if (docMemberReference.hasDot) {
                    this._writeContent('.');
                }
                if (docMemberReference.selector) {
                    this._writeContent('(');
                }
                if (docMemberReference.memberSymbol) {
                    this._renderNode(docMemberReference.memberSymbol);
                }
                else {
                    this._renderNode(docMemberReference.memberIdentifier);
                }
                if (docMemberReference.selector) {
                    this._writeContent(':');
                    this._renderNode(docMemberReference.selector);
                    this._writeContent(')');
                }
                break;
            case DocNodeKind.MemberSelector:
                var docMemberSelector = docNode;
                this._writeContent(docMemberSelector.selector);
                break;
            case DocNodeKind.MemberSymbol:
                var docMemberSymbol = docNode;
                this._writeContent('[');
                this._renderNode(docMemberSymbol.symbolReference);
                this._writeContent(']');
                break;
            case DocNodeKind.Section:
                var docSection = docNode;
                this._renderNodes(docSection.nodes);
                break;
            case DocNodeKind.Paragraph:
                var trimmedParagraph = DocNodeTransforms.trimSpacesInParagraph(docNode);
                if (trimmedParagraph.nodes.length > 0) {
                    if (this._hangingParagraph) {
                        // If it's a hanging paragraph, then don't skip a line
                        this._hangingParagraph = false;
                    }
                    else {
                        this._ensureLineSkipped();
                    }
                    this._renderNodes(trimmedParagraph.nodes);
                    this._writeNewline();
                }
                break;
            case DocNodeKind.ParamBlock:
                var docParamBlock = docNode;
                this._ensureLineSkipped();
                this._renderNode(docParamBlock.blockTag);
                this._writeContent(' ');
                this._writeContent(docParamBlock.parameterName);
                this._writeContent(' - ');
                this._hangingParagraph = true;
                this._renderNode(docParamBlock.content);
                this._hangingParagraph = false;
                break;
            case DocNodeKind.ParamCollection:
                var docParamCollection = docNode;
                this._renderNodes(docParamCollection.blocks);
                break;
            case DocNodeKind.PlainText:
                var docPlainText = docNode;
                this._writeContent(docPlainText.text);
                break;
        }
    };
    TSDocEmitter.prototype._renderInlineTag = function (docInlineTagBase, writeInlineTagContent) {
        this._writeContent('{');
        this._writeContent(docInlineTagBase.tagName);
        writeInlineTagContent();
        this._writeContent('}');
    };
    TSDocEmitter.prototype._renderNodes = function (docNodes) {
        for (var _i = 0, docNodes_1 = docNodes; _i < docNodes_1.length; _i++) {
            var docNode = docNodes_1[_i];
            this._renderNode(docNode);
        }
    };
    // Calls _writeNewline() only if we're not already at the start of a new line
    TSDocEmitter.prototype._ensureAtStartOfLine = function () {
        if (this._lineState === LineState.MiddleOfLine) {
            this._writeNewline();
        }
    };
    // Calls _writeNewline() if needed to ensure that we have skipped at least one line
    TSDocEmitter.prototype._ensureLineSkipped = function () {
        this._ensureAtStartOfLine();
        if (this._previousLineHadContent) {
            this._writeNewline();
        }
    };
    // Writes literal text content.  If it contains newlines, they will automatically be converted to
    // _writeNewline() calls, to ensure that "*" is written at the start of each line.
    TSDocEmitter.prototype._writeContent = function (content) {
        if (content === undefined || content.length === 0) {
            return;
        }
        var splitLines = content.split(/\r?\n/g);
        if (splitLines.length > 1) {
            var firstLine = true;
            for (var _i = 0, splitLines_1 = splitLines; _i < splitLines_1.length; _i++) {
                var line = splitLines_1[_i];
                if (firstLine) {
                    firstLine = false;
                }
                else {
                    this._writeNewline();
                }
                this._writeContent(line);
            }
            return;
        }
        if (this._lineState === LineState.Closed) {
            if (this._emitCommentFraming) {
                this._output.append('/**' + this.eol + ' *');
            }
            this._lineState = LineState.StartOfLine;
        }
        if (this._lineState === LineState.StartOfLine) {
            if (this._emitCommentFraming) {
                this._output.append(' ');
            }
        }
        this._output.append(content);
        this._lineState = LineState.MiddleOfLine;
        this._previousLineHadContent = true;
    };
    // Starts a new line, and inserts "/**" or "*" as appropriate.
    TSDocEmitter.prototype._writeNewline = function () {
        if (this._lineState === LineState.Closed) {
            if (this._emitCommentFraming) {
                this._output.append('/**' + this.eol + ' *');
            }
            this._lineState = LineState.StartOfLine;
        }
        this._previousLineHadContent = this._lineState === LineState.MiddleOfLine;
        if (this._emitCommentFraming) {
            this._output.append(this.eol + ' *');
        }
        else {
            this._output.append(this.eol);
        }
        this._lineState = LineState.StartOfLine;
        this._hangingParagraph = false;
    };
    // Closes the comment, adding the final "*/" delimiter
    TSDocEmitter.prototype._writeEnd = function () {
        if (this._lineState === LineState.MiddleOfLine) {
            if (this._emitCommentFraming) {
                this._writeNewline();
            }
        }
        if (this._lineState !== LineState.Closed) {
            if (this._emitCommentFraming) {
                this._output.append('/' + this.eol);
            }
            this._lineState = LineState.Closed;
        }
    };
    return TSDocEmitter;
}());
export { TSDocEmitter };
//# sourceMappingURL=TSDocEmitter.js.map