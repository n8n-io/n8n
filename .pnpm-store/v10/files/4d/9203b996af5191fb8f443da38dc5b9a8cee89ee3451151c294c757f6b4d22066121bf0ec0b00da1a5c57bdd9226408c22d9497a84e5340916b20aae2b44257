import { DocNode, DocNodeKind, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { DocMemberIdentifier } from './DocMemberIdentifier';
import type { DocMemberSymbol } from './DocMemberSymbol';
import type { DocMemberSelector } from './DocMemberSelector';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocMemberReference}.
 */
export interface IDocMemberReferenceParameters extends IDocNodeParameters {
    hasDot: boolean;
    memberIdentifier?: DocMemberIdentifier;
    memberSymbol?: DocMemberSymbol;
    selector?: DocMemberSelector;
}
/**
 * Constructor parameters for {@link DocMemberReference}.
 */
export interface IDocMemberReferenceParsedParameters extends IDocNodeParsedParameters {
    dotExcerpt?: TokenSequence;
    spacingAfterDotExcerpt?: TokenSequence;
    leftParenthesisExcerpt?: TokenSequence;
    spacingAfterLeftParenthesisExcerpt?: TokenSequence;
    memberIdentifier?: DocMemberIdentifier;
    memberSymbol?: DocMemberSymbol;
    spacingAfterMemberExcerpt?: TokenSequence;
    colonExcerpt?: TokenSequence;
    spacingAfterColonExcerpt?: TokenSequence;
    selector?: DocMemberSelector;
    spacingAfterSelectorExcerpt?: TokenSequence;
    rightParenthesisExcerpt?: TokenSequence;
    spacingAfterRightParenthesisExcerpt?: TokenSequence;
}
/**
 * A {@link DocDeclarationReference | declaration reference} includes a chain of
 * member references represented using `DocMemberReference` nodes.
 *
 * @remarks
 * For example, `example-library#ui.controls.Button.(render:static)` is a
 * declaration reference that contains three member references:
 * `ui`, `.controls`, and `.Button`, and `.(render:static)`.
 */
export declare class DocMemberReference extends DocNode {
    private readonly _hasDot;
    private readonly _dotExcerpt;
    private readonly _spacingAfterDotExcerpt;
    private readonly _leftParenthesisExcerpt;
    private readonly _spacingAfterLeftParenthesisExcerpt;
    private readonly _memberIdentifier;
    private readonly _memberSymbol;
    private readonly _spacingAfterMemberExcerpt;
    private readonly _colonExcerpt;
    private readonly _spacingAfterColonExcerpt;
    private readonly _selector;
    private readonly _spacingAfterSelectorExcerpt;
    private readonly _rightParenthesisExcerpt;
    private readonly _spacingAfterRightParenthesisExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocMemberReferenceParameters | IDocMemberReferenceParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * True if this member reference is preceded by a dot (".") token.
     * It should be false only for the first member in the chain.
     */
    get hasDot(): boolean;
    /**
     * The identifier for the referenced member.
     * @remarks
     * Either `memberIdentifier` or `memberSymbol` may be specified, but not both.
     */
    get memberIdentifier(): DocMemberIdentifier | undefined;
    /**
     * The ECMAScript 6 symbol expression, which may be used instead of an identifier
     * to indicate the referenced member.
     * @remarks
     * Either `memberIdentifier` or `memberSymbol` may be specified, but not both.
     */
    get memberSymbol(): DocMemberSymbol | undefined;
    /**
     * A TSDoc selector, which may be optionally when the identifier or symbol is insufficient
     * to unambiguously determine the referenced declaration.
     */
    get selector(): DocMemberSelector | undefined;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocMemberReference.d.ts.map