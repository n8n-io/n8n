import { DocNodeKind, DocNode, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocMemberIdentifier}.
 */
export interface IDocMemberIdentifierParameters extends IDocNodeParameters {
    identifier: string;
}
/**
 * Constructor parameters for {@link DocMemberIdentifier}.
 */
export interface IDocMemberIdentifierParsedParameters extends IDocNodeParsedParameters {
    leftQuoteExcerpt?: TokenSequence;
    identifierExcerpt: TokenSequence;
    rightQuoteExcerpt?: TokenSequence;
}
/**
 * A member identifier is part of a {@link DocMemberReference}.
 */
export declare class DocMemberIdentifier extends DocNode {
    private readonly _leftQuoteExcerpt;
    private _identifier;
    private readonly _identifierExcerpt;
    private readonly _rightQuoteExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocMemberIdentifierParameters | IDocMemberIdentifierParsedParameters);
    /**
     * Tests whether the input string can be used without quotes as a member identifier in a declaration reference.
     * If not, {@link DocMemberIdentifier.hasQuotes} will be required.
     *
     * @remarks
     * In order to be used without quotes, the string must follow the identifier syntax for ECMAScript / TypeScript,
     * and it must not be one of the reserved words used for system selectors (such as `instance`, `static`,
     * `constructor`, etc).
     */
    static isValidIdentifier(identifier: string): boolean;
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The identifier string without any quote encoding.
     *
     * @remarks
     * If the value is not a valid ECMAScript identifier, it will be quoted as a
     * string literal during rendering.
     */
    get identifier(): string;
    /**
     * Returns true if the identifier will be rendered as a quoted string literal
     * instead of as a programming language identifier.  This is required if the
     * `identifier` property is not a valid ECMAScript identifier.
     */
    get hasQuotes(): boolean;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocMemberIdentifier.d.ts.map