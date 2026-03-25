import type { DocParagraph } from '../nodes';
/**
 * Helper functions that transform DocNode trees.
 */
export declare class DocNodeTransforms {
    /**
     * trimSpacesInParagraphNodes() collapses extra spacing characters from plain text nodes.
     *
     * @remarks
     * This is useful when emitting HTML, where any number of spaces are equivalent
     * to a single space.  It's also useful when emitting Markdown, where spaces
     * can be misinterpreted as an indented code block.
     *
     * For example, we might transform this:
     *
     * ```
     * nodes: [
     *   { kind: PlainText, text: "   Here   are some   " },
     *   { kind: SoftBreak }
     *   { kind: PlainText, text: "   words" },
     *   { kind: SoftBreak }
     *   { kind: InlineTag, text: "{\@inheritDoc}" },
     *   { kind: PlainText, text: "to process." },
     *   { kind: PlainText, text: "  " },
     *   { kind: PlainText, text: "  " }
     * ]
     * ```
     *
     * ...to this:
     *
     * ```
     * nodes: [
     *   { kind: PlainText, text: "Here are some " },
     *   { kind: PlainText, text: "words " },
     *   { kind: InlineTag, text: "{\@inheritDoc}" },
     *   { kind: PlainText, text: "to process." }
     * ]
     * ```
     *
     * Note that in this example, `"words "` is not merged with the preceding node because
     * its DocPlainText.excerpt cannot span multiple lines.
     *
     * @param docParagraph - a DocParagraph containing nodes to be transformed
     * @returns The transformed child nodes.
     */
    static trimSpacesInParagraph(docParagraph: DocParagraph): DocParagraph;
}
//# sourceMappingURL=DocNodeTransforms.d.ts.map