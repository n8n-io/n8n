import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
import { ReleaseTag } from '../aedoc/ReleaseTag';
/**
 * Constructor options for {@link (ApiReleaseTagMixin:interface)}.
 * @public
 */
export interface IApiReleaseTagMixinOptions extends IApiItemOptions {
    releaseTag: ReleaseTag;
}
export interface IApiReleaseTagMixinJson extends IApiItemJson {
    releaseTag: string;
}
/**
 * The mixin base class for API items that can be attributed with a TSDoc tag such as `@internal`,
 * `@alpha`, `@beta`, or `@public`.  These "release tags" indicate the support level for an API.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export interface ApiReleaseTagMixin extends ApiItem {
    /**
     * The effective release tag for this declaration.  If it is not explicitly specified, the value may be
     * inherited from a containing declaration.
     *
     * @remarks
     * For example, an `ApiEnumMember` may inherit its release tag from the containing `ApiEnum`.
     */
    readonly releaseTag: ReleaseTag;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}
/**
 * Mixin function for {@link (ApiReleaseTagMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReleaseTagMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiReleaseTagMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiReleaseTagMixin);
/**
 * Static members for {@link (ApiReleaseTagMixin:interface)}.
 * @public
 */
export declare namespace ApiReleaseTagMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReleaseTagMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiReleaseTagMixin;
}
//# sourceMappingURL=ApiReleaseTagMixin.d.ts.map