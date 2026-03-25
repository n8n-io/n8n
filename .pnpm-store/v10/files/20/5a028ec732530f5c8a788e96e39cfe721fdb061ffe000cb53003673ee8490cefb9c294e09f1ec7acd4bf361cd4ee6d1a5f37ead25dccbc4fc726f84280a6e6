import { DocSection, type DocNode } from '../nodes';
/**
 * The ParagraphSplitter is a secondary stage that runs after the NodeParser has constructed
 * the DocComment.  It splits DocParagraph nodes into multiple paragraphs by looking for
 * paragraph delimiters.  Following CommonMark conventions, paragraphs are delimited by
 * one or more blank lines.  (These lines end with SoftBreak nodes.)  The blank lines are
 * not discarded.  Instead, they are attached to the preceding paragraph.  If the DocParagraph
 * starts with blank lines, they are preserved to avoid creating a paragraph containing only
 * whitespace.
 */
export declare class ParagraphSplitter {
    private static readonly _whitespaceRegExp;
    /**
     * Split all paragraphs belonging to the provided subtree.
     */
    static splitParagraphs(node: DocNode): void;
    /**
     * Split all paragraphs belonging to the provided DocSection.
     */
    static splitParagraphsForSection(docSection: DocSection): void;
    private static _splitParagraph;
    private static _isWhitespace;
}
//# sourceMappingURL=ParagraphSplitter.d.ts.map