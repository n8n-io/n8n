// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind } from './DocNode';
import * as nodes from '..';
var BuiltInDocNodes = /** @class */ (function () {
    function BuiltInDocNodes() {
    }
    BuiltInDocNodes.register = function (configuration) {
        var docNodeManager = configuration.docNodeManager;
        docNodeManager.registerDocNodes('@microsoft/tsdoc', [
            { docNodeKind: DocNodeKind.Block, constructor: nodes.DocBlock },
            { docNodeKind: DocNodeKind.BlockTag, constructor: nodes.DocBlockTag },
            { docNodeKind: DocNodeKind.CodeSpan, constructor: nodes.DocCodeSpan },
            { docNodeKind: DocNodeKind.Comment, constructor: nodes.DocComment },
            { docNodeKind: DocNodeKind.DeclarationReference, constructor: nodes.DocDeclarationReference },
            { docNodeKind: DocNodeKind.ErrorText, constructor: nodes.DocErrorText },
            { docNodeKind: DocNodeKind.EscapedText, constructor: nodes.DocEscapedText },
            { docNodeKind: DocNodeKind.Excerpt, constructor: nodes.DocExcerpt },
            { docNodeKind: DocNodeKind.FencedCode, constructor: nodes.DocFencedCode },
            { docNodeKind: DocNodeKind.HtmlAttribute, constructor: nodes.DocHtmlAttribute },
            { docNodeKind: DocNodeKind.HtmlEndTag, constructor: nodes.DocHtmlEndTag },
            { docNodeKind: DocNodeKind.HtmlStartTag, constructor: nodes.DocHtmlStartTag },
            { docNodeKind: DocNodeKind.InheritDocTag, constructor: nodes.DocInheritDocTag },
            { docNodeKind: DocNodeKind.InlineTag, constructor: nodes.DocInlineTag },
            { docNodeKind: DocNodeKind.LinkTag, constructor: nodes.DocLinkTag },
            { docNodeKind: DocNodeKind.MemberIdentifier, constructor: nodes.DocMemberIdentifier },
            { docNodeKind: DocNodeKind.MemberReference, constructor: nodes.DocMemberReference },
            { docNodeKind: DocNodeKind.MemberSelector, constructor: nodes.DocMemberSelector },
            { docNodeKind: DocNodeKind.MemberSymbol, constructor: nodes.DocMemberSymbol },
            { docNodeKind: DocNodeKind.Paragraph, constructor: nodes.DocParagraph },
            { docNodeKind: DocNodeKind.ParamBlock, constructor: nodes.DocParamBlock },
            { docNodeKind: DocNodeKind.ParamCollection, constructor: nodes.DocParamCollection },
            { docNodeKind: DocNodeKind.PlainText, constructor: nodes.DocPlainText },
            { docNodeKind: DocNodeKind.Section, constructor: nodes.DocSection },
            { docNodeKind: DocNodeKind.SoftBreak, constructor: nodes.DocSoftBreak }
        ]);
        docNodeManager.registerAllowableChildren(DocNodeKind.Section, [
            DocNodeKind.FencedCode,
            DocNodeKind.Paragraph,
            DocNodeKind.HtmlStartTag,
            DocNodeKind.HtmlEndTag
        ]);
        docNodeManager.registerAllowableChildren(DocNodeKind.Paragraph, [
            DocNodeKind.BlockTag,
            DocNodeKind.CodeSpan,
            DocNodeKind.ErrorText,
            DocNodeKind.EscapedText,
            DocNodeKind.HtmlStartTag,
            DocNodeKind.HtmlEndTag,
            DocNodeKind.InlineTag,
            DocNodeKind.LinkTag,
            DocNodeKind.PlainText,
            DocNodeKind.SoftBreak
        ]);
    };
    return BuiltInDocNodes;
}());
export { BuiltInDocNodes };
//# sourceMappingURL=BuiltInDocNodes.js.map