import { DocNodeKind, type DocNode } from './DocNode';
import { DocNodeContainer, type IDocNodeContainerParameters } from './DocNodeContainer';
/**
 * Constructor parameters for {@link DocParagraph}.
 */
export interface IDocParagraphParameters extends IDocNodeContainerParameters {
}
/**
 * Represents a paragraph of text, similar to a `<p>` element in HTML.
 * Like CommonMark, the TSDoc syntax uses blank lines to delineate paragraphs
 * instead of explicitly notating them.
 */
export declare class DocParagraph extends DocNodeContainer {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocParagraphParameters, childNodes?: ReadonlyArray<DocNode>);
    /** @override */
    get kind(): DocNodeKind | string;
}
//# sourceMappingURL=DocParagraph.d.ts.map