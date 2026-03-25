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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuiltInDocNodes = void 0;
var DocNode_1 = require("./DocNode");
var nodes = __importStar(require(".."));
var BuiltInDocNodes = /** @class */ (function () {
    function BuiltInDocNodes() {
    }
    BuiltInDocNodes.register = function (configuration) {
        var docNodeManager = configuration.docNodeManager;
        docNodeManager.registerDocNodes('@microsoft/tsdoc', [
            { docNodeKind: DocNode_1.DocNodeKind.Block, constructor: nodes.DocBlock },
            { docNodeKind: DocNode_1.DocNodeKind.BlockTag, constructor: nodes.DocBlockTag },
            { docNodeKind: DocNode_1.DocNodeKind.CodeSpan, constructor: nodes.DocCodeSpan },
            { docNodeKind: DocNode_1.DocNodeKind.Comment, constructor: nodes.DocComment },
            { docNodeKind: DocNode_1.DocNodeKind.DeclarationReference, constructor: nodes.DocDeclarationReference },
            { docNodeKind: DocNode_1.DocNodeKind.ErrorText, constructor: nodes.DocErrorText },
            { docNodeKind: DocNode_1.DocNodeKind.EscapedText, constructor: nodes.DocEscapedText },
            { docNodeKind: DocNode_1.DocNodeKind.Excerpt, constructor: nodes.DocExcerpt },
            { docNodeKind: DocNode_1.DocNodeKind.FencedCode, constructor: nodes.DocFencedCode },
            { docNodeKind: DocNode_1.DocNodeKind.HtmlAttribute, constructor: nodes.DocHtmlAttribute },
            { docNodeKind: DocNode_1.DocNodeKind.HtmlEndTag, constructor: nodes.DocHtmlEndTag },
            { docNodeKind: DocNode_1.DocNodeKind.HtmlStartTag, constructor: nodes.DocHtmlStartTag },
            { docNodeKind: DocNode_1.DocNodeKind.InheritDocTag, constructor: nodes.DocInheritDocTag },
            { docNodeKind: DocNode_1.DocNodeKind.InlineTag, constructor: nodes.DocInlineTag },
            { docNodeKind: DocNode_1.DocNodeKind.LinkTag, constructor: nodes.DocLinkTag },
            { docNodeKind: DocNode_1.DocNodeKind.MemberIdentifier, constructor: nodes.DocMemberIdentifier },
            { docNodeKind: DocNode_1.DocNodeKind.MemberReference, constructor: nodes.DocMemberReference },
            { docNodeKind: DocNode_1.DocNodeKind.MemberSelector, constructor: nodes.DocMemberSelector },
            { docNodeKind: DocNode_1.DocNodeKind.MemberSymbol, constructor: nodes.DocMemberSymbol },
            { docNodeKind: DocNode_1.DocNodeKind.Paragraph, constructor: nodes.DocParagraph },
            { docNodeKind: DocNode_1.DocNodeKind.ParamBlock, constructor: nodes.DocParamBlock },
            { docNodeKind: DocNode_1.DocNodeKind.ParamCollection, constructor: nodes.DocParamCollection },
            { docNodeKind: DocNode_1.DocNodeKind.PlainText, constructor: nodes.DocPlainText },
            { docNodeKind: DocNode_1.DocNodeKind.Section, constructor: nodes.DocSection },
            { docNodeKind: DocNode_1.DocNodeKind.SoftBreak, constructor: nodes.DocSoftBreak }
        ]);
        docNodeManager.registerAllowableChildren(DocNode_1.DocNodeKind.Section, [
            DocNode_1.DocNodeKind.FencedCode,
            DocNode_1.DocNodeKind.Paragraph,
            DocNode_1.DocNodeKind.HtmlStartTag,
            DocNode_1.DocNodeKind.HtmlEndTag
        ]);
        docNodeManager.registerAllowableChildren(DocNode_1.DocNodeKind.Paragraph, [
            DocNode_1.DocNodeKind.BlockTag,
            DocNode_1.DocNodeKind.CodeSpan,
            DocNode_1.DocNodeKind.ErrorText,
            DocNode_1.DocNodeKind.EscapedText,
            DocNode_1.DocNodeKind.HtmlStartTag,
            DocNode_1.DocNodeKind.HtmlEndTag,
            DocNode_1.DocNodeKind.InlineTag,
            DocNode_1.DocNodeKind.LinkTag,
            DocNode_1.DocNodeKind.PlainText,
            DocNode_1.DocNodeKind.SoftBreak
        ]);
    };
    return BuiltInDocNodes;
}());
exports.BuiltInDocNodes = BuiltInDocNodes;
//# sourceMappingURL=BuiltInDocNodes.js.map