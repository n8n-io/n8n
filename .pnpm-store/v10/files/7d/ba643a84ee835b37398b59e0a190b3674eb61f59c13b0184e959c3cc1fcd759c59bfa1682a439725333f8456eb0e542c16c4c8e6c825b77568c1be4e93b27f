import { DocNodeKind, DocNode } from './DocNode';
import { DocBlock, type IDocBlockParameters, type IDocBlockParsedParameters } from './DocBlock';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocParamBlock}.
 */
export interface IDocParamBlockParameters extends IDocBlockParameters {
    parameterName: string;
}
/**
 * Constructor parameters for {@link DocParamBlock}.
 */
export interface IDocParamBlockParsedParameters extends IDocBlockParsedParameters {
    spacingBeforeParameterNameExcerpt?: TokenSequence;
    unsupportedJsdocTypeBeforeParameterNameExcerpt?: TokenSequence;
    unsupportedJsdocOptionalNameOpenBracketExcerpt?: TokenSequence;
    parameterNameExcerpt: TokenSequence;
    parameterName: string;
    unsupportedJsdocOptionalNameRestExcerpt?: TokenSequence;
    spacingAfterParameterNameExcerpt?: TokenSequence;
    unsupportedJsdocTypeAfterParameterNameExcerpt?: TokenSequence;
    hyphenExcerpt?: TokenSequence;
    spacingAfterHyphenExcerpt?: TokenSequence;
    unsupportedJsdocTypeAfterHyphenExcerpt?: TokenSequence;
}
/**
 * Represents a parsed `@param` or `@typeParam` block, which provides a description for a
 * function parameter.
 */
export declare class DocParamBlock extends DocBlock {
    private readonly _spacingBeforeParameterNameExcerpt;
    private readonly _unsupportedJsdocTypeBeforeParameterNameExcerpt;
    private readonly _unsupportedJsdocOptionalNameOpenBracketExcerpt;
    private readonly _parameterName;
    private readonly _parameterNameExcerpt;
    private readonly _unsupportedJsdocOptionalNameRestExcerpt;
    private readonly _spacingAfterParameterNameExcerpt;
    private readonly _unsupportedJsdocTypeAfterParameterNameExcerpt;
    private readonly _hyphenExcerpt;
    private readonly _spacingAfterHyphenExcerpt;
    private readonly _unsupportedJsdocTypeAfterHyphenExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocParamBlockParameters | IDocParamBlockParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The name of the parameter that is being documented.
     * For example "width" in `@param width - the width of the object`.
     */
    get parameterName(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocParamBlock.d.ts.map