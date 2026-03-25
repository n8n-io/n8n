"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeserializerContext = exports.ApiJsonSchemaVersion = void 0;
var ApiJsonSchemaVersion;
(function (ApiJsonSchemaVersion) {
    /**
     * The initial release.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1000"] = 1000] = "V_1000";
    /**
     * Add support for type parameters and type alias types.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1001"] = 1001] = "V_1001";
    /**
     * Remove `canonicalReference` field.  This field was for diagnostic purposes only and was never deserialized.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1002"] = 1002] = "V_1002";
    /**
     * Reintroduce the `canonicalReference` field using the experimental new TSDoc declaration reference notation.
     *
     * This is not a breaking change because this field is never deserialized; it is provided for informational
     * purposes only.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1003"] = 1003] = "V_1003";
    /**
     * Add a `tsdocConfig` field that tracks the TSDoc configuration for parsing doc comments.
     *
     * This is not a breaking change because an older implementation will still work correctly.  The
     * custom tags will be skipped over by the parser.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1004"] = 1004] = "V_1004";
    /**
     * Add an `isOptional` field to `Parameter` and `TypeParameter` to track whether a function parameter is optional.
     *
     * When loading older JSON files, the value defaults to `false`.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1005"] = 1005] = "V_1005";
    /**
     * Add an `isProtected` field to `ApiConstructor`, `ApiMethod`, and `ApiProperty` to
     * track whether a class member has the `protected` modifier.
     *
     * Add an `isReadonly` field to `ApiProperty`, `ApiPropertySignature`, and `ApiVariable` to
     * track whether the item is readonly.
     *
     * When loading older JSON files, the values default to `false`.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1006"] = 1006] = "V_1006";
    /**
     * Add `ApiItemContainerMixin.preserveMemberOrder` to support enums that preserve their original sort order.
     *
     * When loading older JSON files, the value default to `false`.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1007"] = 1007] = "V_1007";
    /**
     * Add an `initializerTokenRange` field to `ApiProperty` and `ApiVariable` to track the item's
     * initializer.
     *
     * When loading older JSON files, this range is empty.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1008"] = 1008] = "V_1008";
    /**
     * Add an `isReadonly` field to `ApiIndexSignature` to track whether the item is readonly.
     *
     * When loading older JSON files, the values defaults to `false`.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1009"] = 1009] = "V_1009";
    /**
     * Add a `fileUrlPath` field to `ApiDeclaredItem` to track the URL to a declared item's source file.
     *
     * When loading older JSON files, the value defaults to `undefined`.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1010"] = 1010] = "V_1010";
    /**
     * Add an `isAbstract` field to `ApiClass`, `ApiMethod`, and `ApiProperty` to
     * track whether the item is abstract.
     *
     * When loading older JSON files, the value defaults to `false`.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["V_1011"] = 1011] = "V_1011";
    /**
     * The current latest .api.json schema version.
     *
     * IMPORTANT: When incrementing this number, consider whether `OLDEST_SUPPORTED` or `OLDEST_FORWARDS_COMPATIBLE`
     * should be updated.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["LATEST"] = 1011] = "LATEST";
    /**
     * The oldest .api.json schema version that is still supported for backwards compatibility.
     *
     * This must be updated if you change to the file format and do not implement compatibility logic for
     * deserializing the older representation.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["OLDEST_SUPPORTED"] = 1001] = "OLDEST_SUPPORTED";
    /**
     * Used to assign `IApiPackageMetadataJson.oldestForwardsCompatibleVersion`.
     *
     * This value must be \<= `ApiJsonSchemaVersion.LATEST`.  It must be reset to the `LATEST` value
     * if the older library would not be able to deserialize your new file format.  Adding a nonessential field
     * is generally okay.  Removing, modifying, or reinterpreting existing fields is NOT safe.
     */
    ApiJsonSchemaVersion[ApiJsonSchemaVersion["OLDEST_FORWARDS_COMPATIBLE"] = 1001] = "OLDEST_FORWARDS_COMPATIBLE";
})(ApiJsonSchemaVersion || (exports.ApiJsonSchemaVersion = ApiJsonSchemaVersion = {}));
class DeserializerContext {
    constructor(options) {
        this.apiJsonFilename = options.apiJsonFilename;
        this.toolPackage = options.toolPackage;
        this.toolVersion = options.toolVersion;
        this.versionToDeserialize = options.versionToDeserialize;
        this.tsdocConfiguration = options.tsdocConfiguration;
    }
}
exports.DeserializerContext = DeserializerContext;
//# sourceMappingURL=DeserializerContext.js.map