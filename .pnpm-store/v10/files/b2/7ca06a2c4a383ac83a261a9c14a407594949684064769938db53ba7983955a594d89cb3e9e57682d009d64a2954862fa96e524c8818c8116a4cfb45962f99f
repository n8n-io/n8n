import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind, type IApiItemJson } from '../items/ApiItem';
import { ApiItemContainerMixin, type IApiItemContainerMixinOptions } from '../mixins/ApiItemContainerMixin';
import { type IJsonFileSaveOptions, type JsonObject } from '@rushstack/node-core-library';
import { ApiDocumentedItem, type IApiDocumentedItemOptions } from '../items/ApiDocumentedItem';
import type { ApiEntryPoint } from './ApiEntryPoint';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { DeserializerContext, ApiJsonSchemaVersion } from './DeserializerContext';
import { TSDocConfiguration } from '@microsoft/tsdoc';
/**
 * Constructor options for {@link ApiPackage}.
 * @public
 */
export interface IApiPackageOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiDocumentedItemOptions {
    tsdocConfiguration: TSDocConfiguration;
    projectFolderUrl?: string;
}
export interface IApiPackageMetadataJson {
    /**
     * The NPM package name for the tool that wrote the *.api.json file.
     * For informational purposes only.
     */
    toolPackage: string;
    /**
     * The NPM package version for the tool that wrote the *.api.json file.
     * For informational purposes only.
     */
    toolVersion: string;
    /**
     * The schema version for the .api.json file format.  Used for determining whether the file format is
     * supported, and for backwards compatibility.
     */
    schemaVersion: ApiJsonSchemaVersion;
    /**
     * To support forwards compatibility, the `oldestForwardsCompatibleVersion` field tracks the oldest schema version
     * whose corresponding deserializer could safely load this file.
     *
     * @remarks
     * Normally api-extractor-model should refuse to load a schema version that is newer than the latest version
     * that its deserializer understands.  However, sometimes a schema change may merely introduce some new fields
     * without modifying or removing any existing fields.  In this case, an older api-extractor-model library can
     * safely deserialize the newer version (by ignoring the extra fields that it doesn't recognize).  The newer
     * serializer can use this field to communicate that.
     *
     * If present, the `oldestForwardsCompatibleVersion` must be less than or equal to
     * `IApiPackageMetadataJson.schemaVersion`.
     */
    oldestForwardsCompatibleVersion?: ApiJsonSchemaVersion;
    /**
     * The TSDoc configuration that was used when analyzing the API for this package.
     *
     * @remarks
     *
     * The structure of this objet is defined by the `@microsoft/tsdoc-config` library.
     * Normally this configuration is loaded from the project's tsdoc.json file.  It is stored
     * in the .api.json file so that doc comments can be parsed accurately when loading the file.
     */
    tsdocConfig: JsonObject;
}
export interface IApiPackageJson extends IApiItemJson {
    /**
     * A file header that stores metadata about the tool that wrote the *.api.json file.
     */
    metadata: IApiPackageMetadataJson;
    /**
     * The base URL where the project's source code can be viewed on a website such as GitHub or
     * Azure DevOps. This URL path corresponds to the `<projectFolder>` path on disk. Provided via the
     * `api-extractor.json` config.
     */
    projectFolderUrl?: string;
}
/**
 * Options for {@link ApiPackage.saveToJsonFile}.
 * @public
 */
export interface IApiPackageSaveOptions extends IJsonFileSaveOptions {
    /**
     * Optionally specifies a value for the "toolPackage" field in the output .api.json data file;
     * otherwise, the value will be "api-extractor-model".
     */
    toolPackage?: string;
    /**
     * Optionally specifies a value for the "toolVersion" field in the output .api.json data file;
     * otherwise, the value will be the current version of the api-extractor-model package.
     */
    toolVersion?: string;
    /**
     * Set to true only when invoking API Extractor's test harness.
     *
     * @remarks
     * When `testMode` is true, the `toolVersion` field in the .api.json file is assigned an empty string
     * to prevent spurious diffs in output files tracked for tests.
     */
    testMode?: boolean;
}
declare const ApiPackage_base: typeof ApiDocumentedItem & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);
/**
 * Represents an NPM package containing API declarations.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * @public
 */
export declare class ApiPackage extends ApiPackage_base {
    private readonly _tsdocConfiguration;
    private readonly _projectFolderUrl?;
    constructor(options: IApiPackageOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiPackageOptions>, context: DeserializerContext, jsonObject: IApiPackageJson): void;
    static loadFromJsonFile(apiJsonFilename: string): ApiPackage;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    get entryPoints(): ReadonlyArray<ApiEntryPoint>;
    /**
     * The TSDoc configuration that was used when analyzing the API for this package.
     *
     * @remarks
     *
     * Normally this configuration is loaded from the project's tsdoc.json file.  It is stored
     * in the .api.json file so that doc comments can be parsed accurately when loading the file.
     */
    get tsdocConfiguration(): TSDocConfiguration;
    get projectFolderUrl(): string | undefined;
    /** @override */
    addMember(member: ApiEntryPoint): void;
    findEntryPointsByPath(importPath: string): ReadonlyArray<ApiEntryPoint>;
    saveToJsonFile(apiJsonFilename: string, options?: IApiPackageSaveOptions): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiPackage.d.ts.map