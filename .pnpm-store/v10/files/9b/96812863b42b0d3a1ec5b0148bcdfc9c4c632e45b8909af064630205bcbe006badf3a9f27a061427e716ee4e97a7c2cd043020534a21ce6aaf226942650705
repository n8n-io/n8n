import { DocNodeKind, type IDocNodeParsedParameters, DocNode } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocEscapedText}.
 */
export interface IDocEscapedTextParsedParameters extends IDocNodeParsedParameters {
    escapeStyle: EscapeStyle;
    encodedTextExcerpt: TokenSequence;
    decodedText: string;
}
/**
 * The style of escaping to be used with DocEscapedText.
 */
export declare enum EscapeStyle {
    /**
     * Use a backslash symbol to escape the character.
     */
    CommonMarkBackslash = 0
}
/**
 * Represents a text character that should be escaped as a TSDoc symbol.
 * @remarks
 * Note that renders will normally apply appropriate escaping when rendering
 * DocPlainText in a format such as HTML or TSDoc.  The DocEscapedText node
 * forces a specific escaping that may not be the default.
 */
export declare class DocEscapedText extends DocNode {
    private readonly _escapeStyle;
    private _encodedText;
    private readonly _encodedTextExcerpt;
    private readonly _decodedText;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocEscapedTextParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The style of escaping to be performed.
     */
    get escapeStyle(): EscapeStyle;
    /**
     * The text sequence including escapes.
     */
    get encodedText(): string;
    /**
     * The text without escaping.
     */
    get decodedText(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocEscapedText.d.ts.map