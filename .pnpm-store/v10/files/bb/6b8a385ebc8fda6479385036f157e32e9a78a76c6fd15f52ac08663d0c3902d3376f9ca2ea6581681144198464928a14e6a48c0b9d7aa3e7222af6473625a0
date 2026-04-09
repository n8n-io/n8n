"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSDocEmitter = void 0;
const DocNode_1 = require("../nodes/DocNode");
const DocNodeTransforms_1 = require("../transforms/DocNodeTransforms");
const StandardTags_1 = require("../details/StandardTags");
var LineState;
(function (LineState) {
    LineState[LineState["Closed"] = 0] = "Closed";
    LineState[LineState["StartOfLine"] = 1] = "StartOfLine";
    LineState[LineState["MiddleOfLine"] = 2] = "MiddleOfLine";
})(LineState || (LineState = {}));
/**
 * Renders a DocNode tree as a code comment.
 */
class TSDocEmitter {
    constructor() {
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
    renderComment(output, docComment) {
        this._emitCommentFraming = true;
        this._renderCompleteObject(output, docComment);
    }
    renderHtmlTag(output, htmlTag) {
        this._emitCommentFraming = false;
        this._renderCompleteObject(output, htmlTag);
    }
    renderDeclarationReference(output, declarationReference) {
        this._emitCommentFraming = false;
        this._renderCompleteObject(output, declarationReference);
    }
    _renderCompleteObject(output, docNode) {
        this._output = output;
        this._lineState = LineState.Closed;
        this._previousLineHadContent = false;
        this._hangingParagraph = false;
        this._renderNode(docNode);
        this._writeEnd();
    }
    _renderNode(docNode) {
        if (docNode === undefined) {
            return;
        }
        switch (docNode.kind) {
            case DocNode_1.DocNodeKind.Block:
                const docBlock = docNode;
                this._ensureLineSkipped();
                this._renderNode(docBlock.blockTag);
                if (docBlock.blockTag.tagNameWithUpperCase === StandardTags_1.StandardTags.returns.tagNameWithUpperCase ||
                    docBlock.blockTag.tagNameWithUpperCase === StandardTags_1.StandardTags.defaultValue.tagNameWithUpperCase) {
                    this._writeContent(' ');
                    this._hangingParagraph = true;
                }
                this._renderNode(docBlock.content);
                break;
            case DocNode_1.DocNodeKind.BlockTag:
                const docBlockTag = docNode;
                if (this._lineState === LineState.MiddleOfLine) {
                    this._writeContent(' ');
                }
                this._writeContent(docBlockTag.tagName);
                break;
            case DocNode_1.DocNodeKind.CodeSpan:
                const docCodeSpan = docNode;
                this._writeContent('`');
                this._writeContent(docCodeSpan.code);
                this._writeContent('`');
                break;
            case DocNode_1.DocNodeKind.Comment:
                const docComment = docNode;
                this._renderNodes([
                    docComment.summarySection,
                    docComment.remarksBlock,
                    docComment.privateRemarks,
                    docComment.deprecatedBlock,
                    docComment.params,
                    docComment.typeParams,
                    docComment.returnsBlock,
                    ...docComment.customBlocks,
                    ...docComment.seeBlocks,
                    docComment.inheritDocTag
                ]);
                if (docComment.modifierTagSet.nodes.length > 0) {
                    this._ensureLineSkipped();
                    this._renderNodes(docComment.modifierTagSet.nodes);
                }
                break;
            case DocNode_1.DocNodeKind.DeclarationReference:
                const docDeclarationReference = docNode;
                this._writeContent(docDeclarationReference.packageName);
                this._writeContent(docDeclarationReference.importPath);
                if (docDeclarationReference.packageName !== undefined ||
                    docDeclarationReference.importPath !== undefined) {
                    this._writeContent('#');
                }
                this._renderNodes(docDeclarationReference.memberReferences);
                break;
            case DocNode_1.DocNodeKind.ErrorText:
                const docErrorText = docNode;
                this._writeContent(docErrorText.text);
                break;
            case DocNode_1.DocNodeKind.EscapedText:
                const docEscapedText = docNode;
                this._writeContent(docEscapedText.encodedText);
                break;
            case DocNode_1.DocNodeKind.FencedCode:
                const docFencedCode = docNode;
                this._ensureAtStartOfLine();
                this._writeContent('```');
                this._writeContent(docFencedCode.language);
                this._writeNewline();
                this._writeContent(docFencedCode.code);
                this._writeContent('```');
                this._writeNewline();
                this._writeNewline();
                break;
            case DocNode_1.DocNodeKind.HtmlAttribute:
                const docHtmlAttribute = docNode;
                this._writeContent(docHtmlAttribute.name);
                this._writeContent(docHtmlAttribute.spacingAfterName);
                this._writeContent('=');
                this._writeContent(docHtmlAttribute.spacingAfterEquals);
                this._writeContent(docHtmlAttribute.value);
                this._writeContent(docHtmlAttribute.spacingAfterValue);
                break;
            case DocNode_1.DocNodeKind.HtmlEndTag:
                const docHtmlEndTag = docNode;
                this._writeContent('</');
                this._writeContent(docHtmlEndTag.name);
                this._writeContent('>');
                break;
            case DocNode_1.DocNodeKind.HtmlStartTag:
                const docHtmlStartTag = docNode;
                this._writeContent('<');
                this._writeContent(docHtmlStartTag.name);
                this._writeContent(docHtmlStartTag.spacingAfterName);
                let needsSpace = docHtmlStartTag.spacingAfterName === undefined || docHtmlStartTag.spacingAfterName.length === 0;
                for (const attribute of docHtmlStartTag.htmlAttributes) {
                    if (needsSpace) {
                        this._writeContent(' ');
                    }
                    this._renderNode(attribute);
                    needsSpace = attribute.spacingAfterValue === undefined || attribute.spacingAfterValue.length === 0;
                }
                this._writeContent(docHtmlStartTag.selfClosingTag ? '/>' : '>');
                break;
            case DocNode_1.DocNodeKind.InheritDocTag:
                const docInheritDocTag = docNode;
                this._renderInlineTag(docInheritDocTag, () => {
                    if (docInheritDocTag.declarationReference) {
                        this._writeContent(' ');
                        this._renderNode(docInheritDocTag.declarationReference);
                    }
                });
                break;
            case DocNode_1.DocNodeKind.InlineTag:
                const docInlineTag = docNode;
                this._renderInlineTag(docInlineTag, () => {
                    if (docInlineTag.tagContent.length > 0) {
                        this._writeContent(' ');
                        this._writeContent(docInlineTag.tagContent);
                    }
                });
                break;
            case DocNode_1.DocNodeKind.LinkTag:
                const docLinkTag = docNode;
                this._renderInlineTag(docLinkTag, () => {
                    if (docLinkTag.urlDestination !== undefined || docLinkTag.codeDestination !== undefined) {
                        if (docLinkTag.urlDestination !== undefined) {
                            this._writeContent(' ');
                            this._writeContent(docLinkTag.urlDestination);
                        }
                        else if (docLinkTag.codeDestination !== undefined) {
                            this._writeContent(' ');
                            this._renderNode(docLinkTag.codeDestination);
                        }
                    }
                    if (docLinkTag.linkText !== undefined) {
                        this._writeContent(' ');
                        this._writeContent('|');
                        this._writeContent(' ');
                        this._writeContent(docLinkTag.linkText);
                    }
                });
                break;
            case DocNode_1.DocNodeKind.MemberIdentifier:
                const docMemberIdentifier = docNode;
                if (docMemberIdentifier.hasQuotes) {
                    this._writeContent('"');
                    this._writeContent(docMemberIdentifier.identifier); // todo: encoding
                    this._writeContent('"');
                }
                else {
                    this._writeContent(docMemberIdentifier.identifier);
                }
                break;
            case DocNode_1.DocNodeKind.MemberReference:
                const docMemberReference = docNode;
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
            case DocNode_1.DocNodeKind.MemberSelector:
                const docMemberSelector = docNode;
                this._writeContent(docMemberSelector.selector);
                break;
            case DocNode_1.DocNodeKind.MemberSymbol:
                const docMemberSymbol = docNode;
                this._writeContent('[');
                this._renderNode(docMemberSymbol.symbolReference);
                this._writeContent(']');
                break;
            case DocNode_1.DocNodeKind.Section:
                const docSection = docNode;
                this._renderNodes(docSection.nodes);
                break;
            case DocNode_1.DocNodeKind.Paragraph:
                const trimmedParagraph = DocNodeTransforms_1.DocNodeTransforms.trimSpacesInParagraph(docNode);
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
            case DocNode_1.DocNodeKind.ParamBlock:
                const docParamBlock = docNode;
                this._ensureLineSkipped();
                this._renderNode(docParamBlock.blockTag);
                this._writeContent(' ');
                this._writeContent(docParamBlock.parameterName);
                this._writeContent(' - ');
                this._hangingParagraph = true;
                this._renderNode(docParamBlock.content);
                this._hangingParagraph = false;
                break;
            case DocNode_1.DocNodeKind.ParamCollection:
                const docParamCollection = docNode;
                this._renderNodes(docParamCollection.blocks);
                break;
            case DocNode_1.DocNodeKind.PlainText:
                const docPlainText = docNode;
                this._writeContent(docPlainText.text);
                break;
        }
    }
    _renderInlineTag(docInlineTagBase, writeInlineTagContent) {
        this._writeContent('{');
        this._writeContent(docInlineTagBase.tagName);
        writeInlineTagContent();
        this._writeContent('}');
    }
    _renderNodes(docNodes) {
        for (const docNode of docNodes) {
            this._renderNode(docNode);
        }
    }
    // Calls _writeNewline() only if we're not already at the start of a new line
    _ensureAtStartOfLine() {
        if (this._lineState === LineState.MiddleOfLine) {
            this._writeNewline();
        }
    }
    // Calls _writeNewline() if needed to ensure that we have skipped at least one line
    _ensureLineSkipped() {
        this._ensureAtStartOfLine();
        if (this._previousLineHadContent) {
            this._writeNewline();
        }
    }
    // Writes literal text content.  If it contains newlines, they will automatically be converted to
    // _writeNewline() calls, to ensure that "*" is written at the start of each line.
    _writeContent(content) {
        if (content === undefined || content.length === 0) {
            return;
        }
        const splitLines = content.split(/\r?\n/g);
        if (splitLines.length > 1) {
            let firstLine = true;
            for (const line of splitLines) {
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
    }
    // Starts a new line, and inserts "/**" or "*" as appropriate.
    _writeNewline() {
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
    }
    // Closes the comment, adding the final "*/" delimiter
    _writeEnd() {
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
    }
}
exports.TSDocEmitter = TSDocEmitter;
//# sourceMappingURL=TSDocEmitter.js.map