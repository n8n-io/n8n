import type { TSDocConfiguration } from '@microsoft/tsdoc';
export declare enum ApiJsonSchemaVersion {
    /**
     * The initial release.
     */
    V_1000 = 1000,
    /**
     * Add support for type parameters and type alias types.
     */
    V_1001 = 1001,
    /**
     * Remove `canonicalReference` field.  This field was for diagnostic purposes only and was never deserialized.
     */
    V_1002 = 1002,
    /**
     * Reintroduce the `canonicalReference` field using the experimental new TSDoc declaration reference notation.
     *
     * This is not a breaking change because this field is never deserialized; it is provided for informational
     * purposes only.
     */
    V_1003 = 1003,
    /**
     * Add a `tsdocConfig` field that tracks the TSDoc configuration for parsing doc comments.
     *
     * This is not a breaking change because an older implementation will still work correctly.  The
     * custom tags will be skipped over by the parser.
     */
    V_1004 = 1004,
    /**
     * Add an `isOptional` field to `Parameter` and `TypeParameter` to track whether a function parameter is optional.
     *
     * When loading older JSON files, the value defaults to `false`.
     */
    V_1005 = 1005,
    /**
     * Add an `isProtected` field to `ApiConstructor`, `ApiMethod`, and `ApiProperty` to
     * track whether a class member has the `protected` modifier.
     *
     * Add an `isReadonly` field to `ApiProperty`, `ApiPropertySignature`, and `ApiVariable` to
     * track whether the item is readonly.
     *
     * When loading older JSON files, the values default to `false`.
     */
    V_1006 = 1006,
    /**
     * Add `ApiItemContainerMixin.preserveMemberOrder` to support enums that preserve their original sort order.
     *
     * When loading older JSON files, the value default to `false`.
     */
    V_1007 = 1007,
    /**
     * Add an `initializerTokenRange` field to `ApiProperty` and `ApiVariable` to track the item's
     * initializer.
     *
     * When loading older JSON files, this range is empty.
     */
    V_1008 = 1008,
    /**
     * Add an `isReadonly` field to `ApiIndexSignature` to track whether the item is readonly.
     *
     * When loading older JSON files, the values defaults to `false`.
     */
    V_1009 = 1009,
    /**
     * Add a `fileUrlPath` field to `ApiDeclaredItem` to track the URL to a declared item's source file.
     *
     * When loading older JSON files, the value defaults to `undefined`.
     */
    V_1010 = 1010,
    /**
     * Add an `isAbstract` field to `ApiClass`, `ApiMethod`, and `ApiProperty` to
     * track whether the item is abstract.
     *
     * When loading older JSON files, the value defaults to `false`.
     */
    V_1011 = 1011,
    /**
     * The current latest .api.json schema version.
     *
     * IMPORTANT: When incrementing this number, consider whether `OLDEST_SUPPORTED` or `OLDEST_FORWARDS_COMPATIBLE`
     * should be updated.
     */
    LATEST = 1011,
    /**
     * The oldest .api.json schema version that is still supported for backwards compatibility.
     *
     * This must be updated if you change to the file format and do not implement compatibility logic for
     * deserializing the older representation.
     */
    OLDEST_SUPPORTED = 1001,
    /**
     * Used to assign `IApiPackageMetadataJson.oldestForwardsCompatibleVersion`.
     *
     * This value must be \<= `ApiJsonSchemaVersion.LATEST`.  It must be reset to the `LATEST` value
     * if the older library would not be able to deserialize your new file format.  Adding a nonessential field
     * is generally okay.  Removing, modifying, or reinterpreting existing fields is NOT safe.
     */
    OLDEST_FORWARDS_COMPATIBLE = 1001
}
export declare class DeserializerContext {
    /**
     * The path of the file being deserialized, which may be useful for diagnostic purposes.
     */
    readonly apiJsonFilename: string;
    /**
     * Metadata from `IApiPackageMetadataJson.toolPackage`.
     */
    readonly toolPackage: string;
    /**
     * Metadata from `IApiPackageMetadataJson.toolVersion`.
     */
    readonly toolVersion: string;
    /**
     * The version of the schema being deserialized, as obtained from `IApiPackageMetadataJson.schemaVersion`.
     */
    readonly versionToDeserialize: ApiJsonSchemaVersion;
    /**
     * The TSDoc configuration for the context.
     */
    readonly tsdocConfiguration: TSDocConfiguration;
    constructor(options: DeserializerContext);
}
//# sourceMappingURL=DeserializerContext.d.ts.map