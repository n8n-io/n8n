// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNode, DocNodeKind } from './DocNode';
import { TokenKind } from '../parser/Token';
/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Indicates the type of {@link DocExcerpt}.
 */
export var ExcerptKind;
(function (ExcerptKind) {
    ExcerptKind["Spacing"] = "Spacing";
    ExcerptKind["BlockTag"] = "BlockTag";
    ExcerptKind["CodeSpan_OpeningDelimiter"] = "CodeSpan_OpeningDelimiter";
    ExcerptKind["CodeSpan_Code"] = "CodeSpan_Code";
    ExcerptKind["CodeSpan_ClosingDelimiter"] = "CodeSpan_ClosingDelimiter";
    ExcerptKind["DeclarationReference_PackageName"] = "DeclarationReference_PackageName";
    ExcerptKind["DeclarationReference_ImportPath"] = "DeclarationReference_ImportPath";
    ExcerptKind["DeclarationReference_ImportHash"] = "DeclarationReference_ImportHash";
    /**
     * Input characters that were reported as an error and do not appear to be part of a valid expression.
     * A syntax highlighter might display them with an error color (e.g. red).
     */
    ExcerptKind["ErrorText"] = "ErrorText";
    /**
     * Input characters that do not conform to the TSDoc specification, but were recognized by the parser, for example
     * as a known JSDoc pattern.  A syntax highlighter should not display them with an error color (e.g. red)
     * because the error reporting may be suppressed for "lax" parsing of legacy source code.
     */
    ExcerptKind["NonstandardText"] = "NonstandardText";
    ExcerptKind["EscapedText"] = "EscapedText";
    ExcerptKind["FencedCode_OpeningFence"] = "FencedCode_OpeningFence";
    ExcerptKind["FencedCode_Language"] = "FencedCode_Language";
    ExcerptKind["FencedCode_Code"] = "FencedCode_Code";
    ExcerptKind["FencedCode_ClosingFence"] = "FencedCode_ClosingFence";
    ExcerptKind["HtmlAttribute_Name"] = "HtmlAttribute_Name";
    ExcerptKind["HtmlAttribute_Equals"] = "HtmlAttribute_Equals";
    ExcerptKind["HtmlAttribute_Value"] = "HtmlAttribute_Value";
    ExcerptKind["HtmlEndTag_OpeningDelimiter"] = "HtmlEndTag_OpeningDelimiter";
    ExcerptKind["HtmlEndTag_Name"] = "HtmlEndTag_Name";
    ExcerptKind["HtmlEndTag_ClosingDelimiter"] = "HtmlEndTag_ClosingDelimiter";
    ExcerptKind["HtmlStartTag_OpeningDelimiter"] = "HtmlStartTag_OpeningDelimiter";
    ExcerptKind["HtmlStartTag_Name"] = "HtmlStartTag_Name";
    ExcerptKind["HtmlStartTag_ClosingDelimiter"] = "HtmlStartTag_ClosingDelimiter";
    ExcerptKind["InlineTag_OpeningDelimiter"] = "InlineTag_OpeningDelimiter";
    ExcerptKind["InlineTag_TagName"] = "InlineTag_TagName";
    ExcerptKind["InlineTag_TagContent"] = "InlineTag_TagContent";
    ExcerptKind["InlineTag_ClosingDelimiter"] = "InlineTag_ClosingDelimiter";
    ExcerptKind["LinkTag_UrlDestination"] = "LinkTag_UrlDestination";
    ExcerptKind["LinkTag_Pipe"] = "LinkTag_Pipe";
    ExcerptKind["LinkTag_LinkText"] = "LinkTag_LinkText";
    ExcerptKind["MemberIdentifier_LeftQuote"] = "MemberIdentifier_LeftQuote";
    ExcerptKind["MemberIdentifier_Identifier"] = "MemberIdentifier_Identifier";
    ExcerptKind["MemberIdentifier_RightQuote"] = "MemberIdentifier_RightQuote";
    ExcerptKind["MemberReference_Dot"] = "MemberReference_Dot";
    ExcerptKind["MemberReference_LeftParenthesis"] = "MemberReference_LeftParenthesis";
    ExcerptKind["MemberReference_Colon"] = "MemberReference_Colon";
    ExcerptKind["MemberReference_RightParenthesis"] = "MemberReference_RightParenthesis";
    ExcerptKind["MemberSelector"] = "MemberSelector";
    ExcerptKind["DocMemberSymbol_LeftBracket"] = "DocMemberSymbol_LeftBracket";
    ExcerptKind["DocMemberSymbol_RightBracket"] = "DocMemberSymbol_RightBracket";
    ExcerptKind["ParamBlock_ParameterName"] = "ParamBlock_ParameterName";
    ExcerptKind["ParamBlock_Hyphen"] = "ParamBlock_Hyphen";
    ExcerptKind["PlainText"] = "PlainText";
    ExcerptKind["SoftBreak"] = "SoftBreak";
})(ExcerptKind || (ExcerptKind = {}));
/**
 * Represents a parsed token sequence.
 *
 * @remarks
 * When a `DocNode` is created by parsing a doc comment, it will have `DocExcerpt` child nodes corresponding to
 * the parsed syntax elements such as names, keywords, punctuation, and spaces.  These excerpts indicate the original
 * coordinates of the syntax element, and thus can be used for syntax highlighting and precise error reporting.
 * They could also be used to rewrite specific words in a source file (e.g. renaming a parameter) without disturbing
 * any other characters in the file.
 *
 * Every parsed character will correspond to at most one DocExcerpt object.  In other words, excerpts never overlap.
 * A given excerpt can span multiple comment lines, and it may contain gaps, for example to skip the `*` character
 * that starts a new TSDoc comment line.
 */
export class DocExcerpt extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (parameters.excerptKind === ExcerptKind.Spacing) {
            for (const token of parameters.content.tokens) {
                switch (token.kind) {
                    case TokenKind.Spacing:
                    case TokenKind.Newline:
                    case TokenKind.EndOfInput:
                        break;
                    default:
                        throw new Error(`The excerptKind=Spacing but the range contains a non-whitespace token`);
                }
            }
        }
        this._excerptKind = parameters.excerptKind;
        this._content = parameters.content;
    }
    /** @override */
    get kind() {
        return DocNodeKind.Excerpt;
    }
    /**
     * Indicates the kind of DocExcerpt.
     */
    get excerptKind() {
        return this._excerptKind;
    }
    /**
     * The input token sequence corresponding to this excerpt.
     * @remarks
     * Note that a token sequence can span multiple input lines and may contain gaps, for example to skip the `*`
     * character that starts a new TSDoc comment line.
     */
    get content() {
        return this._content;
    }
}
//# sourceMappingURL=DocExcerpt.js.map