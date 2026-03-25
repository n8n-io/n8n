import { DocNodeKind, type DocNode } from './DocNode';
import type { DocDeclarationReference } from './DocDeclarationReference';
import { DocInlineTagBase, type IDocInlineTagBaseParsedParameters, type IDocInlineTagBaseParameters } from './DocInlineTagBase';
/**
 * Constructor parameters for {@link DocInheritDocTag}.
 */
export interface IDocInheritDocTagParameters extends IDocInlineTagBaseParameters {
    declarationReference?: DocDeclarationReference;
}
/**
 * Constructor parameters for {@link DocInheritDocTag}.
 */
export interface IDocInheritDocTagParsedParameters extends IDocInlineTagBaseParsedParameters {
    declarationReference?: DocDeclarationReference;
}
/**
 * Represents an `{@inheritDoc}` tag.
 */
export declare class DocInheritDocTag extends DocInlineTagBase {
    private readonly _declarationReference;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocInheritDocTagParameters | IDocInheritDocTagParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The declaration that the documentation will be inherited from.
     * If omitted, the documentation will be inherited from the parent class.
     */
    get declarationReference(): DocDeclarationReference | undefined;
    /** @override */
    protected getChildNodesForContent(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocInheritDocTag.d.ts.map