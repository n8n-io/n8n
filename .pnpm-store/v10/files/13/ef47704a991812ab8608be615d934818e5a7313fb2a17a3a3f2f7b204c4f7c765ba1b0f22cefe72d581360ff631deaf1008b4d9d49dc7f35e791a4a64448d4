/**
 * Unique identifiers for messages reported by API Extractor during its analysis.
 *
 * @remarks
 *
 * These strings are possible values for the {@link ExtractorMessage.messageId} property
 * when the `ExtractorMessage.category` is {@link ExtractorMessageCategory.Extractor}.
 *
 * @public
 */
export declare enum ExtractorMessageId {
    /**
     * "The doc comment should not contain more than one release tag."
     */
    ExtraReleaseTag = "ae-extra-release-tag",
    /**
     * "Missing documentation for ___."
     * @remarks
     * The `ae-undocumented` message is only generated if the API report feature is enabled.
     *
     * Because the API report file already annotates undocumented items with `// (undocumented)`,
     * the `ae-undocumented` message is not logged by default.  To see it, add a setting such as:
     * ```json
     * "messages": {
     *   "extractorMessageReporting": {
     *     "ae-undocumented": {
     *       "logLevel": "warning"
     *     }
     *   }
     *  }
     * ```
     */
    Undocumented = "ae-undocumented",
    /**
     * "This symbol has another declaration with a different release tag."
     */
    DifferentReleaseTags = "ae-different-release-tags",
    /**
     * "The symbol ___ is marked as ___, but its signature references ___ which is marked as ___."
     */
    IncompatibleReleaseTags = "ae-incompatible-release-tags",
    /**
     * "___ is part of the package's API, but it is missing a release tag (`@alpha`, `@beta`, `@public`, or `@internal`)."
     */
    MissingReleaseTag = "ae-missing-release-tag",
    /**
     * "The `@packageDocumentation` comment must appear at the top of entry point *.d.ts file."
     */
    MisplacedPackageTag = "ae-misplaced-package-tag",
    /**
     * "The symbol ___ needs to be exported by the entry point ___."
     */
    ForgottenExport = "ae-forgotten-export",
    /**
     * "The name ___ should be prefixed with an underscore because the declaration is marked as `@internal`."
     */
    InternalMissingUnderscore = "ae-internal-missing-underscore",
    /**
     * "Mixed release tags are not allowed for ___ because one of its declarations is marked as `@internal`."
     */
    InternalMixedReleaseTag = "ae-internal-mixed-release-tag",
    /**
     * "The `@preapproved` tag cannot be applied to ___ because it is not a supported declaration type."
     */
    PreapprovedUnsupportedType = "ae-preapproved-unsupported-type",
    /**
     * "The `@preapproved` tag cannot be applied to ___ without an `@internal` release tag."
     */
    PreapprovedBadReleaseTag = "ae-preapproved-bad-release-tag",
    /**
     * "The `@inheritDoc` reference could not be resolved."
     */
    UnresolvedInheritDocReference = "ae-unresolved-inheritdoc-reference",
    /**
     * "The `@inheritDoc` tag needs a TSDoc declaration reference; signature matching is not supported yet."
     *
     * @privateRemarks
     * In the future, we will implement signature matching so that you can write `{@inheritDoc}` and API Extractor
     * will find a corresponding member from a base class (or implemented interface).  Until then, the tag
     * always needs an explicit declaration reference such as `{@inhertDoc MyBaseClass.sameMethod}`.
     */
    UnresolvedInheritDocBase = "ae-unresolved-inheritdoc-base",
    /**
     * "The `@inheritDoc` tag for ___ refers to its own declaration."
     */
    CyclicInheritDoc = "ae-cyclic-inherit-doc",
    /**
     * "The `@link` reference could not be resolved."
     */
    UnresolvedLink = "ae-unresolved-link",
    /**
     * "The doc comment for the property ___ must appear on the getter, not the setter."
     */
    SetterWithDocs = "ae-setter-with-docs",
    /**
     * "The property ___ has a setter but no getter."
     */
    MissingGetter = "ae-missing-getter",
    /**
     * "Incorrect file type; API Extractor expects to analyze compiler outputs with the .d.ts file extension.
     * Troubleshooting tips: `https://api-extractor.com/link/dts-error`"
     */
    WrongInputFileType = "ae-wrong-input-file-type"
}
export declare const allExtractorMessageIds: Set<string>;
//# sourceMappingURL=ExtractorMessageId.d.ts.map