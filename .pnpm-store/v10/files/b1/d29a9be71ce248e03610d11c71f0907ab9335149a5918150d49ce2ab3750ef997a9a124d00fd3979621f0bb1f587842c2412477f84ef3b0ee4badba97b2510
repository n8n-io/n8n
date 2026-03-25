import type { TSDocTagDefinition } from './TSDocTagDefinition';
import { TSDocValidationConfiguration } from './TSDocValidationConfiguration';
import { DocNodeManager } from './DocNodeManager';
import { type TSDocMessageId } from '../parser/TSDocMessageId';
/**
 * Configuration for the TSDocParser.
 */
export declare class TSDocConfiguration {
    private readonly _tagDefinitions;
    private readonly _tagDefinitionsByName;
    private readonly _supportedTagDefinitions;
    private readonly _validation;
    private readonly _docNodeManager;
    private readonly _supportedHtmlElements;
    constructor();
    /**
     * Resets the `TSDocConfiguration` object to its initial empty state.
     * @param noStandardTags - The `TSDocConfiguration` constructor normally adds definitions for the
     * standard TSDoc tags.  Set `noStandardTags` to true for a completely empty `tagDefinitions` collection.
     */
    clear(noStandardTags?: boolean): void;
    /**
     * The TSDoc tags that are defined in this configuration.
     *
     * @remarks
     * The subset of "supported" tags is tracked by {@link TSDocConfiguration.supportedTagDefinitions}.
     */
    get tagDefinitions(): ReadonlyArray<TSDocTagDefinition>;
    /**
     * Returns the subset of {@link TSDocConfiguration.tagDefinitions}
     * that are supported in this configuration.
     *
     * @remarks
     * This property is only used when
     * {@link TSDocValidationConfiguration.reportUnsupportedTags} is enabled.
     */
    get supportedTagDefinitions(): ReadonlyArray<TSDocTagDefinition>;
    /**
     * Enable/disable validation checks performed by the parser.
     */
    get validation(): TSDocValidationConfiguration;
    /**
     * The HTML element names that are supported in this configuration. Used in conjunction with the `reportUnsupportedHtmlElements` setting.
     */
    get supportedHtmlElements(): string[];
    /**
     * Register custom DocNode subclasses.
     */
    get docNodeManager(): DocNodeManager;
    /**
     * Return the tag that was defined with the specified name, or undefined
     * if not found.
     */
    tryGetTagDefinition(tagName: string): TSDocTagDefinition | undefined;
    /**
     * Return the tag that was defined with the specified name, or undefined
     * if not found.
     */
    tryGetTagDefinitionWithUpperCase(alreadyUpperCaseTagName: string): TSDocTagDefinition | undefined;
    /**
     * Define a new TSDoc tag to be recognized by the TSDocParser, and mark it as unsupported.
     * Use {@link TSDocConfiguration.setSupportForTag} to mark it as supported.
     *
     * @remarks
     * If a tag is "defined" this means that the parser recognizes it and understands its syntax.
     * Whereas if a tag is "supported", this means it is defined AND the application implements the tag.
     */
    addTagDefinition(tagDefinition: TSDocTagDefinition): void;
    /**
     * Calls {@link TSDocConfiguration.addTagDefinition} for a list of definitions,
     * and optionally marks them as supported.
     * @param tagDefinitions - the definitions to be added
     * @param supported - if specified, calls the {@link TSDocConfiguration.setSupportForTag}
     *    method to mark the definitions as supported or unsupported
     */
    addTagDefinitions(tagDefinitions: ReadonlyArray<TSDocTagDefinition>, supported?: boolean | undefined): void;
    /**
     * Returns true if the tag is supported in this configuration.
     */
    isTagSupported(tagDefinition: TSDocTagDefinition): boolean;
    /**
     * Specifies whether the tag definition is supported in this configuration.
     * The parser may issue warnings for unsupported tags.
     *
     * @remarks
     * If a tag is "defined" this means that the parser recognizes it and understands its syntax.
     * Whereas if a tag is "supported", this means it is defined AND the application implements the tag.
     *
     * This function automatically sets {@link TSDocValidationConfiguration.reportUnsupportedTags}
     * to true.
     */
    setSupportForTag(tagDefinition: TSDocTagDefinition, supported: boolean): void;
    /**
     * Specifies whether the tag definition is supported in this configuration.
     * This operation sets {@link TSDocValidationConfiguration.reportUnsupportedTags} to `true`.
     *
     * @remarks
     * The parser may issue warnings for unsupported tags.
     * If a tag is "defined" this means that the parser recognizes it and understands its syntax.
     * Whereas if a tag is "supported", this means it is defined AND the application implements the tag.
     */
    setSupportForTags(tagDefinitions: ReadonlyArray<TSDocTagDefinition>, supported: boolean): void;
    /**
     * Assigns the `supportedHtmlElements` property, replacing any previous elements.
     * This operation sets {@link TSDocValidationConfiguration.reportUnsupportedHtmlElements} to `true`.
     */
    setSupportedHtmlElements(htmlTags: string[]): void;
    /**
     * Returns true if the html element is supported in this configuration.
     */
    isHtmlElementSupported(htmlTag: string): boolean;
    /**
     * Returns true if the specified {@link TSDocMessageId} string is implemented by this release of the TSDoc parser.
     * This can be used to detect misspelled identifiers.
     *
     * @privateRemarks
     *
     * Why this API is associated with TSDocConfiguration:  In the future, if we enable support for custom extensions
     * of the TSDoc parser, we may provide a way to register custom message identifiers.
     */
    isKnownMessageId(messageId: TSDocMessageId | string): boolean;
    /**
     * Returns the list of {@link TSDocMessageId} strings that are implemented by this release of the TSDoc parser.
     *
     * @privateRemarks
     *
     * Why this API is associated with TSDocConfiguration:  In the future, if we enable support for custom extensions
     * of the TSDoc parser, we may provide a way to register custom message identifiers.
     */
    get allTsdocMessageIds(): ReadonlyArray<TSDocMessageId>;
    private _requireTagToBeDefined;
}
//# sourceMappingURL=TSDocConfiguration.d.ts.map