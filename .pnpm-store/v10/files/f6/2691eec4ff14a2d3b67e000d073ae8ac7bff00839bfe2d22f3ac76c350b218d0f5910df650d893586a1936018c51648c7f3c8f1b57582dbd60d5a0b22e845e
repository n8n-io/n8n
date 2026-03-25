import { DocNodeKind, type IDocNodeParameters, DocNode, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocSoftBreak}.
 */
export interface IDocSoftBreakParameters extends IDocNodeParameters {
}
/**
 * Constructor parameters for {@link DocSoftBreak}.
 */
export interface IDocSoftBreakParsedParameters extends IDocNodeParsedParameters {
    softBreakExcerpt: TokenSequence;
}
/**
 * Instructs a renderer to insert an explicit newline in the output.
 * (Normally the renderer uses a formatting rule to determine where
 * lines should wrap.)
 *
 * @remarks
 * In HTML, a soft break is represented as an ASCII newline character (which does not
 * affect the web browser's view), whereas the hard break is the `<br />` element
 * (which starts a new line in the web browser's view).
 *
 * TSDoc follows the same conventions, except the renderer avoids emitting
 * two empty lines (because that could start a new CommonMark paragraph).
 */
export declare class DocSoftBreak extends DocNode {
    private readonly _softBreakExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocSoftBreakParameters | IDocSoftBreakParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocSoftBreak.d.ts.map