import { DocNode, type IDocNodeParameters, DocNodeKind } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Indicates the type of {@link DocExcerpt}.
 */
export declare enum ExcerptKind {
    Spacing = "Spacing",
    BlockTag = "BlockTag",
    CodeSpan_OpeningDelimiter = "CodeSpan_OpeningDelimiter",
    CodeSpan_Code = "CodeSpan_Code",
    CodeSpan_ClosingDelimiter = "CodeSpan_ClosingDelimiter",
    DeclarationReference_PackageName = "DeclarationReference_PackageName",
    DeclarationReference_ImportPath = "DeclarationReference_ImportPath",
    DeclarationReference_ImportHash = "DeclarationReference_ImportHash",
    /**
     * Input characters that were reported as an error and do not appear to be part of a valid expression.
     * A syntax highlighter might display them with an error color (e.g. red).
     */
    ErrorText = "ErrorText",
    /**
     * Input characters that do not conform to the TSDoc specification, but were recognized by the parser, for example
     * as a known JSDoc pattern.  A syntax highlighter should not display them with an error color (e.g. red)
     * because the error reporting may be suppressed for "lax" parsing of legacy source code.
     */
    NonstandardText = "NonstandardText",
    EscapedText = "EscapedText",
    FencedCode_OpeningFence = "FencedCode_OpeningFence",
    FencedCode_Language = "FencedCode_Language",
    FencedCode_Code = "FencedCode_Code",
    FencedCode_ClosingFence = "FencedCode_ClosingFence",
    HtmlAttribute_Name = "HtmlAttribute_Name",
    HtmlAttribute_Equals = "HtmlAttribute_Equals",
    HtmlAttribute_Value = "HtmlAttribute_Value",
    HtmlEndTag_OpeningDelimiter = "HtmlEndTag_OpeningDelimiter",
    HtmlEndTag_Name = "HtmlEndTag_Name",
    HtmlEndTag_ClosingDelimiter = "HtmlEndTag_ClosingDelimiter",
    HtmlStartTag_OpeningDelimiter = "HtmlStartTag_OpeningDelimiter",
    HtmlStartTag_Name = "HtmlStartTag_Name",
    HtmlStartTag_ClosingDelimiter = "HtmlStartTag_ClosingDelimiter",
    InlineTag_OpeningDelimiter = "InlineTag_OpeningDelimiter",
    InlineTag_TagName = "InlineTag_TagName",
    InlineTag_TagContent = "InlineTag_TagContent",
    InlineTag_ClosingDelimiter = "InlineTag_ClosingDelimiter",
    LinkTag_UrlDestination = "LinkTag_UrlDestination",
    LinkTag_Pipe = "LinkTag_Pipe",
    LinkTag_LinkText = "LinkTag_LinkText",
    MemberIdentifier_LeftQuote = "MemberIdentifier_LeftQuote",
    MemberIdentifier_Identifier = "MemberIdentifier_Identifier",
    MemberIdentifier_RightQuote = "MemberIdentifier_RightQuote",
    MemberReference_Dot = "MemberReference_Dot",
    MemberReference_LeftParenthesis = "MemberReference_LeftParenthesis",
    MemberReference_Colon = "MemberReference_Colon",
    MemberReference_RightParenthesis = "MemberReference_RightParenthesis",
    MemberSelector = "MemberSelector",
    DocMemberSymbol_LeftBracket = "DocMemberSymbol_LeftBracket",
    DocMemberSymbol_RightBracket = "DocMemberSymbol_RightBracket",
    ParamBlock_ParameterName = "ParamBlock_ParameterName",
    ParamBlock_Hyphen = "ParamBlock_Hyphen",
    PlainText = "PlainText",
    SoftBreak = "SoftBreak"
}
/**
 * Constructor parameters for {@link DocExcerpt}.
 */
export interface IDocExcerptParameters extends IDocNodeParameters {
    excerptKind: ExcerptKind;
    content: TokenSequence;
}
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
export declare class DocExcerpt extends DocNode {
    private readonly _excerptKind;
    private readonly _content;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocExcerptParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * Indicates the kind of DocExcerpt.
     */
    get excerptKind(): ExcerptKind;
    /**
     * The input token sequence corresponding to this excerpt.
     * @remarks
     * Note that a token sequence can span multiple input lines and may contain gaps, for example to skip the `*`
     * character that starts a new TSDoc comment line.
     */
    get content(): TokenSequence;
}
//# sourceMappingURL=DocExcerpt.d.ts.map