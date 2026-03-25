import { DocNodeKind, DocNode, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { DocDeclarationReference } from './DocDeclarationReference';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocMemberSymbol}.
 */
export interface IDocMemberSymbolParameters extends IDocNodeParameters {
    symbolReference: DocDeclarationReference;
}
/**
 * Constructor parameters for {@link DocMemberSymbol}.
 */
export interface IDocMemberSymbolParsedParameters extends IDocNodeParsedParameters {
    leftBracketExcerpt: TokenSequence;
    spacingAfterLeftBracketExcerpt?: TokenSequence;
    symbolReference: DocDeclarationReference;
    rightBracketExcerpt: TokenSequence;
}
/**
 * Represents a reference to an ECMAScript 6 symbol that is used
 * to identify a member declaration.
 *
 * @example
 *
 * In the declaration reference `{@link MyClass.([MySymbols.example]:instance)}`,
 * the member symbol `[MySymbols.example]` might be used to reference a property
 * of the class.
 */
export declare class DocMemberSymbol extends DocNode {
    private readonly _leftBracketExcerpt;
    private readonly _spacingAfterLeftBracketExcerpt;
    private readonly _symbolReference;
    private readonly _rightBracketExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocMemberSymbolParameters | IDocMemberSymbolParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The declaration reference for the ECMAScript 6 symbol that will act as
     * the identifier for the member.
     */
    get symbolReference(): DocDeclarationReference;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocMemberSymbol.d.ts.map