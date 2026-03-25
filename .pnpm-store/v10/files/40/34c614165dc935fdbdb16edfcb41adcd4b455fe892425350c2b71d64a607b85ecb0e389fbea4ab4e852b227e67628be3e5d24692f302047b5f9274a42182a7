import { DocNodeKind, DocNode, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
import type { TSDocMessageId } from '../parser/TSDocMessageId';
/**
 * Constructor parameters for {@link DocErrorText}.
 */
export interface IDocErrorTextParsedParameters extends IDocNodeParsedParameters {
    textExcerpt: TokenSequence;
    messageId: TSDocMessageId;
    errorMessage: string;
    errorLocation: TokenSequence;
}
/**
 * Represents a span of text that contained invalid markup.
 * The characters should be rendered as plain text.
 */
export declare class DocErrorText extends DocNode {
    private _text;
    private readonly _textExcerpt;
    private readonly _messageId;
    private readonly _errorMessage;
    private readonly _errorLocation;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocErrorTextParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The characters that should be rendered as plain text because they
     * could not be parsed successfully.
     */
    get text(): string;
    get textExcerpt(): TokenSequence | undefined;
    /**
     * The TSDoc error message identifier.
     */
    get messageId(): TSDocMessageId;
    /**
     * A description of why the character could not be parsed.
     */
    get errorMessage(): string;
    /**
     * The range of characters that caused the error.  In general these may be
     * somewhat farther ahead in the input stream from the DocErrorText node itself.
     *
     * @remarks
     * For example, for the malformed HTML tag `<a href="123" @ /a>`, the DocErrorText node
     * will correspond to the `<` character that looked like an HTML tag, whereas the
     * error location might be the `@` character that caused the trouble.
     */
    get errorLocation(): TokenSequence;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocErrorText.d.ts.map