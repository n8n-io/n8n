import { DocNode, DocNodeKind, type IDocNodeParameters } from './DocNode';
import { DocSection } from './DocSection';
import { StandardModifierTagSet } from '../details/StandardModifierTagSet';
import type { DocBlock } from './DocBlock';
import type { DocInheritDocTag } from './DocInheritDocTag';
import { DocParamCollection } from './DocParamCollection';
/**
 * Constructor parameters for {@link DocComment}.
 */
export interface IDocCommentParameters extends IDocNodeParameters {
}
/**
 * Represents an entire documentation comment conforming to the TSDoc structure.
 * This is the root of the DocNode tree.
 */
export declare class DocComment extends DocNode {
    /**
     * The main documentation for an API item is separated into a brief "summary" section,
     * optionally followed by an `@remarks` block containing additional details.
     *
     * @remarks
     * The summary section should be brief. On a documentation web site, it will be shown
     * on a page that lists summaries for many different API items.  On a detail page for
     * a single item, the summary will be shown followed by the remarks section (if any).
     */
    summarySection: DocSection;
    /**
     * The main documentation for an API item is separated into a brief "summary" section
     * optionally followed by an `@remarks` block containing additional details.
     *
     * @remarks
     * Unlike the summary, the remarks block may contain lengthy documentation content.
     * The remarks should not restate information from the summary, since the summary section
     * will always be displayed wherever the remarks section appears.  Other sections
     * (e.g. an `@example` block) will be shown after the remarks section.
     */
    remarksBlock: DocBlock | undefined;
    /**
     * The `@privateRemarks` tag starts a block of additional commentary that is not meant
     * for an external audience.  A documentation tool must omit this content from an
     * API reference web site.  It should also be omitted when generating a normalized
     * *.d.ts file intended for third-party developers.
     *
     * @remarks
     * A similar effect could be accomplished by enclosing content inside CommonMark
     * `<!-- -->` comments, or by moving the content into a separate `//` TypeScript comment.
     * However, the `@privateRemarks` tag is a more formal convention.
     */
    privateRemarks: DocBlock | undefined;
    /**
     * If present, this block indicates that an API item is no loner supported and may be
     * removed in a future release.  The `@deprecated` tag must be followed by a sentence
     * describing the recommended alternative.  Deprecation recursively applies to members
     * of a container.  For example, if a class is deprecated, then so are all of its members.
     */
    deprecatedBlock: DocBlock | undefined;
    /**
     * The collection of parsed `@param` blocks for this doc comment.
     */
    readonly params: DocParamCollection;
    /**
     * The collection of parsed `@typeParam` blocks for this doc comment.
     */
    readonly typeParams: DocParamCollection;
    /**
     * The `@returns` block for this doc comment, or undefined if there is not one.
     */
    returnsBlock: DocBlock | undefined;
    /**
     * If this doc comment contains an `@inheritDoc` tag, it will be extracted and associated
     * with the DocComment.
     */
    inheritDocTag: DocInheritDocTag | undefined;
    /**
     * The modifier tags for this DocComment.
     */
    readonly modifierTagSet: StandardModifierTagSet;
    private _seeBlocks;
    private _customBlocks;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocCommentParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The collection of all `@see` DockBlockTag nodes belonging to this doc comment.
     */
    get seeBlocks(): ReadonlyArray<DocBlock>;
    /**
     * The collection of all DocBlock nodes belonging to this doc comment.
     */
    get customBlocks(): ReadonlyArray<DocBlock>;
    /**
     * Append an item to the seeBlocks collection.
     * @internal
     */
    _appendSeeBlock(block: DocBlock): void;
    /**
     * Append an item to the customBlocks collection.
     */
    appendCustomBlock(block: DocBlock): void;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
    /**
     * Generates a doc comment corresponding to the `DocComment` tree.  The output is in a normalized form,
     * and may ignore formatting/spacing from the original input.
     *
     * @remarks
     * After parsing a string, and possibly modifying the result, `emitAsTsdoc()` can be used to render the result
     * as a doc comment in a normalized format.  It can also be used to emit a `DocComment` tree that was constructed
     * manually.
     *
     * This method is provided as convenience for simple use cases.  To customize the output, or if you need
     * to render into a `StringBuilder`, use the {@link TSDocEmitter} class instead.
     */
    emitAsTsdoc(): string;
}
//# sourceMappingURL=DocComment.d.ts.map