import { DocNodeKind, type IDocNodeParameters, DocNode, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocFencedCode}.
 */
export interface IDocFencedCodeParameters extends IDocNodeParameters {
    language: string;
    code: string;
}
/**
 * Constructor parameters for {@link DocFencedCode}.
 */
export interface IDocFencedCodeParsedParameters extends IDocNodeParsedParameters {
    openingFenceExcerpt: TokenSequence;
    spacingAfterOpeningFenceExcerpt?: TokenSequence;
    languageExcerpt?: TokenSequence;
    spacingAfterLanguageExcerpt?: TokenSequence;
    codeExcerpt: TokenSequence;
    spacingBeforeClosingFenceExcerpt?: TokenSequence;
    closingFenceExcerpt: TokenSequence;
    spacingAfterClosingFenceExcerpt?: TokenSequence;
}
/**
 * Represents CommonMark-style code fence, i.e. a block of program code that
 * starts and ends with a line comprised of three backticks.  The opening delimiter
 * can also specify a language for a syntax highlighter.
 */
export declare class DocFencedCode extends DocNode {
    private readonly _openingFenceExcerpt;
    private readonly _spacingAfterOpeningFenceExcerpt;
    private _language;
    private readonly _languageExcerpt;
    private readonly _spacingAfterLanguageExcerpt;
    private _code;
    private readonly _codeExcerpt;
    private readonly _spacingBeforeClosingFenceExcerpt;
    private readonly _closingFenceExcerpt;
    private readonly _spacingAfterClosingFenceExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocFencedCodeParameters | IDocFencedCodeParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * A name that can optionally be included after the opening code fence delimiter,
     * on the same line as the three backticks.  This name indicates the programming language
     * for the code, which a syntax highlighter may use to style the code block.
     *
     * @remarks
     * The TSDoc standard requires that the language "ts" should be interpreted to mean TypeScript.
     * Other languages names may be supported, but this is implementation dependent.
     *
     * CommonMark refers to this field as the "info string".
     *
     * @privateRemarks
     * Examples of language strings supported by GitHub flavored markdown:
     * https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml
     */
    get language(): string | 'ts' | '';
    /**
     * The text that should be rendered as code.
     */
    get code(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocFencedCode.d.ts.map