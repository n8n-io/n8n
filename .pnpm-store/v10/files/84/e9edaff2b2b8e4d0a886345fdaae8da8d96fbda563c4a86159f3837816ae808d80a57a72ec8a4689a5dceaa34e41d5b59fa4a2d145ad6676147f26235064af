import { DocNodeKind, type IDocNodeParameters, DocNode, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocCodeSpan}.
 */
export interface IDocCodeSpanParameters extends IDocNodeParameters {
    code: string;
}
/**
 * Constructor parameters for {@link DocCodeSpan}.
 */
export interface IDocCodeSpanParsedParameters extends IDocNodeParsedParameters {
    openingDelimiterExcerpt: TokenSequence;
    codeExcerpt: TokenSequence;
    closingDelimiterExcerpt: TokenSequence;
}
/**
 * Represents CommonMark-style code span, i.e. code surrounded by
 * backtick characters.
 */
export declare class DocCodeSpan extends DocNode {
    private readonly _openingDelimiterExcerpt;
    private _code;
    private readonly _codeExcerpt;
    private readonly _closingDelimiterExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocCodeSpanParameters | IDocCodeSpanParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The text that should be rendered as code, excluding the backtick delimiters.
     */
    get code(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocCodeSpan.d.ts.map