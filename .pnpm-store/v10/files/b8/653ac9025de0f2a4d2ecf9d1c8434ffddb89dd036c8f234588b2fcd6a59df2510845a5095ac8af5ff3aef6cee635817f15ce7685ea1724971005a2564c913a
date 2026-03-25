import { DocNodeKind, type IDocNodeParameters, type IDocNodeParsedParameters, DocNode } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocPlainText}.
 */
export interface IDocPlainTextParameters extends IDocNodeParameters {
    text: string;
}
/**
 * Constructor parameters for {@link DocPlainText}.
 */
export interface IDocPlainTextParsedParameters extends IDocNodeParsedParameters {
    textExcerpt: TokenSequence;
}
/**
 * Represents a span of comment text that is considered by the parser
 * to contain no special symbols or meaning.
 *
 * @remarks
 * The text content must not contain newline characters.
 * Use DocSoftBreak to represent manual line splitting.
 */
export declare class DocPlainText extends DocNode {
    private static readonly _newlineCharacterRegExp;
    private _text;
    private readonly _textExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocPlainTextParameters | IDocPlainTextParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The text content.
     */
    get text(): string;
    get textExcerpt(): TokenSequence | undefined;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocPlainText.d.ts.map