import { Standardization } from '../details/Standardization';
/**
 * Determines the type of syntax for a TSDocTagDefinition
 */
export declare enum TSDocTagSyntaxKind {
    /**
     * The tag is intended to be an inline tag.  For example: `{@link}`.
     */
    InlineTag = 0,
    /**
     * The tag is intended to be a block tag that starts a new documentation
     * section.  For example: `@remarks`
     */
    BlockTag = 1,
    /**
     * The tag is intended to be a modifier tag whose presence indicates
     * an aspect of the associated API item.  For example: `@internal`
     */
    ModifierTag = 2
}
/**
 * Constructor parameters for {@link TSDocTagDefinition}
 */
export interface ITSDocTagDefinitionParameters {
    tagName: string;
    syntaxKind: TSDocTagSyntaxKind;
    allowMultiple?: boolean;
}
/**
 * @internal
 */
export interface ITSDocTagDefinitionInternalParameters extends ITSDocTagDefinitionParameters {
    standardization: Standardization;
}
/**
 * Defines a TSDoc tag that will be understood by the TSDocParser.
 */
export declare class TSDocTagDefinition {
    /**
     * The TSDoc tag name.  TSDoc tag names start with an at-sign (`@`) followed
     * by ASCII letters using "camelCase" capitalization.
     */
    readonly tagName: string;
    /**
     * The TSDoc tag name in all capitals, which is used for performing
     * case-insensitive comparisons or lookups.
     */
    readonly tagNameWithUpperCase: string;
    /**
     * Specifies the expected syntax for this tag.
     */
    readonly syntaxKind: TSDocTagSyntaxKind;
    /**
     * Indicates the level of support expected from documentation tools that implement
     * the standard.
     */
    readonly standardization: Standardization;
    /**
     * If true, then this TSDoc tag may appear multiple times in a doc comment.
     * By default, a tag may only appear once.
     */
    readonly allowMultiple: boolean;
    constructor(parameters: ITSDocTagDefinitionParameters);
    /**
     * Throws an exception if `tagName` is not a valid TSDoc tag name.
     */
    static validateTSDocTagName(tagName: string): void;
}
//# sourceMappingURL=TSDocTagDefinition.d.ts.map