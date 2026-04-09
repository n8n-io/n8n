import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { DocDeclarationReference } from '@microsoft/tsdoc';
import { ApiItem, ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { ApiPackage } from './ApiPackage';
import { type IResolveDeclarationReferenceResult } from './ModelReferenceResolver';
declare const ApiModel_base: typeof ApiItem & (new (...args: any[]) => ApiItemContainerMixin);
/**
 * A serializable representation of a collection of API declarations.
 *
 * @remarks
 *
 * An `ApiModel` represents a collection of API declarations that can be serialized to disk.  It captures all the
 * important information needed to generate documentation, without any reliance on the TypeScript compiler engine.
 *
 * An `ApiModel` acts as the root of a tree of objects that all inherit from the `ApiItem` base class.
 * The tree children are determined by the {@link (ApiItemContainerMixin:interface)} mixin base class.  The model
 * contains packages.  Packages have an entry point (today, only one).  And the entry point can contain various types
 * of API declarations.  The container relationships might look like this:
 *
 * ```
 * Things that can contain other things:
 *
 * - ApiModel
 *   - ApiPackage
 *     - ApiEntryPoint
 *       - ApiClass
 *         - ApiMethod
 *         - ApiProperty
 *       - ApiEnum
 *         - ApiEnumMember
 *       - ApiInterface
 *         - ApiMethodSignature
 *         - ApiPropertySignature
 *       - ApiNamespace
 *         - (ApiClass, ApiEnum, ApiInterace, ...)
 *
 * ```
 *
 * Normally, API Extractor writes an .api.json file to disk for each project that it builds.  Then, a tool like
 * API Documenter can load the various `ApiPackage` objects into a single `ApiModel` and process them as a group.
 * This is useful because compilation generally occurs separately (e.g. because projects may reside in different
 * Git repos, or because they build with different TypeScript compiler configurations that may be incompatible),
 * whereas API Documenter cannot detect broken hyperlinks without seeing the entire documentation set.
 *
 * @public
 */
export declare class ApiModel extends ApiModel_base {
    private readonly _resolver;
    private _packagesByName;
    private _apiItemsByCanonicalReference;
    constructor();
    loadPackage(apiJsonFilename: string): ApiPackage;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    get packages(): ReadonlyArray<ApiPackage>;
    /** @override */
    addMember(member: ApiPackage): void;
    /**
     * Efficiently finds a package by the NPM package name.
     *
     * @remarks
     *
     * If the NPM scope is omitted in the package name, it will still be found provided that it is an unambiguous match.
     * For example, it's often convenient to write `{@link node-core-library#JsonFile}` instead of
     * `{@link @rushstack/node-core-library#JsonFile}`.
     */
    tryGetPackageByName(packageName: string): ApiPackage | undefined;
    resolveDeclarationReference(declarationReference: DocDeclarationReference | DeclarationReference, contextApiItem: ApiItem | undefined): IResolveDeclarationReferenceResult;
    private _initApiItemsRecursive;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiModel.d.ts.map