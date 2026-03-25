import { DocNodeKind, DocNode, type IDocNodeParsedParameters, type IDocNodeParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Kinds of TSDoc selectors.
 */
export declare enum SelectorKind {
    /**
     * Used in cases where the parser encounters a string that is incorrect but
     * valid enough that a DocMemberSelector node was created.
     */
    Error = "error",
    /**
     * System selectors are always all lower-case and belong to a set of predefined label names.
     */
    System = "system",
    /**
     * Index selectors are integer numbers.  They provide an alternative way of referencing
     * overloaded functions, based on the order in which the declarations appear in
     * a source file.
     *
     * @remarks
     * Warning:  Index selectors are not recommended; they are intended to provide a temporary
     * workaround for situations where an external library neglected to declare a `{@label}` tag
     * and cannot be easily fixed.
     */
    Index = "index",
    /**
     * Label selectors refer to labels created using the `{@label}` TSDoc tag.
     * The labels are always comprised of upper-case letters or numbers separated by underscores,
     * and the first character cannot be a number.
     */
    Label = "label"
}
/**
 * Constructor parameters for {@link DocMemberSelector}.
 */
export interface IDocMemberSelectorParameters extends IDocNodeParameters {
    selector: string;
}
/**
 * Constructor parameters for {@link DocMemberSelector}.
 */
export interface IDocMemberSelectorParsedParameters extends IDocNodeParsedParameters {
    selectorExcerpt: TokenSequence;
}
/**
 */
export declare class DocMemberSelector extends DocNode {
    private static readonly _likeIndexSelectorRegExp;
    private static readonly _indexSelectorRegExp;
    private static readonly _likeLabelSelectorRegExp;
    private static readonly _labelSelectorRegExp;
    private static readonly _likeSystemSelectorRegExp;
    private readonly _selector;
    private _selectorExcerpt;
    private readonly _selectorKind;
    private readonly _errorMessage;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocMemberSelectorParameters | IDocMemberSelectorParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The text representation of the selector.
     *
     * @remarks
     * For system selectors, it will be a predefined lower case name.
     * For label selectors, it will be an upper case name defined using the `{@label}` tag.
     * For index selectors, it will be a positive integer.
     */
    get selector(): string;
    /**
     * Indicates the kind of selector.
     */
    get selectorKind(): SelectorKind;
    /**
     * If the `selectorKind` is `SelectorKind.Error`, this string will be defined and provide
     * more detail about why the string was not valid.
     */
    get errorMessage(): string | undefined;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocMemberSelector.d.ts.map